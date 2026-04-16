import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

interface DeviceFingerprintRequest {
  install_fingerprint?: unknown;
  device_metadata?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCoordinate(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim() ?? '';
  const authorization = request.headers.get('Authorization')?.trim() ?? '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, {
      error: 'Supabase function secrets are incomplete.',
    });
  }

  if (!authorization) {
    return jsonResponse(401, {
      error: 'Authorization header is required.',
    });
  }

  let payload: DeviceFingerprintRequest;

  try {
    payload = (await request.json()) as DeviceFingerprintRequest;
  } catch (_error) {
    return jsonResponse(400, {
      error: 'Request body must be valid JSON.',
    });
  }

  const installFingerprint =
    typeof payload.install_fingerprint === 'string' ? payload.install_fingerprint.trim() : '';
  const deviceMetadata = isPlainObject(payload.device_metadata) ? payload.device_metadata : {};

  if (!installFingerprint) {
    return jsonResponse(400, {
      error: 'install_fingerprint is required.',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const { data, error } = await supabase.rpc('register_device_fingerprint', {
      p_install_fingerprint: installFingerprint,
      p_device_metadata: deviceMetadata,
      p_latitude: normalizeCoordinate(payload.latitude),
      p_longitude: normalizeCoordinate(payload.longitude),
    });

    if (error) {
      throw error;
    }

    if (!isPlainObject(data)) {
      throw new Error('Unexpected device fingerprint response.');
    }

    return jsonResponse(200, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to register the current device.';

    return jsonResponse(500, {
      error: message,
    });
  }
});
