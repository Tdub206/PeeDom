import { z } from 'zod';
import type { BathroomCodePolicySummary, Database, DbCodeRevealGrant, DbCodeVote } from '@/types';
import {
  bathroomCodeSubmissionResultSchema,
  bathroomCodePolicySummarySchema,
  bathroomAccessCodeSchema,
  codeVoteMutationResultSchema,
  dbCodeRevealGrantSchema,
  dbCodeVoteSchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

export type BathroomAccessCodeRow = Database['public']['Tables']['bathroom_access_codes']['Row'];
export type CodeRevealGrantRow = Database['public']['Tables']['code_reveal_grants']['Row'];
type CodeRevealGrantRpcRow = Database['public']['Functions']['grant_bathroom_code_reveal_access']['Returns'][number];

interface AccessCodeResponse {
  data: BathroomAccessCodeRow | null;
  error: (Error & { code?: string }) | null;
}

type BathroomCodeSubmissionResult = z.infer<typeof bathroomCodeSubmissionResultSchema>;
type CodeVoteMutationResult = z.infer<typeof codeVoteMutationResultSchema>;

interface AccessCodeMutationResponse {
  data: BathroomCodeSubmissionResult | null;
  error: (Error & { code?: string }) | null;
}

interface CodeVoteMutationResponse {
  data: CodeVoteMutationResult | null;
  error: (Error & { code?: string }) | null;
}

function normalizeAppErrorCode(error: { message?: string; code?: string } | Error): string | undefined {
  const errorMessage = error.message ?? '';

  if (/AUTH_REQUIRED/i.test(errorMessage)) {
    return 'AUTH_REQUIRED';
  }

  if (/CODE_REVEAL_NOT_GRANTED/i.test(errorMessage)) {
    return 'CODE_REVEAL_NOT_GRANTED';
  }

  if (/CODE_NOT_AVAILABLE/i.test(errorMessage)) {
    return 'CODE_NOT_AVAILABLE';
  }

  if (/SELF_CODE_VOTE/i.test(errorMessage)) {
    return 'SELF_CODE_VOTE';
  }

  if (/BATHROOM_NOT_FOUND/i.test(errorMessage)) {
    return 'BATHROOM_NOT_FOUND';
  }

  if (/INVALID_CODE_VALUE/i.test(errorMessage)) {
    return 'INVALID_CODE_VALUE';
  }

  if (/CODE_SUBMISSION_COOLDOWN/i.test(errorMessage)) {
    return 'CODE_SUBMISSION_COOLDOWN';
  }

  if (/CODE_SUBMISSION_DISABLED/i.test(errorMessage)) {
    return 'CODE_SUBMISSION_DISABLED';
  }

  if (/INVALID_CODE_POLICY/i.test(errorMessage)) {
    return 'INVALID_CODE_POLICY';
  }

  if (/INVALID_CODE_VOTE/i.test(errorMessage)) {
    return 'INVALID_CODE_VOTE';
  }

  return 'code' in error ? error.code : undefined;
}

function toAppError(error: { message: string; code?: string } | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = normalizeAppErrorCode(error);
  return appError;
}

export async function fetchLatestVisibleBathroomCode(bathroomId: string): Promise<AccessCodeResponse> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_revealed_bathroom_code' as never, {
      p_bathroom_id: bathroomId,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load the current bathroom code.'),
      };
    }

    const parsedData = parseSupabaseRows(
      bathroomAccessCodeSchema,
      data,
      'bathroom access code',
      'Unable to load the current bathroom code.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: (parsedData.data[0] as BathroomAccessCodeRow | undefined) ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load the current bathroom code.'),
        'Unable to load the current bathroom code.'
      ),
    };
  }
}

