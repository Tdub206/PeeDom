#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_VERIFICATION_COMMANDS = ['npm run lint', 'npm test', 'npm run type-check'];
const DEFAULT_MAX_ROUNDS = 2;
const MAX_FILE_CHARS = 12_000;
const MAX_OUTPUT_CHARS = 16_000;
const RECENT_FILE_LIMIT = 80;
const CONTEXT_FILES = [
  'AGENTS.md',
  'README.md',
  'package.json',
  'app.config.ts',
  path.join('app', '_layout.tsx'),
  'tailwind.config.js',
  path.join('src', 'lib', 'supabase.ts'),
  path.join('src', 'lib', 'query-client.ts'),
];
const OPTIONAL_CONTEXT_FILES = [
  path.join('docs', 'stallpass-encyclopedia-2026-04-02.md'),
  path.join('docs', 'stallpass-gap-report-2026-04-02.md'),
];
const WALK_EXCLUDED_DIRS = new Set([
  '.git',
  '.claude',
  '.codex',
  '.expo',
  '.firebase',
  '.stallpass-ai',
  '_codex_tmp',
  '_preflight',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'PeeDom-thread-export',
  'thread_exports',
]);

const HELP_TEXT = `StallPass AI orchestrator

Usage:
  node scripts/stallpass-ai-orchestrator.cjs <command> [options] [task]

Commands:
  loop     Builder/reviewer loop with repair rounds
  plan     Generate a builder plan and reviewer critique
  review   Review the current repo state and verification output
  launch   Generate launch-readiness reports and run verification gates

Options:
  --task <text>           Inline task text
  --task-file <path>      Read task text from a file
  --max-rounds <n>        Repair rounds for loop mode (default: 2)
  --skip-codex            Skip Codex review even if the CLI is available
  --skip-verify           Skip local verification commands
  --android-verify        Add android:assembleDebug:emulator to verification
  --dry-run               Write prompts and plans without invoking AI CLIs
  --verbose               Print command details while running
  --help                  Show this help
`;

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  const repoRoot = findRepoRoot(process.cwd());
  const task = loadTask(options, repoRoot);
  const runId = createRunId(options.command);
  const runRoot = path.join(repoRoot, '.stallpass-ai', 'runs', runId);
  const promptsDir = path.join(runRoot, 'prompts');
  const reportsDir = path.join(runRoot, 'reports');
  const logsDir = path.join(runRoot, 'logs');
  const startTimeMs = Date.now();

  ensureDir(promptsDir);
  ensureDir(reportsDir);
  ensureDir(logsDir);

  const agentSettings = resolveAgentSettings(repoRoot);
  const availability = probeAgents(agentSettings, repoRoot, options);
  const baseline = {
    gitStatus: runShell('git status --short', { cwd: repoRoot }),
    gitDiffStat: runShell('git diff --stat', { cwd: repoRoot }),
  };
  const repoContext = buildRepoContext(repoRoot, baseline);
  const dirtyWarning = buildDirtyTreeWarning(baseline.gitStatus.stdout);

  writeText(
    path.join(runRoot, 'run.json'),
    JSON.stringify(
      {
        runId,
        startedAt: new Date(startTimeMs).toISOString(),
        repoRoot,
        command: options.command,
        task,
        options: {
          maxRounds: options.maxRounds,
          skipCodex: options.skipCodex,
          skipVerify: options.skipVerify,
          androidVerify: options.androidVerify,
          dryRun: options.dryRun,
          verbose: options.verbose,
        },
        agents: availability,
      },
      null,
      2
    )
  );
  writeText(path.join(reportsDir, 'repo-context.md'), repoContext);

  const summaryLines = [
    `Run: ${runId}`,
    `Command: ${options.command}`,
    `Task: ${task || 'n/a'}`,
    `Claude: ${availability.claude.available ? 'available' : `unavailable (${availability.claude.reason})`}`,
    `Codex: ${availability.codex.available ? 'available' : `unavailable (${availability.codex.reason})`}`,
  ];

  if (options.command === 'plan') {
    runPlanMode({
      repoRoot,
      task: requireTask(task, options.command),
      repoContext,
      promptsDir,
      reportsDir,
      agentSettings,
      availability,
      options,
      summaryLines,
    });
  } else if (options.command === 'review') {
    runReviewMode({
      repoRoot,
      task,
      repoContext,
      dirtyWarning,
      promptsDir,
      reportsDir,
      logsDir,
      startTimeMs,
      agentSettings,
      availability,
      options,
      summaryLines,
    });
  } else if (options.command === 'launch') {
    runLaunchMode({
      repoRoot,
      repoContext,
      promptsDir,
      reportsDir,
      logsDir,
      agentSettings,
      availability,
      options,
      summaryLines,
    });
  } else {
    runLoopMode({
      repoRoot,
      task: requireTask(task, options.command),
      repoContext,
      dirtyWarning,
      promptsDir,
      reportsDir,
      logsDir,
      startTimeMs,
      agentSettings,
      availability,
      options,
      summaryLines,
    });
  }

  writeText(path.join(runRoot, 'SUMMARY.txt'), summaryLines.join('\n'));
  console.log(summaryLines.join('\n'));
  console.log(`Artifacts: ${runRoot}`);
}

