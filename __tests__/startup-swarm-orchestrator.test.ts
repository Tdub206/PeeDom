const orchestrator = require('../plugins/mobile-startup-studio/scripts/startup-swarm-orchestrator.cjs');

describe('startup swarm orchestrator', () => {
  it('parses run arguments with metrics and roles', () => {
    const parsed = orchestrator.parseArgs([
      'run',
      '--task',
      'Improve map speed',
      '--roles',
      'cto-lead,qa-release-manager',
      '--metric-user',
      'Increase accuracy',
      '--metric-guardrail',
      'Keep p95 flat',
      '--metric-safety',
      'Reduce false reports',
      '--dry-run',
    ]);

    expect(parsed.commandName).toBe('run');
    expect(parsed.task).toBe('Improve map speed');
    expect(parsed.roles).toBe('cto-lead,qa-release-manager');
    expect(parsed.metricUser).toBe('Increase accuracy');
    expect(parsed.metricGuardrail).toBe('Keep p95 flat');
    expect(parsed.metricSafety).toBe('Reduce false reports');
    expect(parsed.dryRun).toBe(true);
  });

  it('normalizes roles and creates a session with queued workers', () => {
    const roster = [
      { name: 'cto-lead', lane: 'leadership', mission: 'Lead', skillPath: './skills/cto-lead/SKILL.md' },
      { name: 'qa-release-manager', lane: 'operations', mission: 'QA', skillPath: './skills/qa-release-manager/SKILL.md' },
    ];
    const roles = orchestrator.normalizeRoles('cto-lead,qa-release-manager', roster);
    const session = orchestrator.createInitialState({
      sessionId: 'session-1',
      task: 'Ship safely',
      roles,
      roster,
      repoRoot: 'C:/repo',
      pluginRoot: 'C:/repo/plugins/mobile-startup-studio',
      runtime: { available: true, reason: 'ok', command: 'codex exec -', probeCommand: 'codex --help' },
      maxRounds: 3,
      brief: orchestrator.buildBriefFromOptions({
        metricUser: 'User success',
        metricGuardrail: 'Latency guardrail',
        metricSafety: 'Quality guardrail',
        constraints: ['Mobile-first'],
        unknowns: ['Unknown cause'],
      }),
    });

    expect(session.activeRoles).toEqual(['cto-lead', 'qa-release-manager']);
    expect(session.roles['cto-lead'].status).toBe('queued');
    expect(orchestrator.selectRolesForRound(session, 1)).toEqual(['cto-lead', 'qa-release-manager']);
  });

  it('extracts JSON payloads from fenced agent output', () => {
    const raw = [
      '```json',
      '{"status":"done","summary":"ok","deliverables":[],"decisions":[],"conflicts":[],"messages":[],"dependencies":[],"metrics":[],"next_actions":[]}',
      '```',
    ].join('\n');

    const parsed = JSON.parse(orchestrator.extractJsonObject(raw));
    expect(parsed.status).toBe('done');
    expect(parsed.summary).toBe('ok');
  });

  it('marks a session converged when all roles are done and inboxes are empty', () => {
    const session = {
      activeRoles: ['cto-lead', 'qa-release-manager'],
      roles: {
        'cto-lead': { status: 'done', inbox: [], summary: 'Ready' },
        'qa-release-manager': { status: 'standby', inbox: [], summary: 'Ready' },
      },
      status: 'active',
      statusReason: '',
      brief: {
        metrics: {
          userOutcome: 'u',
          systemGuardrail: 'g',
          safetyQuality: 's',
        },
      },
    };

    const updated = orchestrator.recomputeSessionStatus(session);
    expect(updated.status).toBe('converged');
    expect(updated.statusReason).toMatch(/done or standby/i);
  });
});
