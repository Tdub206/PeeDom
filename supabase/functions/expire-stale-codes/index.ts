import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type ExpiredCodeRow = {
  bathroom_id: string;
  code_id: string;
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, {
      error: 'Supabase function secrets are incomplete.',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.rpc('expire_stale_bathroom_access_codes');

    if (error) {
      throw error;
    }

    const expiredCodes = (data ?? []) as ExpiredCodeRow[];

    return jsonResponse(200, {
      expired_count: expiredCodes.length,
      expired_codes: expiredCodes,
      ran_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to expire stale codes.';

    return jsonResponse(500, {
      error: message,
    });
  }
});
