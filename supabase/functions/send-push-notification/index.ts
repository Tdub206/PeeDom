import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

interface PushPayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_MESSAGES_PER_BATCH = 100;

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

function isExpoPushToken(token: string): boolean {
  const normalizedToken = token.trim();
  return normalizedToken.startsWith('ExpoPushToken[') || normalizedToken.startsWith('ExponentPushToken[');
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function sendBatch(tokens: string[], payload: Omit<PushPayload, 'tokens'>): Promise<ExpoPushTicket[]> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      tokens.map((token) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        badge: payload.badge ?? 0,
        sound: 'default',
        priority: 'high',
      }))
    ),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Expo push API responded with ${response.status}: ${body}`);
  }

  const parsedBody = (await response.json()) as { data?: ExpoPushTicket[] };
  return parsedBody.data ?? [];
}

function collectInvalidTokens(tokens: string[], tickets: ExpoPushTicket[]): string[] {
  const invalidTokens: string[] = [];

  tickets.forEach((ticket, index) => {
    if (ticket.status !== 'error') {
      return;
    }

    const errorCode = ticket.details?.error;

    if (errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidCredentials') {
      const token = tokens[index];

      if (token) {
        invalidTokens.push(token);
      }
    }
  });

  return invalidTokens;
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

    const payload = (await request.json()) as PushPayload;
    const validTokens = (payload.tokens ?? []).map((token) => token.trim()).filter(isExpoPushToken);

    if (!validTokens.length) {
      return jsonResponse(200, {
        success: true,
        sent: 0,
        invalidated: 0,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const tickets: ExpoPushTicket[] = [];
    const invalidTokens = new Set<string>();

    for (const tokenBatch of chunkArray(validTokens, MAX_MESSAGES_PER_BATCH)) {
      const batchTickets = await sendBatch(tokenBatch, {
        title: payload.title,
        body: payload.body,
        data: payload.data,
        badge: payload.badge,
      });

      batchTickets.forEach((ticket) => tickets.push(ticket));
      collectInvalidTokens(tokenBatch, batchTickets).forEach((token) => invalidTokens.add(token));
    }

    if (invalidTokens.size > 0) {
      const { error } = await supabase
        .from('profiles')
        .update({
          push_token: null,
          updated_at: new Date().toISOString(),
        })
        .in('push_token', Array.from(invalidTokens));

      if (error) {
        console.error('[send-push-notification] Unable to clear invalid push tokens:', error.message);
      }
    }

    return jsonResponse(200, {
      success: true,
      sent: validTokens.length,
      invalidated: invalidTokens.size,
      tickets,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send push notifications.';

    console.error('[send-push-notification]', message);

    return jsonResponse(500, {
      success: false,
      error: message,
    });
  }
});
