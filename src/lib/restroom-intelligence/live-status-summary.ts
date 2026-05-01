import type { CurrentBathroomLiveStatus } from '@/api/restroom-intelligence';

export function formatLiveStatusSummary(event: CurrentBathroomLiveStatus): string {
  if (event.summary_text.trim().length > 0) {
    return event.summary_text;
  }

  if (event.status_type === 'line') {
    return `line reported ${event.minutes_since_report} minutes ago`;
  }

  if (event.status_type === 'supplies') {
    return `supplies missing ${event.minutes_since_report} minutes ago`;
  }

  return `${event.status_value} ${event.minutes_since_report} minutes ago`;
}

export function getLiveStatusHeadline(events: CurrentBathroomLiveStatus[]): string | null {
  if (!events.length) {
    return null;
  }

  const topEvent = events
    .slice()
    .sort((left, right) => {
      const leftScore = left.confidence_score * 0.65 + (1 / (left.minutes_since_report + 1)) * 0.35;
      const rightScore = right.confidence_score * 0.65 + (1 / (right.minutes_since_report + 1)) * 0.35;
      return rightScore - leftScore;
    })[0];

  return formatLiveStatusSummary(topEvent);
}

export function mapLegacyStatusToRichLiveStatus(status: 'clean' | 'dirty' | 'closed' | 'out_of_order' | 'long_wait'): {
  statusType: 'cleanliness' | 'closed' | 'line' | 'access';
  statusValue: string;
  waitMinutes: number | null;
} {
  switch (status) {
    case 'clean':
      return {
        statusType: 'cleanliness',
        statusValue: 'clean',
        waitMinutes: null,
      };
    case 'dirty':
      return {
        statusType: 'cleanliness',
        statusValue: 'dirty',
        waitMinutes: null,
      };
    case 'closed':
      return {
        statusType: 'closed',
        statusValue: 'closed',
        waitMinutes: null,
      };
    case 'out_of_order':
      return {
        statusType: 'access',
        statusValue: 'out_of_order',
        waitMinutes: null,
      };
    case 'long_wait':
      return {
        statusType: 'line',
        statusValue: 'long_wait',
        waitMinutes: 15,
      };
    default:
      return {
        statusType: 'cleanliness',
        statusValue: 'unknown',
        waitMinutes: null,
      };
  }
}
