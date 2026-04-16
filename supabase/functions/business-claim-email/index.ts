import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_BODY_BYTES = 8_192;

const jsonHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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

function optionalEnv(name: string): string | null {
  const value = Deno.env.get(name)?.trim();
  return value && value.length > 0 ? value : null;
}

async function dispatchVerificationEmail(
  recipient: string,
  businessName: string,
  code: string,
  expiresAt: string
): Promise<{ delivered: boolean; provider: string }> {
  const sendgridKey = optionalEnv('SENDGRID_API_KEY');
  const fromAddress = optionalEnv('CLAIM_FROM_EMAIL') ?? 'no-reply@stallpass.app';

  const subject = `Verify your claim for ${businessName}`;
  const bodyText =
    `Your StallPass business verification code is: ${code}\n\n` +
    `It expires at ${expiresAt}.\n\n` +
    `If you did not request this, you can ignore this email.`;

  if (sendgridKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: fromAddress },
          subject,
          content: [{ type: 'text/plain', value: bodyText }],
        }),
      });
      if (!response.ok) {
        console.error('sendgrid_send_failed', response.status, await response.text());
        return { delivered: false, provider: 'sendgrid' };
      }
      return { delivered: true, provider: 'sendgrid' };
    } catch (err) {
      console.error('sendgrid_send_error', err);
      return { delivered: false, provider: 'sendgrid' };
    }
  }

  // Dev / staging fallback: log-only. Non-production environments rely on this
  // branch so local developers can copy the code out of function logs.
  console.log('[business-claim-email] simulated dispatch', {
    recipient,
    businessName,
    code,
    expiresAt,
  });
  return { delivered: true, provider: 'log' };
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

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const businessId =
    typeof body.business_id === 'string' && body.business_id.length > 0
      ? body.business_id
      : null;
  const contactEmail =
    typeof body.contact_email === 'string' && body.contact_email.length > 0
      ? body.contact_email.trim().toLowerCase()
      : null;

  if (!businessId || !contactEmail) {
    return jsonResponse({ error: 'Missing business_id or contact_email' }, 400);
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

  const { data, error } = await supabase.rpc('request_business_claim', {
    p_business_id: businessId,
    p_contact_email: contactEmail,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  const claim = (data ?? {}) as {
    claim_id?: string;
    verification_code?: string;
    verification_expires_at?: string;
    business_id?: string;
    email_domain?: string;
    contact_email?: string;
  };

  if (!claim.verification_code || !claim.verification_expires_at) {
    return jsonResponse({ error: 'Claim pending response was malformed' }, 500);
  }

  const { data: businessRow } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', businessId)
    .maybeSingle();

  const businessName = businessRow?.name ?? 'your business';

  const dispatch = await dispatchVerificationEmail(
    contactEmail,
    businessName,
    claim.verification_code,
    claim.verification_expires_at
  );

  // Strip the plaintext code before returning to the caller. Only the email
  // recipient should ever see it.
  return jsonResponse({
    status: 'pending_verification',
    claim_id: claim.claim_id,
    business_id: claim.business_id,
    email_domain: claim.email_domain,
    email_delivered: dispatch.delivered,
    email_provider: dispatch.provider,
    verification_expires_at: claim.verification_expires_at,
  });
});
