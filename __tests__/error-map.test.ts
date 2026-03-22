import { describe, expect, it } from '@jest/globals';
import { getErrorMessage } from '@/utils/errorMap';

describe('getErrorMessage', () => {
  it('maps code reveal auth errors to user-facing copy', () => {
    const error = Object.assign(new Error('AUTH_REQUIRED'), {
      code: 'AUTH_REQUIRED',
    });

    expect(getErrorMessage(error)).toBe('Sign in to continue with that action.');
  });

  it('maps unrevealed code access errors to unlock guidance', () => {
    const error = Object.assign(new Error('CODE_REVEAL_NOT_GRANTED'), {
      code: 'CODE_REVEAL_NOT_GRANTED',
    });

    expect(getErrorMessage(error)).toBe('Complete a rewarded unlock before revealing this bathroom code.');
  });

  it('maps unavailable code reveal errors to a clear fallback', () => {
    const error = Object.assign(new Error('CODE_NOT_AVAILABLE'), {
      code: 'CODE_NOT_AVAILABLE',
    });

    expect(getErrorMessage(error)).toBe('There is no active community code to reveal for this bathroom right now.');
  });

  it('maps self-vote rejections to a trust-safe message', () => {
    const error = Object.assign(new Error('SELF_CODE_VOTE'), {
      code: 'SELF_CODE_VOTE',
    });

    expect(getErrorMessage(error)).toBe("You can't verify a bathroom code that you submitted yourself.");
  });

  it('maps insufficient point errors during premium redemption', () => {
    const error = Object.assign(new Error('INSUFFICIENT_POINTS'), {
      code: 'INSUFFICIENT_POINTS',
    });

    expect(getErrorMessage(error)).toBe('You need more contribution points before redeeming premium access.');
  });
});
