#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const DEFAULT_STATE_ROOT = '.mobile-startup-studio/sessions';
const DEFAULT_MAX_ROUNDS = 3;
const DEFAULT_AGENT_COMMAND = 'codex exec -';
const DEFAULT_AGENT_PROBE = 'codex --help';
const JSON_OUTPUT_INDENT = 2;
const MAX_CONTEXT_ITEMS = 10;
const MAX_SUMMARY_CHARS = 1200;
const ALLOWED_ROLE_STATUSES = new Set(['queued', 'running', 'done', 'standby', 'blocked', 'needs_input']);
const ALLOWED_MESSAGE_PRIORITIES = new Set(['low', 'normal', 'high']);
const ALLOWED_METRIC_TYPES = new Set(['user_outcome', 'system_guardrail', 'safety_quality', 'custom']);
const HELP_TEXT = `Mobile Startup Studio swarm orchestrator

Usage:
  node plugins/mobile-startup-studio/scripts/startup-swarm-orchestrator.cjs <command> [options]

Commands:
  init      Create a new persistent swarm session
  round     Run one relay round for the current session
  run       Create or continue a session until convergence or max rounds
  state     Print current session state
  message   Inject a manual message into the swarm

Options:
  --session <id>             Existing session id
  --task <text>              Task or initiative for init/run
  --roles <csv|all>          Active roles, defaults to all roles
  --state-root <path>        Session root, defaults to .mobile-startup-studio/sessions
  --max-rounds <n>           Maximum rounds for run, default 3
  --metric-user <text>       User outcome metric
  --metric-guardrail <text>  System or latency guardrail
  --metric-safety <text>     Safety or quality metric
  --constraint <text>        Add a constraint, repeatable
  --unknown <text>           Add an open question, repeatable
  --command <shell>          Agent command, defaults to codex exec -
  --probe-command <shell>    Agent probe command, defaults to codex --help
  --dry-run                  Generate prompts and relay state without invoking agents
  --json                     Print JSON instead of text summary
  --from <role|human>        Sender for message command
  --to <role|broadcast>      Recipient for message command
  --subject <text>           Subject for message command
  --body <text>              Body for message command
  --help                     Show this help
`;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  const repoRoot = findRepoRoot(process.cwd());
  const pluginRoot = path.join(repoRoot, 'plugins', 'mobile-startup-studio');
  const roster = loadRoster(path.join(pluginRoot, 'config', 'swarm-roster.json'));
  const stateRoot = path.resolve(repoRoot, options.stateRoot || DEFAULT_STATE_ROOT);
  const runtime = resolveRuntime(options, repoRoot);

  if (options.commandName === 'init') {
    const task = requireTask(options.task, 'init');
    const session = createInitialState({
      sessionId: options.sessionId || createSessionId(task),
      task,
      roles: normalizeRoles(options.roles, roster),
      roster,
      repoRoot,
      pluginRoot,
      runtime,
      maxRounds: options.maxRounds,
      brief: buildBriefFromOptions(options),
    });
    persistNewSession(stateRoot, session);
    printSession(session, options.printJson);
    return;
  }

  if (options.commandName === 'message') {
    const state = loadState(stateRoot, requireSessionId(options.sessionId, 'message'));
    const updatedState = injectManualMessage(state, options);
    saveState(stateRoot, updatedState, 'manual_message_added', {
      from: options.fromRole,
      to: options.toRole,
      subject: options.subject,
    });
    printSession(updatedState, options.printJson);
    return;
  }

  if (options.commandName === 'state') {
    const state = loadState(stateRoot, requireSessionId(options.sessionId, 'state'));
    printSession(state, options.printJson);
    return;
  }

  if (options.commandName === 'round') {
    const state = loadState(stateRoot, requireSessionId(options.sessionId, 'round'));
    const updatedState = await runRound({
      state,
      roster,
      runtime,
      dryRun: options.dryRun,
      stateRoot,
    });
    saveState(stateRoot, updatedState, 'round_completed', {
      round: updatedState.roundsCompleted,
      status: updatedState.status,
    });
    printSession(updatedState, options.printJson);
    return;
  }

  if (options.commandName === 'run') {
    let state;
    if (options.sessionId) {
      state = loadState(stateRoot, options.sessionId);
    } else {
      const task = requireTask(options.task, 'run');
      state = createInitialState({
        sessionId: createSessionId(task),
        task,
        roles: normalizeRoles(options.roles, roster),
        roster,
        repoRoot,
        pluginRoot,
        runtime,
        maxRounds: options.maxRounds,
        brief: buildBriefFromOptions(options),
      });
      persistNewSession(stateRoot, state);
    }

    let roundsRemaining = options.maxRounds;
    while (roundsRemaining > 0 && state.status === 'active') {
      state = await runRound({
        state,
        roster,
        runtime,
        dryRun: options.dryRun,
        stateRoot,
      });
      saveState(stateRoot, state, 'round_completed', {
        round: state.roundsCompleted,
        status: state.status,
      });
      roundsRemaining -= 1;
    }

    printSession(state, options.printJson);
    return;
  }

  throw new Error(`Unsupported command: ${options.commandName}`);
}

