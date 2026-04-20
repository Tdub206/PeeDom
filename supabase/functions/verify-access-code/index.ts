import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_BODY_BYTES = 16_384;

const VALID_ACTIONS = new Set(['confirm', 'deny', 'update']);

const jsonHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-device-fingerprint',
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
    body = JSON.parse(rawText);
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const bathroomId =
    typeof body.bathroom_id === 'string' && body.bathroom_id.length > 0
      ? body.bathroom_id
      : null;
  if (!bathroomId) {
    return jsonResponse({ error: 'Missing bathroom_id' }, 400);
  }

  const action = typeof body.action === 'string' ? body.action : '';
  if (!VALID_ACTIONS.has(action)) {
    return jsonResponse({ error: 'Invalid action' }, 400);
  }

  const reportedCode =
    typeof body.reported_code === 'string' && body.reported_code.length > 0
      ? body.reported_code
      : null;

  const deviceFingerprint =
    typeof body.device_fingerprint === 'string' && body.device_fingerprint.length > 0
      ? body.device_fingerprint
      : fingerprintFallback;

  const latitude =
    typeof body.latitude === 'number' && Number.isFinite(body.latitude) ? body.latitude : null;
  const longitude =
    typeof body.longitude === 'number' && Number.isFinite(body.longitude) ? body.longitude : null;

  const SUPABASE_URL = requireEnv('SUPABASE_URL');
  const SUPABASE_ANON_KEY = requireEnv('SUPABASE_ANON_KEY');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.rpc('verify_access_code', {
    p_bathroom_id: bathroomId,
    p_action: action,
    p_reported_code: reportedCode,
    p_device_fingerprint: deviceFingerprint,
    p_latitude: latitude,
    p_longitude: longitude,
  });

  if (error) {
    const message = error.message ?? 'Verification failed';
    const status =
      message.includes('AUTH_REQUIRED') || message.includes('ACCOUNT_DEACTIVATED')
        ? 401
        : message.includes('SELF_CODE_VOTE') ||
          message.includes('NO_ACTIVE_CODE') ||
          message.includes('CODE_REQUIRED')
        ? 400
        : 500;
    return jsonResponse({ error: message }, status);
  }

  return jsonResponse({ result: data });
});
