import type {
  EarlyAdopterInvite,
  GenerateInviteInput,
  GenerateInviteResult,
  RedeemInviteResult,
} from '@/types';
import {
  earlyAdopterInviteSchema,
  generateInviteResultSchema,
  redeemInviteResultSchema,
  parseSupabaseRows,
  parseSupabaseNullableRow,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

interface ApiErrorShape {
  code?: string;
  message: string;
}

function toAppError(error: ApiErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

export async function generateEarlyAdopterInvite(input: GenerateInviteInput): Promise<{
  data: GenerateInviteResult | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'generate_early_adopter_invite' as never,
      {
        p_target_business_name: input.target_business_name ?? null,
        p_target_email: input.target_email ?? null,
        p_notes: input.notes ?? null,
        p_expiry_days: input.expiry_days ?? 30,
      } as never
    );

    if (error) {
      return { data: null, error: toAppError(error, 'Unable to generate invite right now.') };
    }

    const parsed = parseSupabaseNullableRow(
      generateInviteResultSchema,
      data,
      'early adopter invite',
      'Unable to generate invite right now.'
    );

    if (parsed.error) {
      return { data: null, error: parsed.error };
    }

    return { data: parsed.data as GenerateInviteResult | null, error: null };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to generate invite right now.'),
        'Unable to generate invite right now.'
      ),
    };
  }
}

export async function redeemEarlyAdopterInvite(inviteToken: string): Promise<{
  data: RedeemInviteResult | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'redeem_early_adopter_invite' as never,
      { p_invite_token: inviteToken } as never
    );

    if (error) {
      return { data: null, error: toAppError(error, 'Unable to redeem invite code.') };
    }

    const parsed = parseSupabaseNullableRow(
      redeemInviteResultSchema,
      data,
      'invite redemption',
      'Unable to redeem invite code.'
    );

    if (parsed.error) {
      return { data: null, error: parsed.error };
    }

    return { data: parsed.data as RedeemInviteResult | null, error: null };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to redeem invite code.'),
        'Unable to redeem invite code.'
      ),
    };
  }
}

export async function fetchEarlyAdopterInvites(statusFilter?: string): Promise<{
  data: EarlyAdopterInvite[];
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'fetch_early_adopter_invites' as never,
      { p_status_filter: statusFilter ?? null } as never
    );

    if (error) {
      return { data: [], error: toAppError(error, 'Unable to load invites right now.') };
    }

    const parsed = parseSupabaseRows(
      earlyAdopterInviteSchema,
      data,
      'early adopter invites',
      'Unable to load invites right now.'
    );

    if (parsed.error) {
      return { data: [], error: parsed.error };
    }

    return { data: parsed.data as EarlyAdopterInvite[], error: null };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load invites right now.'),
        'Unable to load invites right now.'
      ),
    };
  }
}