function parseArgs(argv) {
  const options = {
    commandName: 'run',
    task: '',
    sessionId: '',
    roles: 'all',
    stateRoot: '',
    maxRounds: DEFAULT_MAX_ROUNDS,
    metricUser: '',
    metricGuardrail: '',
    metricSafety: '',
    constraints: [],
    unknowns: [],
    agentCommand: '',
    probeCommand: '',
    dryRun: false,
    printJson: false,
    fromRole: 'human',
    toRole: '',
    subject: '',
    body: '',
    help: false,
  };

  const commands = new Set(['init', 'round', 'run', 'state', 'message']);
  let index = 0;
  if (argv[0] && commands.has(argv[0])) {
    options.commandName = argv[0];
    index = 1;
  }

  while (index < argv.length) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      index += 1;
      continue;
    }
    if (token === '--task') {
      options.task = argv[index + 1] || '';
      index += 2;
      continue;
    }
    if (token === '--session') {
      options.sessionId = argv[index + 1] || '';
      index += 2;
      continue;
    }
    if (token === '--roles') {
      options.roles = argv[index + 1] || 'all';
      index += 2;
      continue;
    }
    if (token === '--state-root') {
      options.stateRoot = argv[index + 1] || '';
      index += 2;
      continue;
    }
    if (token === '--max-rounds') {
      const parsed = Number.parseInt(argv[index + 1] || '', 10);
      options.maxRounds = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ROUNDS;
      index += 2;
      continue;
    }
    if (token === '--metric-user') {
      options.metricUser = argv[index + 1] || '';
      index += 2;
      continue;
    }
    if (token === '--metric-guardrail') {
      options.metricGuardrail = argv[index + 1] || '';
      index += 2;
      continue;
    }
    if (token === '--metric-safety') {
      options.metricSafety = argv[index + 1] || '';
      index += 2;
      continue;
    }
    if (token === '--constraint') {
      options.constraints.push(argv[index + 1] || '');
      index += 2;
      continue;
    }
    if (token === '--unknown') {
      options.unknowns.push(argv[index + 1] || '');
      index += 2;
      continue;
    }
    if (token === '--command') {
      options.agentCommand = argv[index + 1] || '';
      index += 2;
      continue;
    }
    if (token === '--probe-command') {
      options.probeCommand = argv[index + 1] || '';
      index += 2;
      continue;
    }
    if (token === '--dry-run') {
      options.dryRun = true;
      index += 1;
      continue;
    }
    if (token === '--json') {
      options.printJson = true;
      index += 1;
      continue;
    }
    if (token === '--from') {
      options.fromRole = argv[index + 1] || 'human';
      index += 2;
      continue;
    }
    if (token === '--to') {
      options.toRole = argv[index + 1] || '';
      index += 2;
      continue;
    }
    if (token === '--subject') {
      options.subject = argv[index + 1] || '';
      index += 2;
      continue;
    }
    if (token === '--body') {
      options.body = argv[index + 1] || '';
      index += 2;
      continue;
    }

    options.task = [options.task, token].filter(Boolean).join(' ').trim();
    index += 1;
  }

  return options;
}

