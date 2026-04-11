import { describe, expect, it } from '@jest/globals';
import { normalizeGoogleOpeningHours } from '@/utils/google-hours';

describe('normalizeGoogleOpeningHours', () => {
  it('maps same-day periods into StallPass hours data', () => {
    const result = normalizeGoogleOpeningHours({
      periods: [
        {
          open: { day: 1, hour: 9, minute: 0 },
          close: { day: 1, hour: 17, minute: 0 },
        },
      ],
    });

    expect(result).toEqual({
      monday: [{ open: '09:00', close: '17:00' }],
    });
  });

  it('splits overnight periods across both days', () => {
    const result = normalizeGoogleOpeningHours({
      periods: [
        {
          open: { day: 5, hour: 22, minute: 0 },
          close: { day: 6, hour: 2, minute: 0 },
        },
      ],
    });

    expect(result).toEqual({
      friday: [{ open: '22:00', close: '23:59' }],
      saturday: [{ open: '00:00', close: '02:00' }],
    });
  });

  it('normalizes always-open locations into a full weekly schedule', () => {
    const result = normalizeGoogleOpeningHours({
      periods: [
        {
          open: { day: 0, hour: 0, minute: 0 },
        },
      ],
    });

    expect(Object.keys(result)).toHaveLength(7);
    expect(result.sunday).toEqual([{ open: '00:00', close: '23:59' }]);
    expect(result.wednesday).toEqual([{ open: '00:00', close: '23:59' }]);
  });
});