function runPlanMode(context) {
  const { repoRoot, task, repoContext, promptsDir, reportsDir, agentSettings, availability, options, summaryLines } = context;
  const planPrompt = buildPlanPrompt({ repoRoot, task, repoContext });
  writeText(path.join(promptsDir, '01-plan.md'), planPrompt);

  const builderResult = invokeAgent({
    label: 'claude-plan',
    prompt: planPrompt,
    outFile: path.join(reportsDir, 'plan.md'),
    settings: agentSettings.claude,
    available: availability.claude.available,
    dryRun: options.dryRun,
    verbose: options.verbose,
    cwd: repoRoot,
  });
  summaryLines.push(`Plan status: ${builderResult.status}`);

  if (!options.skipCodex && availability.codex.available && builderResult.content) {
    const critiquePrompt = buildPlanCritiquePrompt({
      repoRoot,
      task,
      plan: builderResult.content,
      repoContext,
    });
    writeText(path.join(promptsDir, '02-plan-critique.md'), critiquePrompt);

    const reviewerResult = invokeAgent({
      label: 'codex-plan-critique',
      prompt: critiquePrompt,
      outFile: path.join(reportsDir, 'plan-critique.md'),
      settings: agentSettings.codex,
      available: availability.codex.available,
      dryRun: options.dryRun,
      verbose: options.verbose,
      cwd: repoRoot,
    });
    summaryLines.push(`Plan critique: ${reviewerResult.status}`);
  } else {
    summaryLines.push('Plan critique: skipped');
  }
}

function runReviewMode(context) {
  const {
    repoRoot,
    task,
    repoContext,
    dirtyWarning,
    promptsDir,
    reportsDir,
    logsDir,
    startTimeMs,
    agentSettings,
    availability,
    options,
    summaryLines,
  } = context;

  const verification = options.skipVerify
    ? skippedVerification()
    : runVerificationSuite({ repoRoot, logsDir, verbose: options.verbose, androidVerify: options.androidVerify });

  writeText(path.join(reportsDir, 'verification.md'), formatVerificationSummary(verification));

  const reviewPrompt = buildReviewPrompt({
    repoRoot,
    task,
    repoContext,
    dirtyWarning,
    recentlyTouchedFiles: collectRecentlyTouchedFiles(repoRoot, startTimeMs),
    verification,
  });
  writeText(path.join(promptsDir, 'review.md'), reviewPrompt);

  const reviewerResult = invokeAgent({
    label: 'codex-review',
    prompt: reviewPrompt,
    outFile: path.join(reportsDir, 'review.md'),
    settings: agentSettings.codex,
    available: availability.codex.available && !options.skipCodex,
    dryRun: options.dryRun,
    verbose: options.verbose,
    cwd: repoRoot,
  });

  summaryLines.push(`Verification passed: ${verification.allPassed ? 'yes' : 'no'}`);
  summaryLines.push(`Review status: ${reviewerResult.status}`);
}