function resolveRuntime(options, repoRoot) {
  const command = options.agentCommand || process.env.MOBILE_STARTUP_STUDIO_AGENT_COMMAND || DEFAULT_AGENT_COMMAND;
  const probeCommand =
    options.probeCommand || process.env.MOBILE_STARTUP_STUDIO_AGENT_PROBE || DEFAULT_AGENT_PROBE;

  if (options.dryRun) {
    return {
      command,
      probeCommand,
      available: true,
      reason: 'dry-run',
    };
  }

  const probe = runShell(probeCommand, { cwd: repoRoot });
  return {
    command,
    probeCommand,
    available: probe.exitCode === 0,
    reason: probe.exitCode === 0 ? 'ok' : (probe.stderr || probe.stdout || 'probe failed').trim() || 'probe failed',
  };
}

function loadRoster(rosterPath) {
  const parsed = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  if (!Array.isArray(parsed.roles) || parsed.roles.length === 0) {
    throw new Error('Swarm roster is missing roles.');
  }
  return parsed.roles;
}

function normalizeRoles(rawRoles, roster) {
  if (!rawRoles || rawRoles === 'all' || rawRoles === 'full-company') {
    return roster.map((role) => role.name);
  }

  const requested = rawRoles
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const known = new Set(roster.map((role) => role.name));
  const unknown = requested.filter((role) => !known.has(role));
  if (unknown.length > 0) {
    throw new Error(`Unknown role(s): ${unknown.join(', ')}`);
  }
  return requested;
}

function buildBriefFromOptions(options) {
  return {
    metrics: {
      userOutcome: options.metricUser || 'TBD',
      systemGuardrail: options.metricGuardrail || 'TBD',
      safetyQuality: options.metricSafety || 'TBD',
    },
    constraints: options.constraints.filter(Boolean),
    unknowns: options.unknowns.filter(Boolean),
  };
}

function createInitialState({ sessionId, task, roles, roster, repoRoot, pluginRoot, runtime, maxRounds, brief }) {
  const createdAt = nowIso();
  const roleMap = Object.fromEntries(
    roles.map((roleName) => {
      const descriptor = roster.find((role) => role.name === roleName);
      return [
        roleName,
        {
          name: descriptor.name,
          lane: descriptor.lane,
          mission: descriptor.mission,
          skillPath: descriptor.skillPath,
          status: 'queued',
          inbox: [],
          summary: '',
          dependencies: [],
          deliverables: [],
          decisions: [],
          conflicts: [],
          metrics: [],
          nextActions: [],
          lastRound: 0,
          lastError: '',
        },
      ];
    })
  );

  return {
    schemaVersion: 1,
    sessionId,
    createdAt,
    updatedAt: createdAt,
    repoRoot,
    pluginRoot,
    task,
    status: runtime.available ? 'active' : 'blocked',
    statusReason: runtime.available ? '' : `Agent runtime unavailable: ${runtime.reason}`,
    maxRounds,
    roundsCompleted: 0,
    activeRoles: roles,
    brief,
    runtime,
    decisions: [],
    conflicts: [],
    deliverables: [],
    messages: [],
    rounds: [],
    roles: roleMap,
  };
}

function persistNewSession(stateRoot, state) {
  const sessionPath = getSessionPath(stateRoot, state.sessionId);
  ensureDir(sessionPath);
  ensureDir(path.join(sessionPath, 'prompts'));
  ensureDir(path.join(sessionPath, 'transcripts'));
  writeJsonAtomic(path.join(sessionPath, 'state.json'), state);
  appendEvent(sessionPath, {
    type: 'session_created',
    payload: {
      task: state.task,
      activeRoles: state.activeRoles,
      status: state.status,
    },
  });
}

