import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

interface EventBatchRequest {
  batch?: unknown;
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

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim() ?? '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, {
      error: 'Supabase function secrets are incomplete.',
    });
  }

  let payload: EventBatchRequest;

  try {
    payload = (await request.json()) as EventBatchRequest;
  } catch (_error) {
    return jsonResponse(400, {
      error: 'Request body must be valid JSON.',
    });
  }

  if (!Array.isArray(payload.batch)) {
    return jsonResponse(400, {
      error: 'batch must be an array.',
    });
  }

  const authorization = request.headers.get('Authorization')?.trim();

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: authorization
        ? {
            headers: {
              Authorization: authorization,
            },
          }
        : undefined,
    });

    const { data, error } = await supabase.rpc('track_event_batch', {
      p_events: payload.batch,
    });

    if (error) {
      throw error;
    }

    if (!isPlainObject(data)) {
      throw new Error('Unexpected event batch response.');
    }

    return jsonResponse(200, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to record the current event batch.';

    return jsonResponse(500, {
      error: message,
    });
  }
});
