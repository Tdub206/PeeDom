import { describe, expect, it } from '@jest/globals';
import {
  formatBathroomStatusTimestamp,
  getBathroomStatusEmoji,
  getBathroomStatusLabel,
  getBathroomStatusTone,
} from '@/lib/bathroom-status';

describe('bathroom status helpers', () => {
  it('maps live status values to labels and emoji', () => {
    expect(getBathroomStatusLabel('clean')).toBe('Recently cleaned');
    expect(getBathroomStatusEmoji('dirty')).toBe('⚠️');
    expect(getBathroomStatusLabel('closed')).toBe('Reported closed');
  });

  it('returns stable tone classes for each status', () => {
    expect(getBathroomStatusTone('clean')).toEqual({
      backgroundClassName: 'bg-success/10',
      borderClassName: 'border-success/20',
      textClassName: 'text-success',
    });

    expect(getBathroomStatusTone('closed')).toEqual({
      backgroundClassName: 'bg-danger/10',
      borderClassName: 'border-danger/20',
      textClassName: 'text-danger',
    });
  });

  it('formats valid timestamps and falls back for invalid values', () => {
    expect(formatBathroomStatusTimestamp('2026-03-16T12:00:00.000Z')).toContain('Updated');
    expect(formatBathroomStatusTimestamp('not-a-date')).toBe('Updated recently');
  });
});