function loadState(stateRoot, sessionId) {
  const statePath = path.join(getSessionPath(stateRoot, sessionId), 'state.json');
  if (!fs.existsSync(statePath)) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function saveState(stateRoot, state, eventType, payload) {
  const sessionPath = getSessionPath(stateRoot, state.sessionId);
  ensureDir(sessionPath);
  state.updatedAt = nowIso();
  writeJsonAtomic(path.join(sessionPath, 'state.json'), state);
  appendEvent(sessionPath, {
    type: eventType,
    payload,
  });
}

function injectManualMessage(state, options) {
  const target = options.toRole;
  const subject = options.subject.trim();
  const body = options.body.trim();
  if (!target) {
    throw new Error('message requires --to');
  }
  if (!subject || !body) {
    throw new Error('message requires --subject and --body');
  }

  validateMessageTarget(target, state.activeRoles);
  routeMessages(state, options.fromRole || 'human', [
    {
      to: target,
      subject,
      body,
      priority: 'normal',
    },
  ]);
  return recomputeSessionStatus(state);
}

async function runRound({ state, roster, runtime, dryRun, stateRoot }) {
  if (state.status !== 'active') {
    return state;
  }
  if (!runtime.available && !dryRun) {
    state.status = 'blocked';
    state.statusReason = `Agent runtime unavailable: ${runtime.reason}`;
    return state;
  }

  const roundNumber = state.roundsCompleted + 1;
  const selectedRoles = selectRolesForRound(state, roundNumber);
  if (selectedRoles.length === 0) {
    state.status = 'converged';
    state.statusReason = 'No queued roles or unread messages remained.';
    return state;
  }

  const sessionPath = getSessionPath(stateRoot, state.sessionId);
  const roundRecord = {
    round: roundNumber,
    startedAt: nowIso(),
    roles: selectedRoles,
    roleStatuses: {},
  };
  state.rounds.push(roundRecord);

  const executions = await Promise.all(
    selectedRoles.map(async (roleName) => {
      const roleState = state.roles[roleName];
      const descriptor = roster.find((role) => role.name === roleName);
      const prompt = buildRolePrompt(state, descriptor, roundNumber);
      const promptPath = path.join(sessionPath, 'prompts', `round-${roundNumber}-${roleName}.md`);
      fs.writeFileSync(promptPath, prompt, 'utf8');

      const inboxSnapshot = [...roleState.inbox];
      roleState.status = 'running';

      if (dryRun) {
        const payload = buildDryRunPayload(roleName, roundNumber);
        const transcriptPath = path.join(sessionPath, 'transcripts', `round-${roundNumber}-${roleName}.json`);
        fs.writeFileSync(transcriptPath, JSON.stringify(payload, null, JSON_OUTPUT_INDENT), 'utf8');
        return { roleName, payload, inboxSnapshot };
      }

      try {
        const result = await runRoleAgent(runtime.command, prompt, state.repoRoot);
        const transcriptPath = path.join(sessionPath, 'transcripts', `round-${roundNumber}-${roleName}.txt`);
        fs.writeFileSync(transcriptPath, result.output, 'utf8');
        const payload = normalizeAgentPayload(parseAgentPayload(result.output), state.activeRoles);
        return { roleName, payload, inboxSnapshot };
      } catch (error) {
        const transcriptPath = path.join(sessionPath, 'transcripts', `round-${roundNumber}-${roleName}.txt`);
        const message = error instanceof Error ? error.message : String(error);
        fs.writeFileSync(transcriptPath, message, 'utf8');
        return {
          roleName,
          payload: {
            status: 'blocked',
            summary: message,
            deliverables: [],
            decisions: [],
            conflicts: [],
            messages: [],
            dependencies: [],
            metrics: [],
            nextActions: [],
          },
          inboxSnapshot,
        };
      }
    })
  );

  for (const execution of executions) {
    applyRolePayload(state, execution.roleName, execution.payload, execution.inboxSnapshot, roundNumber);
    roundRecord.roleStatuses[execution.roleName] = state.roles[execution.roleName].status;
  }

  roundRecord.completedAt = nowIso();
  state.roundsCompleted = roundNumber;
  return recomputeSessionStatus(state);
}

function selectRolesForRound(state, roundNumber) {
  if (roundNumber === 1) {
    return [...state.activeRoles];
  }

  return state.activeRoles.filter((roleName) => {
    const roleState = state.roles[roleName];
    return roleState.inbox.length > 0 || roleState.status === 'needs_input';
  });
}

function buildRolePrompt(state, role, roundNumber) {
  const skillAbsolutePath = path.resolve(state.pluginRoot, role.skillPath);
  const skillText = fs.readFileSync(skillAbsolutePath, 'utf8');
  const roleState = state.roles[role.name];
  const inboxMessages = roleState.inbox
    .map((messageId) => state.messages.find((message) => message.id === messageId))
    .filter(Boolean);
  const otherSummaries = state.activeRoles
    .filter((roleName) => roleName !== role.name)
    .map((roleName) => ({
      role: roleName,
      status: state.roles[roleName].status,
      summary: truncate(state.roles[roleName].summary || 'No summary yet.', MAX_SUMMARY_CHARS),
    }))
    .slice(0, MAX_CONTEXT_ITEMS);
  const recentDecisions = state.decisions.slice(-MAX_CONTEXT_ITEMS);
  const recentConflicts = state.conflicts.slice(-MAX_CONTEXT_ITEMS);

  return [
    skillText,
    '',
    'You are running inside Mobile Startup Studio as one long-lived employee in a persistent autonomous swarm.',
    'Return exactly one JSON object and no surrounding commentary.',
    '',
    'Allowed status values: done, standby, blocked, needs_input.',
    'Allowed metric types: user_outcome, system_guardrail, safety_quality, custom.',
    'Allowed message priorities: low, normal, high.',
    '',
    'JSON schema:',
    '{',
    '  "status": "done",',
    '  "summary": "short role update",',
    '  "deliverables": [{"title": "name", "details": "what changed or proposed", "targets": ["path/or/asset"], "kind": "code"}],',
    '  "decisions": [{"title": "decision", "rationale": "why", "impact": "what it changes"}],',
    '  "conflicts": [{"title": "conflict", "details": "what is blocked", "severity": "low"}],',
    '  "messages": [{"to": "role-name or broadcast", "subject": "short subject", "body": "concise relay note", "priority": "normal"}],',
    '  "dependencies": ["role-name"],',
    '  "metrics": [{"name": "metric name", "type": "user_outcome", "value": "proposal or target"}],',
    '  "next_actions": ["next action"]',
    '}',
    '',
    `SESSION ID: ${state.sessionId}`,
    `ROUND: ${roundNumber}`,
    `ROLE: ${role.name}`,
    `MISSION: ${role.mission}`,
    '',
    'SHARED TASK:',
    state.task,
    '',
    'BRIEF:',
    JSON.stringify(state.brief, null, JSON_OUTPUT_INDENT),
    '',
    'YOUR PREVIOUS STATE:',
    JSON.stringify(
      {
        status: roleState.status,
        summary: roleState.summary,
        dependencies: roleState.dependencies,
        nextActions: roleState.nextActions,
      },
      null,
      JSON_OUTPUT_INDENT
    ),
    '',
    'INBOX:',
    JSON.stringify(inboxMessages, null, JSON_OUTPUT_INDENT),
    '',
    'OTHER ROLE SUMMARIES:',
    JSON.stringify(otherSummaries, null, JSON_OUTPUT_INDENT),
    '',
    'RECENT DECISIONS:',
    JSON.stringify(recentDecisions, null, JSON_OUTPUT_INDENT),
    '',
    'RECENT CONFLICTS:',
    JSON.stringify(recentConflicts, null, JSON_OUTPUT_INDENT),
  ].join('\n');
}

function buildDryRunPayload(roleName, roundNumber) {
  return {
    status: 'standby',
    summary: `${roleName} dry-run round ${roundNumber}: prompt generated and no live agent invoked.`,
    deliverables: [],
    decisions: [],
    conflicts: [],
    messages: [],
    dependencies: [],
    metrics: [],
    nextActions: [],
  };
}

function runRoleAgent(command, prompt, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env: process.env,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
      if (code !== 0) {
        reject(new Error(output || `Agent command failed with exit code ${code}`));
        return;
      }
      resolve({ output });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function parseAgentPayload(rawOutput) {
  const jsonText = extractJsonObject(rawOutput);
  return JSON.parse(jsonText);
}

function extractJsonObject(rawOutput) {
  const cleaned = rawOutput.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  if (start === -1) {
    throw new Error('Agent output did not contain a JSON object.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return cleaned.slice(start, index + 1);
      }
    }
  }

  throw new Error('Agent output contained an incomplete JSON object.');
}

function normalizeAgentPayload(payload, activeRoles) {
  const normalizedStatus = typeof payload.status === 'string' ? payload.status.trim() : 'blocked';
  if (!ALLOWED_ROLE_STATUSES.has(normalizedStatus)) {
    throw new Error(`Unsupported role status: ${normalizedStatus}`);
  }

  return {
    status: normalizedStatus,
    summary: ensureString(payload.summary),
    deliverables: ensureArray(payload.deliverables).map((item) => ({
      title: ensureString(item.title),
      details: ensureString(item.details),
      targets: ensureArray(item.targets).map((target) => ensureString(target)),
      kind: ensureString(item.kind || 'general'),
    })),
    decisions: ensureArray(payload.decisions).map((item) => ({
      title: ensureString(item.title),
      rationale: ensureString(item.rationale),
      impact: ensureString(item.impact),
    })),
    conflicts: ensureArray(payload.conflicts).map((item) => ({
      title: ensureString(item.title),
      details: ensureString(item.details),
      severity: ensureString(item.severity || 'medium'),
    })),
    messages: ensureArray(payload.messages).map((item) => {
      const priority = ensureString(item.priority || 'normal');
      if (!ALLOWED_MESSAGE_PRIORITIES.has(priority)) {
        throw new Error(`Unsupported message priority: ${priority}`);
      }
      const to = ensureString(item.to);
      validateMessageTarget(to, activeRoles);
      return {
        to,
        subject: ensureString(item.subject),
        body: ensureString(item.body),
        priority,
      };
    }),
    dependencies: ensureArray(payload.dependencies).map((dependency) => ensureString(dependency)),
    metrics: ensureArray(payload.metrics).map((metric) => {
      const type = ensureString(metric.type || 'custom');
      if (!ALLOWED_METRIC_TYPES.has(type)) {
        throw new Error(`Unsupported metric type: ${type}`);
      }
      return {
        name: ensureString(metric.name),
        type,
        value: ensureString(metric.value),
      };
    }),
    nextActions: ensureArray(payload.next_actions).map((action) => ensureString(action)),
  };
}

function validateMessageTarget(target, activeRoles, roster) {
  if (target === 'broadcast') {
    return;
  }
  const validTargets = new Set(activeRoles || []);
  if (roster) {
    for (const role of roster) {
      validTargets.add(role.name);
    }
  }
  if (!validTargets.has(target)) {
    throw new Error(`Unknown message target: ${target}`);
  }
}

function applyRolePayload(state, roleName, payload, inboxSnapshot, roundNumber) {
  const roleState = state.roles[roleName];
  roleState.status = payload.status;
  roleState.summary = payload.summary;
  roleState.dependencies = uniqueStrings(payload.dependencies);
  roleState.deliverables = payload.deliverables;
  roleState.decisions = payload.decisions;
  roleState.conflicts = payload.conflicts;
  roleState.metrics = payload.metrics;
  roleState.nextActions = payload.nextActions;
  roleState.lastRound = roundNumber;
  roleState.lastError = payload.status === 'blocked' ? payload.summary : '';
  roleState.inbox = roleState.inbox.filter((messageId) => !inboxSnapshot.includes(messageId));

  for (const deliverable of payload.deliverables) {
    state.deliverables.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      round: roundNumber,
      role: roleName,
      ...deliverable,
    });
  }

  for (const decision of payload.decisions) {
    state.decisions.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      round: roundNumber,
      role: roleName,
      ...decision,
    });
  }

  for (const conflict of payload.conflicts) {
    state.conflicts.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      round: roundNumber,
      role: roleName,
      ...conflict,
    });
  }

  routeMessages(state, roleName, payload.messages, roundNumber);
}