export async function createBathroomAccessCode(
  _userId: string,
  submission: {
    bathroom_id: string;
    code_value: string;
  }
): Promise<AccessCodeMutationResponse> {
  try {
    const { data, error } = await getSupabaseClient().rpc('submit_bathroom_access_code' as never, {
      p_bathroom_id: submission.bathroom_id,
      p_code_value: submission.code_value.trim(),
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to submit this bathroom code.'),
      };
    }

    const parsedCode = parseSupabaseNullableRow(
      bathroomCodeSubmissionResultSchema,
      data,
      'bathroom access code submission',
      'Unable to submit this bathroom code.'
    );

    if (parsedCode.error) {
      return {
        data: null,
        error: parsedCode.error,
      };
    }

    return {
      data: parsedCode.data as BathroomCodeSubmissionResult | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to submit this bathroom code.'),
        'Unable to submit this bathroom code.'
      ),
    };
  }
}

export async function fetchBathroomCodeRevealAccess(
  bathroomId: string
): Promise<{ data: boolean; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('has_bathroom_code_reveal_access' as never, {
      p_bathroom_id: bathroomId,
    } as never);

    if (error) {
      return {
        data: false,
        error: toAppError(error, 'Unable to check whether this code is unlocked.'),
      };
    }

    return {
      data: Boolean(data),
      error: null,
    };
  } catch (error) {
    return {
      data: false,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to check whether this code is unlocked.'),
        'Unable to check whether this code is unlocked.'
      ),
    };
  }
}

export async function fetchBathroomCodePolicySummary(
  bathroomId: string
): Promise<{ data: BathroomCodePolicySummary | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_bathroom_code_policy' as never, {
      p_bathroom_id: bathroomId,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load this restroom access policy right now.'),
      };
    }

    const parsedRow = parseSupabaseNullableRow(
      bathroomCodePolicySummarySchema,
      Array.isArray(data) ? data[0] ?? null : data,
      'bathroom code policy summary',
      'Unable to load this restroom access policy right now.'
    );

    if (parsedRow.error) {
      return {
        data: null,
        error: parsedRow.error,
      };
    }

    return {
      data: parsedRow.data as BathroomCodePolicySummary | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load this restroom access policy right now.'),
        'Unable to load this restroom access policy right now.'
      ),
    };
  }
}

export async function grantBathroomCodeRevealAccess(
  bathroomId: string
): Promise<{ data: DbCodeRevealGrant | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('grant_bathroom_code_reveal_access' as never, {
      p_bathroom_id: bathroomId,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to unlock this code right now.'),
      };
    }

    const parsedGrantRows = parseSupabaseRows(
      dbCodeRevealGrantSchema,
      data,
      'code reveal grant',
      'Unable to unlock this code right now.'
    );

    if (parsedGrantRows.error) {
      return {
        data: null,
        error: parsedGrantRows.error,
      };
    }

    return {
      data: (parsedGrantRows.data[0] as CodeRevealGrantRpcRow | undefined) ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to unlock this code right now.'),
        'Unable to unlock this code right now.'
      ),
    };
  }
}

export async function fetchUserCodeVote(
  userId: string,
  codeId: string
): Promise<{ data: DbCodeVote | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('code_votes')
      .select('*')
      .eq('user_id', userId)
      .eq('code_id', codeId)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load your verification history for this code.'),
      };
    }

    const parsedVote = parseSupabaseNullableRow(
      dbCodeVoteSchema,
      data,
      'code vote',
      'Unable to load your verification history for this code.'
    );

    if (parsedVote.error) {
      return {
        data: null,
        error: parsedVote.error,
      };
    }

    return {
      data: parsedVote.data as DbCodeVote | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load your verification history for this code.'),
        'Unable to load your verification history for this code.'
      ),
    };
  }
}

export async function upsertCodeVote(
  _userId: string,
  codeId: string,
  vote: -1 | 1
): Promise<CodeVoteMutationResponse> {
  try {
    const { data, error } = await getSupabaseClient().rpc('vote_on_code' as never, {
      p_code_id: codeId,
      p_vote: vote,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to record your code verification right now.'),
      };
    }

    const parsedVote = parseSupabaseNullableRow(
      codeVoteMutationResultSchema,
      data,
      'code vote mutation',
      'Unable to record your code verification right now.'
    );

    if (parsedVote.error) {
      return {
        data: null,
        error: parsedVote.error,
      };
    }

    return {
      data: parsedVote.data as CodeVoteMutationResult | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to record your code verification right now.'),
        'Unable to record your code verification right now.'
      ),
    };
  }
}
