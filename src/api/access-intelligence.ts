/**
 * Thin wrappers around the Access Intelligence RPCs and Edge Functions.
 *
 * Every call is routed through `getSupabaseClient()` or `invokeEdgeFunction`
 * — there is deliberately no new API wrapper class. This is enforced by the
 * project-wide rule to maintain a single Supabase client surface.
 */

import { getSupabaseClient } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edge-functions';
import type {
  AccessIntelligenceEventInput,
  BathroomPrediction,
  BatchEventEnvelope,
  BusinessAnalyticsResult,
  BusinessClaimApprovedResult,
  BusinessClaimPendingResult,
  UserTrustTier,
  VerifyAccessCodeInput,
  VerifyAccessCodeResult,
} from '@/types/access-intelligence';

interface AccessIntelligenceError extends Error {
  code?: string;
  status?: number | null;
}

function toError(err: unknown, fallback: string): AccessIntelligenceError {
  if (err instanceof Error) {
    return Object.assign(err, { code: (err as AccessIntelligenceError).code });
  }
  const e = new Error(fallback) as AccessIntelligenceError;
  return e;
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  return session?.access_token ?? null;
}

export interface AccessIntelligenceResult<TData> {
  data: TData | null;
  error: AccessIntelligenceError | null;
}

export async function verifyAccessCode(
  input: VerifyAccessCodeInput
): Promise<AccessIntelligenceResult<VerifyAccessCodeResult>> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { data: null, error: toError(new Error('Not authenticated'), 'Not authenticated') };
    }

    const response = await invokeEdgeFunction<{ result: VerifyAccessCodeResult }>({
      functionName: 'verify-access-code',
      accessToken,
      method: 'POST',
      headers: input.deviceFingerprint
        ? { 'X-Device-Fingerprint': input.deviceFingerprint }
        : undefined,
      body: {
        bathroom_id: input.bathroomId,
        action: input.action,
        reported_code: input.reportedCode ?? null,
        device_fingerprint: input.deviceFingerprint ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
    });

    if (response.error) {
      return { data: null, error: response.error as AccessIntelligenceError };
    }

    return {
      data: response.data?.result ?? null,
      error: null,
    };
  } catch (err) {
    return { data: null, error: toError(err, 'Unable to verify access code right now.') };
  }
}

export async function logAccessIntelligenceEvent(
  event: AccessIntelligenceEventInput
): Promise<AccessIntelligenceResult<{ event_id: string | null; inserted: number }>> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { data: null, error: toError(new Error('Not authenticated'), 'Not authenticated') };
    }

    const response = await invokeEdgeFunction<{ event_id?: string; inserted: number }>({
      functionName: 'log-event',
      accessToken,
      method: 'POST',
      headers: event.deviceFingerprint
        ? { 'X-Device-Fingerprint': event.deviceFingerprint }
        : undefined,
      body: {
        event_type: event.eventType,
        bathroom_id: event.bathroomId ?? null,
        payload: event.payload ?? {},
        latitude: event.latitude ?? null,
        longitude: event.longitude ?? null,
        session_id: event.sessionId ?? null,
        device_fingerprint: event.deviceFingerprint ?? null,
      },
    });

    if (response.error) {
      return { data: null, error: response.error as AccessIntelligenceError };
    }

    return {
      data: {
        event_id: response.data?.event_id ?? null,
        inserted: response.data?.inserted ?? 1,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toError(err, 'Unable to log event right now.') };
  }
}

export async function logAccessIntelligenceEventsBatch(
  events: AccessIntelligenceEventInput[]
): Promise<AccessIntelligenceResult<{ inserted: number }>> {
  try {
    if (events.length === 0) {
      return { data: { inserted: 0 }, error: null };
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { data: null, error: toError(new Error('Not authenticated'), 'Not authenticated') };
    }

    const envelope: BatchEventEnvelope = {
      events: events.map((event) => ({
        event_type: event.eventType,
        bathroom_id: event.bathroomId ?? null,
        payload: event.payload ?? {},
        latitude: event.latitude ?? null,
        longitude: event.longitude ?? null,
        session_id: event.sessionId ?? null,
        device_fingerprint: event.deviceFingerprint ?? null,
      })),
    };

    const response = await invokeEdgeFunction<{ inserted: number }>({
      functionName: 'log-event',
      accessToken,
      method: 'POST',
      body: envelope,
    });

    if (response.error) {
      return { data: null, error: response.error as AccessIntelligenceError };
    }

    return {
      data: { inserted: response.data?.inserted ?? envelope.events.length },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toError(err, 'Unable to log events right now.') };
  }
}

