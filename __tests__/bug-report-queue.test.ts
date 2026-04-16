import { bugReportPayloadSchema } from '../src/utils/validate';
import {
  scrubPii,
  truncate,
  generateIdempotencyKey,
  sanitizeErrorMessage,
  sanitizeStack,
  sanitizeComment,
} from '../src/utils/bug-report-helpers';
import { setActiveScreen, getActiveScreen } from '../src/utils/active-screen-tracker';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

describe('bugReportPayloadSchema', () => {
  const validPayload = {
    schema_version: 1,
    idempotency_key: 'bug_123_abc',
    screen_name: '/search',
    error_message: 'Something broke',
    error_stack: 'Error: Something broke\n  at Foo.bar',
    component_stack: '',
    user_comment: 'I tapped a pin',
    app_version: '1.0.0',
    os_name: 'iOS',
    os_version: '17.4',
    device_model: 'iPhone 15',
    captured_at: '2026-04-12T12:00:00.000Z',
    sentry_event_id: null,
  };

  it('accepts a valid payload', () => {
    const result = bugReportPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects missing idempotency_key', () => {
    const result = bugReportPayloadSchema.safeParse({
      ...validPayload,
      idempotency_key: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing error_message', () => {
    const result = bugReportPayloadSchema.safeParse({
      ...validPayload,
      error_message: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects user_comment over 1100 chars', () => {
    const result = bugReportPayloadSchema.safeParse({
      ...validPayload,
      user_comment: 'x'.repeat(1101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts null sentry_event_id', () => {
    const result = bugReportPayloadSchema.safeParse({
      ...validPayload,
      sentry_event_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts string sentry_event_id', () => {
    const result = bugReportPayloadSchema.safeParse({
      ...validPayload,
      sentry_event_id: 'abc123',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PII scrubbing
// ---------------------------------------------------------------------------

describe('scrubPii', () => {
  it('redacts email addresses', () => {
    expect(scrubPii('contact user@example.com for help')).toBe(
      'contact [redacted] for help'
    );
  });

  it('redacts multiple emails', () => {
    expect(scrubPii('a@b.com and c@d.org')).toBe('[redacted] and [redacted]');
  });

  it('leaves non-email text unchanged', () => {
    expect(scrubPii('no emails here')).toBe('no emails here');
  });

  it('handles empty string', () => {
    expect(scrubPii('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

describe('truncate', () => {
  it('returns text unchanged when under limit', () => {
    expect(truncate('short', 100)).toBe('short');
  });

  it('truncates and appends marker when over limit', () => {
    const result = truncate('a'.repeat(50), 10);
    expect(result.length).toBeLessThan(50);
    expect(result).toContain('...[truncated]');
  });

  it('handles exact limit', () => {
    expect(truncate('12345', 5)).toBe('12345');
  });
});

// ---------------------------------------------------------------------------
// Sanitization helpers
// ---------------------------------------------------------------------------

describe('sanitizeErrorMessage', () => {
  it('truncates long messages and scrubs PII', () => {
    const long = 'Error for user@test.com ' + 'x'.repeat(600);
    const result = sanitizeErrorMessage(long);
    expect(result).not.toContain('user@test.com');
    expect(result.length).toBeLessThan(600);
  });
});

describe('sanitizeStack', () => {
  it('returns empty string for null', () => {
    expect(sanitizeStack(null)).toBe('');
  });

  it('truncates long stacks', () => {
    const result = sanitizeStack('x'.repeat(10_000));
    expect(result.length).toBeLessThan(10_000);
  });

  it('scrubs PII from stacks', () => {
    expect(sanitizeStack('at handler (user@test.com)')).not.toContain('user@test.com');
  });
});

describe('sanitizeComment', () => {
  it('trims whitespace', () => {
    expect(sanitizeComment('  hello  ')).toBe('hello');
  });

  it('truncates long comments', () => {
    const result = sanitizeComment('x'.repeat(2000));
    expect(result.length).toBeLessThan(2000);
  });
});

// ---------------------------------------------------------------------------
// Idempotency key uniqueness
// ---------------------------------------------------------------------------

describe('generateIdempotencyKey', () => {
  it('starts with bug_ prefix', () => {
    expect(generateIdempotencyKey()).toMatch(/^bug_/);
  });

  it('generates 100 unique keys', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateIdempotencyKey()));
    expect(keys.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Active screen tracker
// ---------------------------------------------------------------------------

describe('active-screen-tracker', () => {
  it('defaults to unknown', () => {
    setActiveScreen('');
    expect(getActiveScreen()).toBe('unknown');
  });

  it('tracks screen changes', () => {
    setActiveScreen('/search');
    expect(getActiveScreen()).toBe('/search');
    setActiveScreen('/map');
    expect(getActiveScreen()).toBe('/map');
  });

  it('resets to unknown on empty string', () => {
    setActiveScreen('/profile');
    setActiveScreen('');
    expect(getActiveScreen()).toBe('unknown');
  });
});