function runLaunchMode(context) {
  const {
    repoRoot,
    repoContext,
    promptsDir,
    reportsDir,
    logsDir,
    agentSettings,
    availability,
    options,
    summaryLines,
  } = context;

  const verification = options.skipVerify
    ? skippedVerification()
    : runVerificationSuite({ repoRoot, logsDir, verbose: options.verbose, androidVerify: options.androidVerify });
  writeText(path.join(reportsDir, 'verification.md'), formatVerificationSummary(verification));

  const builderPrompt = buildLaunchPrompt({ repoContext, verification });
  writeText(path.join(promptsDir, 'launch-builder.md'), builderPrompt);

  const builderResult = invokeAgent({
    label: 'claude-launch',
    prompt: builderPrompt,
    outFile: path.join(reportsDir, 'launch-builder.md'),
    settings: agentSettings.claude,
    available: availability.claude.available,
    dryRun: options.dryRun,
    verbose: options.verbose,
    cwd: repoRoot,
  });

  summaryLines.push(`Launch builder status: ${builderResult.status}`);
  summaryLines.push(`Verification passed: ${verification.allPassed ? 'yes' : 'no'}`);

  if (!options.skipCodex && availability.codex.available && builderResult.content) {
    const reviewPrompt = buildLaunchAuditPrompt({ repoContext, builderReport: builderResult.content, verification });
    writeText(path.join(promptsDir, 'launch-reviewer.md'), reviewPrompt);

    const reviewerResult = invokeAgent({
      label: 'codex-launch-audit',
      prompt: reviewPrompt,
      outFile: path.join(reportsDir, 'launch-reviewer.md'),
      settings: agentSettings.codex,
      available: availability.codex.available,
      dryRun: options.dryRun,
      verbose: options.verbose,
      cwd: repoRoot,
    });
    summaryLines.push(`Launch audit: ${reviewerResult.status}`);
  } else {
    summaryLines.push('Launch audit: skipped');
  }
}