export async function fetchBathroomPredictions(
  bathroomId: string
): Promise<AccessIntelligenceResult<BathroomPrediction>> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_bathroom_predictions' as never, {
      p_bathroom_id: bathroomId,
    } as never);

    if (error) {
      return { data: null, error: toError(error, 'Unable to load bathroom predictions right now.') };
    }

    return { data: (data ?? null) as BathroomPrediction | null, error: null };
  } catch (err) {
    return { data: null, error: toError(err, 'Unable to load bathroom predictions right now.') };
  }
}

export async function fetchUserTrustTier(): Promise<AccessIntelligenceResult<UserTrustTier>> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_user_trust_tier' as never);

    if (error) {
      return { data: null, error: toError(error, 'Unable to load trust tier right now.') };
    }

    return { data: (data ?? null) as UserTrustTier | null, error: null };
  } catch (err) {
    return { data: null, error: toError(err, 'Unable to load trust tier right now.') };
  }
}

export async function requestBusinessClaim(
  businessId: string,
  contactEmail: string
): Promise<AccessIntelligenceResult<BusinessClaimPendingResult>> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { data: null, error: toError(new Error('Not authenticated'), 'Not authenticated') };
    }

    const response = await invokeEdgeFunction<BusinessClaimPendingResult>({
      functionName: 'business-claim-email',
      accessToken,
      method: 'POST',
      body: {
        business_id: businessId,
        contact_email: contactEmail,
      },
    });

    if (response.error) {
      return { data: null, error: response.error as AccessIntelligenceError };
    }

    return { data: response.data ?? null, error: null };
  } catch (err) {
    return { data: null, error: toError(err, 'Unable to request business claim right now.') };
  }
}

export async function verifyBusinessClaim(
  businessId: string,
  verificationCode: string
): Promise<AccessIntelligenceResult<BusinessClaimApprovedResult>> {
  try {
    const { data, error } = await getSupabaseClient().rpc('verify_business_claim' as never, {
      p_business_id: businessId,
      p_verification_code: verificationCode,
    } as never);

    if (error) {
      return { data: null, error: toError(error, 'Unable to verify business claim right now.') };
    }

    return { data: (data ?? null) as BusinessClaimApprovedResult | null, error: null };
  } catch (err) {
    return { data: null, error: toError(err, 'Unable to verify business claim right now.') };
  }
}

export async function updateBusinessProfile(
  businessId: string,
  patch: Record<string, unknown>
): Promise<AccessIntelligenceResult<Record<string, unknown>>> {
  try {
    const { data, error } = await getSupabaseClient().rpc('update_business_profile' as never, {
      p_business_id: businessId,
      p_patch: patch,
    } as never);

    if (error) {
      return { data: null, error: toError(error, 'Unable to update business profile right now.') };
    }

    return { data: (data ?? null) as Record<string, unknown> | null, error: null };
  } catch (err) {
    return { data: null, error: toError(err, 'Unable to update business profile right now.') };
  }
}

export async function fetchBusinessAnalytics(
  businessId: string
): Promise<AccessIntelligenceResult<BusinessAnalyticsResult>> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_business_analytics' as never, {
      p_business_id: businessId,
    } as never);

    if (error) {
      return { data: null, error: toError(error, 'Unable to load business analytics right now.') };
    }

    return { data: (data ?? null) as BusinessAnalyticsResult | null, error: null };
  } catch (err) {
    return { data: null, error: toError(err, 'Unable to load business analytics right now.') };
  }
}
