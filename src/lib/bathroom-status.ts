import type { BathroomLiveStatus } from '@/types';

export function getBathroomStatusLabel(status: BathroomLiveStatus): string {
  switch (status) {
    case 'clean':
      return 'Recently cleaned';
    case 'dirty':
      return 'Needs cleaning';
    case 'closed':
      return 'Reported closed';
    case 'out_of_order':
      return 'Out of order';
    case 'long_wait':
      return 'Long wait';
    default:
      return 'Live update';
  }
}

export function getBathroomStatusEmoji(status: BathroomLiveStatus): string {
  switch (status) {
    case 'clean':
      return '✨';
    case 'dirty':
      return '⚠️';
    case 'closed':
      return '🚫';
    case 'out_of_order':
      return '🔧';
    case 'long_wait':
      return '⏳';
    default:
      return '📍';
  }
}

export function getBathroomStatusTone(status: BathroomLiveStatus): {
  backgroundClassName: string;
  borderClassName: string;
  textClassName: string;
} {
  switch (status) {
    case 'clean':
      return {
        backgroundClassName: 'bg-success/10',
        borderClassName: 'border-success/20',
        textClassName: 'text-success',
      };
    case 'dirty':
      return {
        backgroundClassName: 'bg-warning/10',
        borderClassName: 'border-warning/20',
        textClassName: 'text-warning',
      };
    case 'closed':
      return {
        backgroundClassName: 'bg-danger/10',
        borderClassName: 'border-danger/20',
        textClassName: 'text-danger',
      };
    case 'out_of_order':
      return {
        backgroundClassName: 'bg-brand-50',
        borderClassName: 'border-brand-200',
        textClassName: 'text-brand-700',
      };
    case 'long_wait':
      return {
        backgroundClassName: 'bg-brand-50',
        borderClassName: 'border-brand-200',
        textClassName: 'text-brand-700',
      };
    default:
      return {
        backgroundClassName: 'bg-surface-muted',
        borderClassName: 'border-surface-strong',
        textClassName: 'text-ink-700',
      };
  }
}

export function formatBathroomStatusTimestamp(timestamp: string): string {
  const parsedDate = new Date(timestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Updated recently';
  }

  return `Updated ${parsedDate.toLocaleString()}`;
}