function runLoopMode(context) {
  const {
    repoRoot,
    task,
    repoContext,
    dirtyWarning,
    promptsDir,
    reportsDir,
    logsDir,
    startTimeMs,
    agentSettings,
    availability,
    options,
    summaryLines,
  } = context;

  const planPrompt = buildPlanPrompt({ repoRoot, task, repoContext });
  writeText(path.join(promptsDir, '01-plan.md'), planPrompt);

  const planResult = invokeAgent({
    label: 'claude-plan',
    prompt: planPrompt,
    outFile: path.join(reportsDir, '01-plan.md'),
    settings: agentSettings.claude,
    available: availability.claude.available,
    dryRun: options.dryRun,
    verbose: options.verbose,
    cwd: repoRoot,
  });
  summaryLines.push(`Plan status: ${planResult.status}`);

  let critiqueResult = { status: 'SKIPPED', content: '' };
  if (!options.skipCodex && availability.codex.available && planResult.content) {
    const critiquePrompt = buildPlanCritiquePrompt({
      repoRoot,
      task,
      plan: planResult.content,
      repoContext,
    });
    writeText(path.join(promptsDir, '02-plan-critique.md'), critiquePrompt);

    critiqueResult = invokeAgent({
      label: 'codex-plan-critique',
      prompt: critiquePrompt,
      outFile: path.join(reportsDir, '02-plan-critique.md'),
      settings: agentSettings.codex,
      available: availability.codex.available,
      dryRun: options.dryRun,
      verbose: options.verbose,
      cwd: repoRoot,
    });
  }
  summaryLines.push(`Plan critique: ${critiqueResult.status}`);

  let builderResult = invokeAgent({
    label: 'claude-implement-0',
    prompt: buildImplementPrompt({
      repoRoot,
      task,
      repoContext,
      plan: planResult.content,
      critique: critiqueResult.content,
      dirtyWarning,
      round: 0,
      verification: null,
      review: null,
    }),
    outFile: path.join(reportsDir, '03-implement.md'),
    settings: agentSettings.claude,
    available: availability.claude.available,
    dryRun: options.dryRun,
    verbose: options.verbose,
    cwd: repoRoot,
  });
  summaryLines.push(`Implementation round 0: ${builderResult.status}`);

  let verification = options.skipVerify
    ? skippedVerification()
    : runVerificationSuite({
        repoRoot,
        logsDir,
        verbose: options.verbose,
        androidVerify: options.androidVerify,
        suffix: 'round-0',
      });
  writeText(path.join(reportsDir, 'verification-round-0.md'), formatVerificationSummary(verification));
  summaryLines.push(`Verification round 0 passed: ${verification.allPassed ? 'yes' : 'no'}`);

  let reviewResult = { status: options.skipCodex ? 'SKIPPED' : 'UNAVAILABLE', content: '' };
  if (!options.skipCodex && availability.codex.available) {
    const reviewPrompt = buildReviewPrompt({
      repoRoot,
      task,
      repoContext,
      dirtyWarning,
      recentlyTouchedFiles: collectRecentlyTouchedFiles(repoRoot, startTimeMs),
      verification,
    });
    writeText(path.join(promptsDir, '04-review-round-0.md'), reviewPrompt);

    reviewResult = invokeAgent({
      label: 'codex-review-0',
      prompt: reviewPrompt,
      outFile: path.join(reportsDir, '04-review-round-0.md'),
      settings: agentSettings.codex,
      available: availability.codex.available,
      dryRun: options.dryRun,
      verbose: options.verbose,
      cwd: repoRoot,
    });
  }
  summaryLines.push(`Review round 0: ${reviewResult.status}`);

  let loopState = computeLoopState(builderResult.status, reviewResult.status, verification.allPassed);

  for (let round = 1; round <= options.maxRounds && loopState.shouldContinue; round += 1) {
    const repairPrompt = buildImplementPrompt({
      repoRoot,
      task,
      repoContext,
      plan: planResult.content,
      critique: critiqueResult.content,
      dirtyWarning,
      round,
      verification,
      review: reviewResult.content,
    });
    writeText(path.join(promptsDir, `repair-round-${round}.md`), repairPrompt);

    builderResult = invokeAgent({
      label: `claude-repair-${round}`,
      prompt: repairPrompt,
      outFile: path.join(reportsDir, `repair-round-${round}.md`),
      settings: agentSettings.claude,
      available: availability.claude.available,
      dryRun: options.dryRun,
      verbose: options.verbose,
      cwd: repoRoot,
    });
    summaryLines.push(`Implementation round ${round}: ${builderResult.status}`);

    verification = options.skipVerify
      ? skippedVerification()
      : runVerificationSuite({
          repoRoot,
          logsDir,
          verbose: options.verbose,
          androidVerify: options.androidVerify,
          suffix: `round-${round}`,
        });
    writeText(path.join(reportsDir, `verification-round-${round}.md`), formatVerificationSummary(verification));
    summaryLines.push(`Verification round ${round} passed: ${verification.allPassed ? 'yes' : 'no'}`);

    if (!options.skipCodex && availability.codex.available) {
      const reviewPrompt = buildReviewPrompt({
        repoRoot,
        task,
        repoContext,
        dirtyWarning,
        recentlyTouchedFiles: collectRecentlyTouchedFiles(repoRoot, startTimeMs),
        verification,
      });
      writeText(path.join(promptsDir, `review-round-${round}.md`), reviewPrompt);

      reviewResult = invokeAgent({
        label: `codex-review-${round}`,
        prompt: reviewPrompt,
        outFile: path.join(reportsDir, `review-round-${round}.md`),
        settings: agentSettings.codex,
        available: availability.codex.available,
        dryRun: options.dryRun,
        verbose: options.verbose,
        cwd: repoRoot,
      });
      summaryLines.push(`Review round ${round}: ${reviewResult.status}`);
    }

    loopState = computeLoopState(builderResult.status, reviewResult.status, verification.allPassed);
  }

  summaryLines.push(`Final decision: ${options.dryRun ? 'dry run only' : loopState.finalLabel}`);
}

function buildPlanPrompt({ repoRoot, task, repoContext }) {
  return [
    readFileIfExists(path.join(repoRoot, 'CLAUDE.md')),
    readFileIfExists(path.join(repoRoot, 'AGENTS.md')),
    'Work inside the StallPass mobile repository.',
    'Create a repo-specific implementation plan for the task below.',
    '',
    'Return plain text only.',
    'Start with exactly one line: STATUS: READY or STATUS: BLOCKED',
    '',
    'Then include these sections:',
    '1. Goal',
    '2. Assumptions',
    '3. Files to inspect',
    '4. Files to change',
    '5. Step-by-step implementation plan',
    '6. Risks',
    '7. Validation checklist',
    '',
    `TASK:\n${task}`,
    '',
    'REPOSITORY CONTEXT:',
    repoContext,
  ].join('\n');
}

