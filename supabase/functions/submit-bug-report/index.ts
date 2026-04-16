import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_BODY_BYTES = 65_536;
const RATE_LIMIT_PER_HOUR = 5;

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function scrubPii(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(EMAIL_REGEX, '[redacted]');
}

function truncateField(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: jsonHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Body size guard.
  const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10);

  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'Request body too large' }, 413);
  }

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

  // Validate required fields.
  const idempotencyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : '';

  if (!idempotencyKey) {
    return jsonResponse({ error: 'Missing idempotency_key' }, 400);
  }

  const errorMessage = typeof body.error_message === 'string' ? body.error_message : '';

  if (!errorMessage) {
    return jsonResponse({ error: 'Missing error_message' }, 400);
  }

  const SUPABASE_URL = requireEnv('SUPABASE_URL');
  const SUPABASE_ANON_KEY = requireEnv('SUPABASE_ANON_KEY');
  const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  // Resolve user_id from optional Authorization header.
  let userId: string | null = null;
  let deviceId = 'unknown';
  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    userId = user?.id ?? null;
  }

  // Device ID: prefer from payload, fall back to user_id, then 'unknown'.
  deviceId = typeof body.device_id === 'string' && body.device_id.trim()
    ? body.device_id.trim()
    : userId ?? 'unknown';

  // Rate limit: max reports per device per hour.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: recentCount } = await adminClient
    .from('beta_bug_reports')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', deviceId)
    .gte('created_at', oneHourAgo);

  if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return jsonResponse({ error: 'Rate limit exceeded. Please try again later.' }, 429);
  }

  // Scrub PII and truncate before storage.
  const row = {
    user_id: userId,
    device_id: deviceId,
    screen_name: truncateField(String(body.screen_name ?? 'unknown'), 200),
    error_message: scrubPii(truncateField(errorMessage, 500)),
    error_stack: scrubPii(truncateField(String(body.error_stack ?? ''), 4000)),
    component_stack: scrubPii(truncateField(String(body.component_stack ?? ''), 4000)),
    user_comment: scrubPii(truncateField(String(body.user_comment ?? ''), 1000)),
    app_version: truncateField(String(body.app_version ?? ''), 50),
    os_name: truncateField(String(body.os_name ?? ''), 50),
    os_version: truncateField(String(body.os_version ?? ''), 50),
    device_model: truncateField(String(body.device_model ?? ''), 100),
    sentry_event_id: typeof body.sentry_event_id === 'string' ? body.sentry_event_id : null,
    idempotency_key: idempotencyKey,
    schema_version: typeof body.schema_version === 'number' ? body.schema_version : 1,
    captured_at: typeof body.captured_at === 'string' ? body.captured_at : new Date().toISOString(),
  };

  // Upsert: ignore duplicate idempotency keys (offline queue retries).
  const { error: insertError } = await adminClient
    .from('beta_bug_reports')
    .upsert(row, { onConflict: 'idempotency_key', ignoreDuplicates: true });

  if (insertError) {
    return jsonResponse({ error: 'Failed to save bug report' }, 500);
  }

  return jsonResponse({ success: true });
});