function routeMessages(state, fromRole, messages, roundNumber = state.roundsCompleted + 1) {
  for (const message of messages) {
    const targets =
      message.to === 'broadcast'
        ? state.activeRoles.filter((roleName) => roleName !== fromRole)
        : state.activeRoles.includes(message.to)
          ? [message.to]
          : [];

    for (const target of targets) {
      const storedMessage = {
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        round: roundNumber,
        from: fromRole,
        to: target,
        subject: message.subject,
        body: message.body,
        priority: message.priority,
      };
      state.messages.push(storedMessage);
      state.roles[target].inbox.push(storedMessage.id);
    }
  }
}

function recomputeSessionStatus(state) {
  const blockedRoles = state.activeRoles.filter((roleName) => state.roles[roleName].status === 'blocked');
  if (blockedRoles.length > 0) {
    state.status = 'blocked';
    state.statusReason = `Blocked roles: ${blockedRoles.join(', ')}`;
    return state;
  }

  const unreadCount = state.activeRoles.reduce((count, roleName) => count + state.roles[roleName].inbox.length, 0);
  if (unreadCount === 0 && state.activeRoles.every((roleName) => ['done', 'standby'].includes(state.roles[roleName].status))) {
    state.status = 'converged';
    state.statusReason = 'All active roles reached done or standby with no unread relay messages.';
    return state;
  }

  state.status = 'active';
  state.statusReason = unreadCount > 0 ? `${unreadCount} unread relay messages remain.` : '';
  return state;
}