function buildPlanCritiquePrompt({ repoRoot, task, plan, repoContext }) {
  return [
    readFileIfExists(path.join(repoRoot, 'CODEX.md')),
    readFileIfExists(path.join(repoRoot, 'AGENTS.md')),
    'Review the implementation plan for the StallPass mobile repository.',
    '',
    'Return plain text only.',
    'Start with exactly one line: STATUS: APPROVED or STATUS: CHANGES_REQUESTED or STATUS: BLOCKED',
    '',
    'Then include:',
    '- Findings ordered by severity',
    '- Files that were missed',
    '- Validation gaps',
    '- A concise decision summary',
    '',
    `TASK:\n${task}`,
    '',
    'PLAN:',
    plan,
    '',
    'REPOSITORY CONTEXT:',
    repoContext,
  ].join('\n');
}

function buildImplementPrompt({ repoRoot, task, repoContext, plan, critique, dirtyWarning, round, verification, review }) {
  const instruction = round === 0 ? 'Implement the StallPass task now.' : `Repair the remaining issues now. Repair round ${round}.`;
  const lines = [
    readFileIfExists(path.join(repoRoot, 'CLAUDE.md')),
    readFileIfExists(path.join(repoRoot, 'AGENTS.md')),
    instruction,
    '',
    'Use repo tools if they are available in this CLI.',
    'Edit files directly in the current working tree.',
    'Do not revert unrelated user changes.',
    '',
    'Return plain text only.',
    'Start with exactly one line: STATUS: IMPLEMENTED or STATUS: PARTIAL or STATUS: BLOCKED',
    '',
    'Then include:',
    '- Changed files',
    '- What you changed',
    '- Risks or follow-up items',
    '',
    `TASK:\n${task}`,
    '',
    dirtyWarning ? `DIRTY TREE WARNING:\n${dirtyWarning}\n` : '',
    'PLAN:',
    plan || 'No plan available.',
    '',
    'CRITIQUE TO ADDRESS:',
    critique || 'No critique available.',
    '',
  ];

  if (verification) {
    lines.push('CURRENT VERIFICATION:');
    lines.push(formatVerificationSummary(verification));
    lines.push('');
  }

  if (review) {
    lines.push('CURRENT REVIEW FINDINGS:');
    lines.push(review);
    lines.push('');
  }

  lines.push('REPOSITORY CONTEXT:');
  lines.push(repoContext);
  return lines.join('\n');
}

function buildReviewPrompt({ repoRoot, task, repoContext, dirtyWarning, recentlyTouchedFiles, verification }) {
  const focusList =
    recentlyTouchedFiles.length > 0
      ? recentlyTouchedFiles.map((file) => `- ${file}`).join('\n')
      : '- No files with a new mtime were detected in this run.';

  return [
    readFileIfExists(path.join(repoRoot, 'CODEX.md')),
    readFileIfExists(path.join(repoRoot, 'AGENTS.md')),
    'Review the current StallPass repository state.',
    '',
    'Use repo tools if they are available in this CLI.',
    'Inspect the working tree directly instead of guessing.',
    '',
    'Return plain text only.',
    'Start with exactly one line: STATUS: APPROVED or STATUS: CHANGES_REQUESTED or STATUS: BLOCKED',
    '',
    'Then include:',
    '- Findings ordered by severity with file references',
    '- Remaining testing gaps',
    '- Decision summary',
    '',
    task ? `TASK:\n${task}\n` : '',
    dirtyWarning ? `DIRTY TREE WARNING:\n${dirtyWarning}\n` : '',
    `FILES TO PRIORITIZE:\n${focusList}`,
    '',
    'VERIFICATION RESULTS:',
    formatVerificationSummary(verification),
    '',
    'REPOSITORY CONTEXT:',
    repoContext,
  ].join('\n');
}

