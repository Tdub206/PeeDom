import { describe, expect, it } from '@jest/globals';

import { getFieldErrors, loginSchema, registerSchema, reportCreateSchema } from '@/utils/validate';

describe('loginSchema', () => {
  it('trims a valid email address during parsing', () => {
    const result = loginSchema.parse({
      email: '  rider@example.com  ',
      password: 'password123',
    });

    expect(result.email).toBe('rider@example.com');
  });

  it('maps invalid login input to field-level errors', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'short',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected login validation to fail for invalid input.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      email: 'Email is required.',
      password: 'Password must be at least 8 characters long.',
    });
  });
});

describe('registerSchema', () => {
  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      email: 'rider@example.com',
      password: 'password123',
      confirmPassword: 'different123',
      displayName: 'Rider',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected registration validation to fail for mismatched passwords.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      confirmPassword: 'Passwords do not match.',
    });
  });
});

describe('reportCreateSchema', () => {
  it('accepts valid report payloads', () => {
    const result = reportCreateSchema.parse({
      bathroom_id: 'bathroom-123',
      report_type: 'closed',
      notes: 'Closed after 9pm.',
    });

    expect(result.report_type).toBe('closed');
  });

  it('rejects empty bathroom ids and long notes', () => {
    const result = reportCreateSchema.safeParse({
      bathroom_id: '',
      report_type: 'other',
      notes: 'a'.repeat(501),
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected report validation to fail for invalid input.');
    }

    expect(getFieldErrors(result.error)).toEqual({
      bathroom_id: 'Bathroom identifier is required.',
      notes: 'Report details must be 500 characters or fewer.',
    });
  });
});
