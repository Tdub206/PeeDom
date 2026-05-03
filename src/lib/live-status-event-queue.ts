import type {
  BathroomLiveStatusEventMutationPayload,
  BathroomLiveStatusEventType,
  BathroomOccupancyLevel,
} from '@/types';

const LIVE_STATUS_EVENT_TYPES: BathroomLiveStatusEventType[] = [
  'cleanliness',
  'line',
  'occupancy',
  'supplies',
  'access',
  'closed',
  'open',
  'safety',
];

const OCCUPANCY_LEVELS: BathroomOccupancyLevel[] = ['unknown', 'empty', 'low', 'medium', 'high', 'full'];

export function isBathroomLiveStatusEventMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & BathroomLiveStatusEventMutationPayload {
  const suppliesMissing = payload.supplies_missing;
  const confidenceScore = payload.confidence_score;

  return (
    typeof payload.bathroom_id === 'string' &&
    payload.bathroom_id.length > 0 &&
    typeof payload.status_type === 'string' &&
    LIVE_STATUS_EVENT_TYPES.includes(payload.status_type as BathroomLiveStatusEventType) &&
    typeof payload.status_value === 'string' &&
    payload.status_value.length > 0 &&
    (typeof payload.wait_minutes === 'undefined' ||
      payload.wait_minutes === null ||
      (typeof payload.wait_minutes === 'number' && Number.isInteger(payload.wait_minutes) && payload.wait_minutes >= 0)) &&
    (typeof payload.occupancy_level === 'undefined' ||
      payload.occupancy_level === null ||
      (typeof payload.occupancy_level === 'string' &&
        OCCUPANCY_LEVELS.includes(payload.occupancy_level as BathroomOccupancyLevel))) &&
    (typeof suppliesMissing === 'undefined' ||
      (Array.isArray(suppliesMissing) && suppliesMissing.every((item) => typeof item === 'string'))) &&
    (typeof confidenceScore === 'undefined' ||
      (typeof confidenceScore === 'number' && confidenceScore >= 0 && confidenceScore <= 1)) &&
    (typeof payload.evidence_photo_url === 'undefined' ||
      payload.evidence_photo_url === null ||
      typeof payload.evidence_photo_url === 'string')
  );
}