function buildLaunchPrompt({ repoContext, verification }) {
  return [
    readFileIfExists(path.join(repoRoot, 'CLAUDE.md')),
    readFileIfExists(path.join(repoRoot, 'AGENTS.md')),
    'Perform a StallPass launch-readiness assessment for the current repository.',
    '',
    'Return plain text only.',
    'Start with exactly one line: STATUS: READY or STATUS: BLOCKED',
    '',
    'Then include:',
    '- Blockers',
    '- High-risk items',
    '- Medium-risk items',
    '- Suggested fixes',
    '- Release confidence summary',
    '',
    'VERIFICATION RESULTS:',
    formatVerificationSummary(verification),
    '',
    'REPOSITORY CONTEXT:',
    repoContext,
  ].join('\n');
}

function buildLaunchAuditPrompt({ repoContext, builderReport, verification }) {
  return [
    readFileIfExists(path.join(repoRoot, 'CODEX.md')),
    readFileIfExists(path.join(repoRoot, 'AGENTS.md')),
    'Audit StallPass launch readiness based on the current repository state and the builder report.',
    '',
    'Return plain text only.',
    'Start with exactly one line: STATUS: APPROVED or STATUS: CHANGES_REQUESTED or STATUS: BLOCKED',
    '',
    'Focus on build failures, env/config issues, auth/session risk, offline corruption, crash-prone flows, telemetry gaps, app-store review risk, and missing release validation.',
    '',
    'BUILDER REPORT:',
    builderReport,
    '',
    'VERIFICATION RESULTS:',
    formatVerificationSummary(verification),
    '',
    'REPOSITORY CONTEXT:',
    repoContext,
  ].join('\n');
}

function buildRepoContext(repoRoot, baseline) {
  const sections = [
    `Repo root: ${repoRoot}`,
    `Current time: ${new Date().toISOString()}`,
    '',
    'GIT STATUS:',
    truncateText(baseline.gitStatus.stdout || '[no git status output]', MAX_OUTPUT_CHARS),
    '',
    'GIT DIFF STAT:',
    truncateText(baseline.gitDiffStat.stdout || '[no diff stat output]', MAX_OUTPUT_CHARS),
    '',
    'TOP-LEVEL TREE:',
    listTopLevelEntries(repoRoot),
  ];

  for (const relativePath of [...CONTEXT_FILES, ...OPTIONAL_CONTEXT_FILES]) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      continue;
    }

    sections.push('');
    sections.push(`FILE: ${relativePath}`);
    sections.push(truncateText(readFileIfExists(absolutePath), MAX_FILE_CHARS));
  }

  return sections.join('\n');
}

function resolveAgentSettings(repoRoot) {
  return {
    claude: {
      name: 'Claude',
      command:
        process.env.STALLPASS_CLAUDE_COMMAND ||
        `claude -p --permission-mode bypassPermissions --output-format text --add-dir "${repoRoot}"`,
      probeCommand: process.env.STALLPASS_CLAUDE_PROBE || 'claude --version',
    },
    codex: {
      name: 'Codex',
      command: process.env.STALLPASS_CODEX_COMMAND || 'codex exec -',
      probeCommand: process.env.STALLPASS_CODEX_PROBE || 'codex --help',
    },
  };
}

function probeAgents(agentSettings, repoRoot, options) {
  return {
    claude: probeAgent(agentSettings.claude, repoRoot, options.verbose),
    codex:
      options.skipCodex || process.env.STALLPASS_SKIP_CODEX === '1'
        ? { available: false, reason: 'disabled' }
        : probeAgent(agentSettings.codex, repoRoot, options.verbose),
  };
}

function probeAgent(agent, repoRoot, verbose) {
  const result = runShell(agent.probeCommand, { cwd: repoRoot });
  if (verbose) {
    console.log(`[probe] ${agent.name}: exit=${result.exitCode}`);
  }

  if (result.exitCode === 0) {
    return { available: true, reason: 'ok' };
  }

  const reason = truncateText((result.stderr || result.stdout || 'probe failed').trim(), 300);
  return { available: false, reason: reason || 'probe failed' };
}

