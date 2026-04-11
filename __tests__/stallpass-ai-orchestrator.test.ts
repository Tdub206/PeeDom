const orchestrator = require('../scripts/stallpass-ai-orchestrator.cjs');

describe('stallpass ai orchestrator helpers', () => {
  it('parses command flags', () => {
    const parsed = orchestrator.parseArgs([
      'loop',
      '--task',
      'Fix offline sync',
      '--max-rounds',
      '3',
      '--skip-codex',
      '--android-verify',
    ]);

    expect(parsed.command).toBe('loop');
    expect(parsed.task).toBe('Fix offline sync');
    expect(parsed.maxRounds).toBe(3);
    expect(parsed.skipCodex).toBe(true);
    expect(parsed.androidVerify).toBe(true);
  });

  it('falls back to positional task text', () => {
    const parsed = orchestrator.parseArgs(['plan', 'Refactor', 'session', 'restoration']);
    expect(parsed.command).toBe('plan');
    expect(parsed.positionals.join(' ')).toBe('Refactor session restoration');
  });

  it('parses status lines', () => {
    expect(orchestrator.parseStatusLine('STATUS: CHANGES_REQUESTED\n\nFix it.')).toBe('CHANGES_REQUESTED');
    expect(orchestrator.parseStatusLine('No explicit status')).toBe('UNKNOWN');
  });

  it('truncates long text', () => {
    expect(orchestrator.truncateText('short', 20)).toBe('short');

    const truncated = orchestrator.truncateText('abcdefghijklmnopqrstuvwxyz', 10);
    expect(truncated.startsWith('abcdefghij')).toBe(true);
    expect(truncated).toContain('[truncated');
  });
});
