import { describe, expect, it } from '@jest/globals';
import { displayNameSchema } from '@/lib/validators';

describe('profile validation', () => {
  it('trims and accepts valid display names', () => {
    expect(displayNameSchema.parse('  Jane Doe  ')).toBe('Jane Doe');
  });

  it('rejects names shorter than two characters after trimming', () => {
    expect(() => displayNameSchema.parse(' A ')).toThrow('Display name must be at least 2 characters.');
  });

  it('rejects names longer than fifty characters', () => {
    expect(() => displayNameSchema.parse('A'.repeat(51))).toThrow('Display name must be 50 characters or fewer.');
  });
});