function printSession(state, printJson) {
  if (printJson) {
    console.log(JSON.stringify(state, null, JSON_OUTPUT_INDENT));
    return;
  }

  const lines = [
    `Session: ${state.sessionId}`,
    `Status: ${state.status}${state.statusReason ? ` (${state.statusReason})` : ''}`,
    `Task: ${state.task}`,
    `Rounds completed: ${state.roundsCompleted}/${state.maxRounds}`,
    `Active roles: ${state.activeRoles.join(', ')}`,
    'Metrics:',
    `- User outcome: ${state.brief.metrics.userOutcome}`,
    `- System guardrail: ${state.brief.metrics.systemGuardrail}`,
    `- Safety or quality: ${state.brief.metrics.safetyQuality}`,
    'Role summary:',
  ];

  for (const roleName of state.activeRoles) {
    const roleState = state.roles[roleName];
    lines.push(
      `- ${roleName}: ${roleState.status}; inbox=${roleState.inbox.length}; summary=${truncate(roleState.summary || 'No summary yet.', 160)}`
    );
  }

  console.log(lines.join('\n'));
}

function getSessionPath(stateRoot, sessionId) {
  return path.join(stateRoot, sessionId);
}

function createSessionId(task) {
  const slug = task
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  return `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${slug || 'session'}`;
}

