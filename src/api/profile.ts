import { z } from 'zod';
import { displayNameSchema } from '@/lib/validators';
import {
  deactivateAccountResultSchema,
  parseSupabaseNullableRow,
  profileMutationResultSchema,
} from '@/lib/supabase-parsers';
import { invokeEdgeFunction } from '@/lib/edge-functions';
import { getSupabaseClient } from '@/lib/supabase';
import { DeactivateAccountResult, DeleteAccountResult, DisplayNameUpdateResult } from '@/types';

interface AppErrorShape {
  code?: string;
  message: string;
}

function normalizeProfileErrorCode(error: { message?: string; code?: string } | Error): string | undefined {
  const errorMessage = error.message ?? '';

  if (/AUTH_REQUIRED|not_authenticated/i.test(errorMessage)) {
    return 'not_authenticated';
  }

  if (/name_too_short/i.test(errorMessage)) {
    return 'name_too_short';
  }

  if (/name_too_long/i.test(errorMessage)) {
    return 'name_too_long';
  }

  if (/rate_limited/i.test(errorMessage)) {
    return 'rate_limited';
  }

  if (/account_deactivated/i.test(errorMessage)) {
    return 'account_deactivated';
  }

  return 'code' in error ? error.code : undefined;
}

function toAppError(error: AppErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = normalizeProfileErrorCode(error);
  return appError;
}

function buildProfileMutationError(errorCode: string | undefined, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(fallbackMessage) as Error & { code?: string };
  appError.code = errorCode;
  return appError;
}

const deleteAccountEdgeFunctionResultSchema = z.object({
  success: z.literal(true),
  warning: z.string().nullable().optional(),
});

export async function updateDisplayName(
  displayName: string
): Promise<{ data: DisplayNameUpdateResult | null; error: (Error & { code?: string }) | null }> {
  try {
    const normalizedDisplayName = displayNameSchema.parse(displayName);
    const { data, error } = await getSupabaseClient().rpc('update_display_name' as never, {
      p_display_name: normalizedDisplayName,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to update your display name right now.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      profileMutationResultSchema,
      data,
      'display name update result',
      'Unable to update your display name right now.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: parsedResult.error,
      };
    }

    if (!parsedResult.data) {
      return {
        data: null,
        error: buildProfileMutationError('unknown_error', 'Unable to update your display name right now.'),
      };
    }

    return {
      data: parsedResult.data as DisplayNameUpdateResult,
      error: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = new Error(error.issues[0]?.message ?? 'Invalid display name.') as Error & { code?: string };
      validationError.code = 'invalid_display_name';
      return {
        data: null,
        error: validationError,
      };
    }

    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to update your display name right now.'),
        'Unable to update your display name right now.'
      ),
    };
  }
}

export async function deactivateAccount(): Promise<{
  data: DeactivateAccountResult | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const { data, error } = await getSupabaseClient().rpc('deactivate_account' as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to deactivate your account right now.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      deactivateAccountResultSchema,
      data,
      'deactivate account result',
      'Unable to deactivate your account right now.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: parsedResult.error,
      };
    }

    if (!parsedResult.data) {
      return {
        data: null,
        error: buildProfileMutationError('unknown_error', 'Unable to deactivate your account right now.'),
      };
    }

    if (!parsedResult.data.success) {
      return {
        data: null,
        error: buildProfileMutationError(parsedResult.data.error, 'Unable to deactivate your account right now.'),
      };
    }

    return {
      data: parsedResult.data as DeactivateAccountResult,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to deactivate your account right now.'),
        'Unable to deactivate your account right now.'
      ),
    };
  }
}

export async function deleteAccount(): Promise<{
  data: DeleteAccountResult | null;
  error: (Error & { code?: string }) | null;
}> {
  try {
    const {
      data: { session },
    } = await getSupabaseClient().auth.getSession();

    if (!session) {
      return {
        data: null,
        error: buildProfileMutationError('not_authenticated', 'You must be signed in to delete your account.'),
      };
    }

    const response = await invokeEdgeFunction<unknown>({
      functionName: 'delete-account',
      accessToken: session.access_token,
      method: 'POST',
    });

    if (response.error) {
      return {
        data: null,
        error: toAppError(response.error, 'Unable to delete your account right now.'),
      };
    }

    const parsedResult = deleteAccountEdgeFunctionResultSchema.safeParse(response.data);

    if (!parsedResult.success) {
      return {
        data: null,
        error: buildProfileMutationError('invalid_response', 'Unable to delete your account right now.'),
      };
    }

    return {
      data: {
        success: true,
        warning: parsedResult.data.warning ?? null,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to delete your account right now.'),
        'Unable to delete your account right now.'
      ),
    };
  }
}