function invokeAgent({ label, prompt, outFile, settings, available, dryRun, verbose, cwd }) {
  if (!available) {
    const content = `STATUS: UNAVAILABLE\n\n${settings.name} is unavailable in this environment.`;
    writeText(outFile, content);
    return { status: 'UNAVAILABLE', content };
  }

  if (dryRun) {
    const content = 'STATUS: SKIPPED\n\nDry run only. Prompt written to disk but not executed.';
    writeText(outFile, content);
    return { status: 'SKIPPED', content };
  }

  if (verbose) {
    console.log(`[agent] ${label}: ${settings.command}`);
  }

  const result = runShell(settings.command, {
    cwd,
    input: prompt,
  });

  const rawOutput = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  const content = rawOutput
    ? /^STATUS:/m.test(rawOutput)
      ? rawOutput
      : `${result.exitCode === 0 ? 'STATUS: APPROVED' : 'STATUS: BLOCKED'}\n\n${rawOutput}`
    : `STATUS: BLOCKED\n\n${settings.name} returned no output.`;

  writeText(outFile, content);
  return {
    status: parseStatusLine(content),
    content,
    exitCode: result.exitCode,
  };
}

function runVerificationSuite({ repoRoot, logsDir, verbose, androidVerify, suffix = 'verification' }) {
  const commands = getVerificationCommands(androidVerify);
  const results = [];

  for (const [index, command] of commands.entries()) {
    const safeName = `${String(index + 1).padStart(2, '0')}-${makeSafeSlug(command)}`;
    const result = runShell(command, { cwd: repoRoot });
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim() || '[no output]';
    const logPath = path.join(logsDir, `${suffix}-${safeName}.log`);
    writeText(logPath, output);

    results.push({
      command,
      exitCode: result.exitCode,
      passed: result.exitCode === 0,
      logPath,
      output: truncateText(output, MAX_OUTPUT_CHARS),
    });

    if (verbose) {
      console.log(`[verify] ${command}: exit=${result.exitCode}`);
    }
  }

  return {
    allPassed: results.every((result) => result.passed),
    results,
  };
}

function skippedVerification() {
  return {
    allPassed: true,
    results: [],
  };
}

function formatVerificationSummary(verification) {
  if (!verification || verification.results.length === 0) {
    return 'Verification skipped.';
  }

  return verification.results
    .map((result) =>
      [
        `${result.passed ? 'PASS' : 'FAIL'}: ${result.command}`,
        `Exit code: ${result.exitCode}`,
        `Log: ${result.logPath}`,
        result.output,
      ].join('\n')
    )
    .join('\n\n');
}

function getVerificationCommands(androidVerify) {
  const fromEnv = process.env.STALLPASS_VERIFY_COMMANDS;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv
      .split(';')
      .map((command) => command.trim())
      .filter(Boolean);
  }

  const commands = [...DEFAULT_VERIFICATION_COMMANDS];
  if (androidVerify) {
    commands.push('npm run android:assembleDebug:emulator');
  }
  return commands;
}

function collectRecentlyTouchedFiles(repoRoot, sinceMs) {
  const files = [];
  walkRepo(repoRoot, '', (relativePath, stats) => {
    if (!stats.isFile()) {
      return;
    }

    if (stats.mtimeMs < sinceMs) {
      return;
    }

    files.push(relativePath.replaceAll(path.sep, '/'));
  });

  return files.sort().slice(0, RECENT_FILE_LIMIT);
}

function walkRepo(root, relativeDir, onFile) {
  const absoluteDir = path.join(root, relativeDir);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    const nextRelative = path.join(relativeDir, entry.name);
    const nextAbsolute = path.join(root, nextRelative);

    if (entry.isDirectory()) {
      if (WALK_EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      walkRepo(root, nextRelative, onFile);
      continue;
    }

    onFile(nextRelative, fs.statSync(nextAbsolute));
  }
}

function computeLoopState(builderStatus, reviewStatus, verificationPassed) {
  const needsRepair =
    !verificationPassed ||
    builderStatus === 'PARTIAL' ||
    reviewStatus === 'CHANGES_REQUESTED' ||
    reviewStatus === 'BLOCKED';

  if (builderStatus === 'BLOCKED') {
    return {
      shouldContinue: false,
      finalLabel: 'blocked by builder',
    };
  }

  if (!needsRepair) {
    return {
      shouldContinue: false,
      finalLabel: 'ready for human sign-off',
    };
  }

  return {
    shouldContinue: true,
    finalLabel: 'changes still required',
  };
}