function requireTask(task, commandName) {
  if (task && task.trim()) {
    return task.trim();
  }
  throw new Error(`${commandName} requires --task or a trailing task string.`);
}

function requireSessionId(sessionId, commandName) {
  if (sessionId && sessionId.trim()) {
    return sessionId.trim();
  }
  throw new Error(`${commandName} requires --session.`);
}

function ensureString(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function writeJsonAtomic(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, JSON_OUTPUT_INDENT), 'utf8');
  fs.renameSync(tempPath, filePath);
}

function appendEvent(sessionPath, event) {
  const eventPath = path.join(sessionPath, 'events.ndjson');
  const payload = {
    id: crypto.randomUUID(),
    timestamp: nowIso(),
    ...event,
  };
  fs.appendFileSync(eventPath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function truncate(value, limit) {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}...`;
}

function runShell(command, options = {}) {
  const result = spawnSync(command, {
    cwd: options.cwd,
    shell: true,
    env: process.env,
    encoding: 'utf8',
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: typeof result.status === 'number' ? result.status : 1,
  };
}

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, 'package.json')) && fs.existsSync(path.join(current, 'AGENTS.md'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('Could not find repository root.');
    }
    current = parent;
  }
}

module.exports = {
  buildBriefFromOptions,
  createInitialState,
  createSessionId,
  extractJsonObject,
  normalizeAgentPayload,
  normalizeRoles,
  parseArgs,
  recomputeSessionStatus,
  selectRolesForRound,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
