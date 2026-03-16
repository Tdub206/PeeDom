import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

interface BathroomCodeInsertWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    bathroom_id: string;
    submitted_by: string;
  };
  old_record: null | Record<string, unknown>;
}

interface SubscriberRow {
  user_id: string;
  push_token: string;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim() ?? '';

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function isAuthorized(request: Request, serviceRoleKey: string): boolean {
  const authorization = request.headers.get('Authorization')?.trim() ?? '';
  return authorization === `Bearer ${serviceRoleKey}`;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    });
  }

  try {
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!isAuthorized(request, serviceRoleKey)) {
      return jsonResponse(401, {
        error: 'Unauthorized.',
      });
    }

    const payload = (await request.json()) as BathroomCodeInsertWebhookPayload;

    if (payload.type !== 'INSERT' || payload.table !== 'bathroom_access_codes') {
      return jsonResponse(200, {
        success: true,
        skipped: true,
      });
    }

    const bathroomId = payload.record.bathroom_id;
    const submittingUserId = payload.record.submitted_by;

    if (!bathroomId || !submittingUserId) {
      return jsonResponse(400, {
        error: 'Webhook payload is missing required bathroom access code fields.',
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const [bathroomResult, subscribersResult] = await Promise.all([
      supabase.from('bathrooms').select('place_name').eq('id', bathroomId).maybeSingle(),
      supabase.rpc('get_subscribers_for_bathroom', {
        p_bathroom_id: bathroomId,
      }),
    ]);

    if (bathroomResult.error) {
      throw bathroomResult.error;
    }

    if (subscribersResult.error) {
      throw subscribersResult.error;
    }

    if (!bathroomResult.data) {
      return jsonResponse(404, {
        error: 'Bathroom not found.',
      });
    }

    const tokens = ((subscribersResult.data ?? []) as SubscriberRow[])
      .filter((subscriber) => subscriber.user_id !== submittingUserId)
      .map((subscriber) => subscriber.push_token)
      .filter((token) => token.length > 0);

    if (!tokens.length) {
      return jsonResponse(200, {
        success: true,
        sent: 0,
      });
    }

    const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens,
        title: `New code for ${bathroomResult.data.place_name}`,
        body: 'A saved bathroom just received a new community-submitted access code.',
        data: {
          type: 'favorite_update',
          bathroom_id: bathroomId,
          route: `/bathroom/${bathroomId}`,
        },
      }),
    });

    if (!pushResponse.ok) {
      const errorBody = await pushResponse.text();
      throw new Error(`Push dispatch failed with ${pushResponse.status}: ${errorBody}`);
    }

    const pushDispatchResult = await pushResponse.json();

    return jsonResponse(200, {
      success: true,
      sent: tokens.length,
      result: pushDispatchResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to notify favorite subscribers.';

    console.error('[notify-favorite-update]', message);

    return jsonResponse(500, {
      success: false,
      error: message,
    });
  }
});
