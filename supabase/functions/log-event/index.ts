import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_BODY_BYTES = 256_000;
const MAX_BATCH_SIZE = 100;

const ALLOWED_EVENT_TYPES = new Set([
  'bathroom_viewed',
  'bathroom_searched',
  'code_viewed',
  'code_confirmed',
  'code_denied',
  'code_submitted',
  'check_in',
  'check_out',
  'prediction_shown',
  'prediction_correct',
  'user_override',
  'review_submitted',
  'photo_uploaded',
  'report_submitted',
  'app_opened',
  'app_backgrounded',
  'urgency_session',
]);

const jsonHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-device-fingerprint',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type EventInput = {
  event_type: string;
  bathroom_id?: string | null;
  payload?: Record<string, unknown> | null;
  latitude?: number | null;
  longitude?: number | null;
  session_id?: string | null;
  device_fingerprint?: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeEvent(raw: unknown, fallbackFingerprint: string | null): EventInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const eventType = typeof record.event_type === 'string' ? record.event_type : '';
  if (!ALLOWED_EVENT_TYPES.has(eventType)) return null;

  const bathroomId =
    typeof record.bathroom_id === 'string' && record.bathroom_id.length > 0
      ? record.bathroom_id
      : null;

  const payload =
    record.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
      ? (record.payload as Record<string, unknown>)
      : {};

  const latitude =
    typeof record.latitude === 'number' && Number.isFinite(record.latitude)
      ? record.latitude
      : null;
  const longitude =
    typeof record.longitude === 'number' && Number.isFinite(record.longitude)
      ? record.longitude
      : null;

  const sessionId =
    typeof record.session_id === 'string' && record.session_id.length > 0
      ? record.session_id
      : null;

  const eventFingerprint =
    typeof record.device_fingerprint === 'string' && record.device_fingerprint.length > 0
      ? record.device_fingerprint
      : fallbackFingerprint;

  return {
    event_type: eventType,
    bathroom_id: bathroomId,
    payload,
    latitude,
    longitude,
    session_id: sessionId,
    device_fingerprint: eventFingerprint,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: jsonHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'Request body too large' }, 413);
  }

  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header' }, 401);
  }

  const headerFingerprint = request.headers.get('x-device-fingerprint');
  const fingerprintFallback =
    typeof headerFingerprint === 'string' && headerFingerprint.length > 0
      ? headerFingerprint
      : null;

  let body: Record<string, unknown>;
  try {
    const rawText = await request.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Request body too large' }, 413);
    }
    body = JSON.parse(rawText);
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const SUPABASE_URL = requireEnv('SUPABASE_URL');
  const SUPABASE_ANON_KEY = requireEnv('SUPABASE_ANON_KEY');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const rawEvents = Array.isArray(body.events) ? body.events : null;

  if (rawEvents) {
    if (rawEvents.length === 0) {
      return jsonResponse({ inserted: 0 });
    }

    if (rawEvents.length > MAX_BATCH_SIZE) {
      return jsonResponse({ error: 'Batch too large' }, 413);
    }

    const normalized: EventInput[] = [];
    for (const raw of rawEvents) {
      const ev = normalizeEvent(raw, fingerprintFallback);
      if (!ev) {
        return jsonResponse({ error: 'Invalid event payload' }, 400);
      }
      normalized.push(ev);
    }

    const { data, error } = await supabase.rpc('log_access_intelligence_events_batch', {
      p_events: normalized,
    });

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    return jsonResponse({ inserted: typeof data === 'number' ? data : normalized.length });
  }

  // Single-event path.
  const ev = normalizeEvent(body, fingerprintFallback);
  if (!ev) {
    return jsonResponse({ error: 'Invalid event payload' }, 400);
  }

  const { data, error } = await supabase.rpc('log_access_intelligence_event', {
    p_event_type: ev.event_type,
    p_bathroom_id: ev.bathroom_id,
    p_payload: ev.payload ?? {},
    p_device_fingerprint: ev.device_fingerprint,
    p_latitude: ev.latitude,
    p_longitude: ev.longitude,
    p_session_id: ev.session_id,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ event_id: data, inserted: 1 });
});