function buildDirtyTreeWarning(gitStatusOutput) {
  const trimmed = gitStatusOutput.trim();
  if (!trimmed) {
    return '';
  }

  return [
    'The repository already has uncommitted changes.',
    'Do not revert unrelated work.',
    'If a file was already dirty before the run, inspect it carefully before editing.',
    '',
    truncateText(trimmed, MAX_OUTPUT_CHARS),
  ].join('\n');
}

function listTopLevelEntries(repoRoot) {
  return fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => !WALK_EXCLUDED_DIRS.has(entry.name))
    .map((entry) => `${entry.isDirectory() ? '[dir]' : '[file]'} ${entry.name}`)
    .join('\n');
}

function parseArgs(argv) {
  const options = {
    command: 'loop',
    task: '',
    taskFile: '',
    maxRounds: DEFAULT_MAX_ROUNDS,
    skipCodex: false,
    skipVerify: false,
    androidVerify: false,
    dryRun: false,
    verbose: false,
    help: false,
    positionals: [],
  };

  const commands = new Set(['loop', 'plan', 'review', 'launch']);
  let index = 0;

  if (argv[0] && commands.has(argv[0])) {
    options.command = argv[0];
    index = 1;
  }

  while (index < argv.length) {
    const current = argv[index];

    if (current === '--help' || current === '-h') {
      options.help = true;
      index += 1;
      continue;
    }

    if (current === '--task') {
      options.task = argv[index + 1] || '';
      index += 2;
      continue;
    }

    if (current === '--task-file') {
      options.taskFile = argv[index + 1] || '';
      index += 2;
      continue;
    }

    if (current === '--max-rounds') {
      const parsed = Number.parseInt(argv[index + 1] || '', 10);
      options.maxRounds = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ROUNDS;
      index += 2;
      continue;
    }

    if (current === '--skip-codex') {
      options.skipCodex = true;
      index += 1;
      continue;
    }

    if (current === '--skip-verify') {
      options.skipVerify = true;
      index += 1;
      continue;
    }

    if (current === '--android-verify') {
      options.androidVerify = true;
      index += 1;
      continue;
    }

    if (current === '--dry-run') {
      options.dryRun = true;
      index += 1;
      continue;
    }

    if (current === '--verbose') {
      options.verbose = true;
      index += 1;
      continue;
    }

    options.positionals.push(current);
    index += 1;
  }

  return options;
}

function loadTask(options, repoRoot) {
  if (options.task.trim()) {
    return options.task.trim();
  }

  if (options.taskFile) {
    const absolutePath = path.isAbsolute(options.taskFile)
      ? options.taskFile
      : path.join(repoRoot, options.taskFile);
    return readFileIfExists(absolutePath).trim();
  }

  return options.positionals.join(' ').trim();
}

function requireTask(task, command) {
  if (!task) {
    throw new Error(`The "${command}" command requires a task. Use --task, --task-file, or a trailing task string.`);
  }
  return task;
}

function parseStatusLine(text) {
  const match = text.match(/^\s*STATUS:\s*([A-Z_ ]+)/im);
  return match ? match[1].trim().replaceAll(' ', '_') : 'UNKNOWN';
}

function truncateText(text, maxChars) {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n\n[truncated ${text.length - maxChars} chars]`;
}

function createRunId(command) {
  return `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${command}`;
}

function makeSafeSlug(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'run'
  );
}

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);

  while (true) {
    if (fs.existsSync(path.join(current, 'package.json')) && fs.existsSync(path.join(current, 'AGENTS.md'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

function readFileIfExists(absolutePath) {
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
}

function ensureDir(absolutePath) {
  fs.mkdirSync(absolutePath, { recursive: true });
}

function writeText(absolutePath, content) {
  ensureDir(path.dirname(absolutePath));
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function runShell(command, options = {}) {
  const result = spawnSync(command, {
    cwd: options.cwd,
    env: process.env,
    shell: true,
    encoding: 'utf8',
    input: options.input,
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: typeof result.status === 'number' ? result.status : 1,
  };
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_MAX_ROUNDS,
  createRunId,
  makeSafeSlug,
  parseArgs,
  parseStatusLine,
  truncateText,
};
