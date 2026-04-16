import type {
  EventBatchResult,
  QueuedStallPassEvent,
  StallPassEventName,
  StallPassEventPayload,
} from '@/types';
import { eventBatchResultSchema, parseSupabaseNullableRow } from '@/lib/supabase-parsers';
import { createSignalIdentifier, sanitizeStallPassEventProperties } from '@/lib/stallpass-signals';
import { getSupabaseClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

const EVENT_QUEUE_STORAGE_KEY = storage.keys.STALLPASS_EVENT_QUEUE;
const MAX_QUEUE_LENGTH = 100;
const MAX_BATCH_SIZE = 25;
const FLUSH_DELAY_MS = 2_500;

let flushPromise: Promise<EventBatchResult | null> | null = null;
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
let activeSessionId = createSignalIdentifier('stallpass_session');

function scheduleFlush(): void {
  if (flushTimeout) {
    return;
  }

  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    void flushStallPassEventQueue().catch(() => undefined);
  }, FLUSH_DELAY_MS);
}

async function readEventQueue(): Promise<QueuedStallPassEvent[]> {
  const storedQueue = await storage.get<QueuedStallPassEvent[] | null>(EVENT_QUEUE_STORAGE_KEY);
  return Array.isArray(storedQueue) ? storedQueue : [];
}

async function writeEventQueue(queue: QueuedStallPassEvent[]): Promise<void> {
  await storage.set(EVENT_QUEUE_STORAGE_KEY, queue.slice(-MAX_QUEUE_LENGTH));
}

async function getAnonymousId(): Promise<string> {
  const existingAnonymousId = await storage.get<string>(storage.keys.ANALYTICS_ANONYMOUS_ID);

  if (existingAnonymousId) {
    return existingAnonymousId;
  }

  const nextAnonymousId = createSignalIdentifier('anon');
  await storage.set(storage.keys.ANALYTICS_ANONYMOUS_ID, nextAnonymousId);
  return nextAnonymousId;
}

export function resetStallPassEventSession(): void {
  activeSessionId = createSignalIdentifier('stallpass_session');
}

export async function enqueueStallPassEvent(
  name: StallPassEventName,
  payload: StallPassEventPayload = {}
): Promise<QueuedStallPassEvent> {
  const anonymousId = await getAnonymousId();
  const queuedEvent: QueuedStallPassEvent = {
    client_event_id: createSignalIdentifier('evt'),
    anonymous_id: anonymousId,
    session_id: activeSessionId,
    name,
    bathroom_id: typeof payload.bathroom_id === 'string' ? payload.bathroom_id : null,
    screen_name: typeof payload.screen_name === 'string' ? payload.screen_name : null,
    occurred_at: new Date().toISOString(),
    properties: sanitizeStallPassEventProperties(payload),
  };

  const queue = await readEventQueue();
  await writeEventQueue([...queue, queuedEvent]);
  scheduleFlush();
  return queuedEvent;
}

async function flushBatch(queue: QueuedStallPassEvent[]): Promise<EventBatchResult | null> {
  if (queue.length === 0) {
    return null;
  }

  const batch = queue.slice(0, MAX_BATCH_SIZE);

  const { data, error } = await getSupabaseClient().functions.invoke('event-batch', {
    body: {
      batch,
    },
  });

  if (error) {
    throw error;
  }

  const parsedResult = parseSupabaseNullableRow(
    eventBatchResultSchema,
    data,
    'stallpass event batch',
    'Unable to record StallPass event analytics right now.'
  );

  if (parsedResult.error) {
    throw parsedResult.error;
  }

  await writeEventQueue(queue.slice(batch.length));

  if (queue.length > batch.length) {
    scheduleFlush();
  }

  return parsedResult.data as EventBatchResult | null;
}

export function flushStallPassEventQueue(): Promise<EventBatchResult | null> {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    const queue = await readEventQueue();
    return flushBatch(queue);
  })()
    .catch((error) => {
      console.error('Unable to flush the StallPass event queue:', error);
      return null;
    })
    .finally(() => {
      flushPromise = null;
    });

  return flushPromise;
}
