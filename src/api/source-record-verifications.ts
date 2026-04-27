import { z } from 'zod';
import { parseSupabaseNullableRow, sourceRecordVerificationResultSchema } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import type { SourceRecordVerificationInput } from '@/types';

type SourceRecordVerificationResult = z.infer<typeof sourceRecordVerificationResultSchema>;

interface VerificationError extends Error {
  code?: string;
  nextAllowedAt?: string | null;
}

interface SourceRecordVerificationResponse {
  data: SourceRecordVerificationResult | null;
  error: VerificationError | null;
}

function toAppError(
  error: { message: string; code?: string; nextAllowedAt?: string | null },
  fallbackMessage: string
): VerificationError {
  const appError = new Error(error.message || fallbackMessage) as VerificationError;

  if (/AUTH_REQUIRED/i.test(error.message)) {
    appError.code = 'AUTH_REQUIRED';
  } else if (/SOURCE_RECORD_NOT_FOUND/i.test(error.message)) {
    appError.code = 'SOURCE_RECORD_NOT_FOUND';
  } else if (/INVALID_LOCATION_VERIFICATION_NOTE/i.test(error.message)) {
    appError.code = 'INVALID_LOCATION_VERIFICATION_NOTE';
  } else {
    appError.code = error.code;
  }

  if (typeof error.nextAllowedAt === 'string' || error.nextAllowedAt === null) {
    appError.nextAllowedAt = error.nextAllowedAt;
  }

  return appError;
}

function mapResultError(result: SourceRecordVerificationResult): VerificationError | null {
  if (result.success) {
    return null;
  }

  const errorCode = (result.error ?? 'source_record_verification_failed').toUpperCase();
  const fallbackMessage =
    result.error === 'cooldown_active'
      ? 'You recently verified this source candidate.'
      : 'Unable to save this source candidate check.';

  return toAppError(
    {
      code: errorCode,
      message: fallbackMessage,
      nextAllowedAt: result.next_allowed_at,
    },
    fallbackMessage
  );
}

export async function verifySourceRecordLocation(
  input: SourceRecordVerificationInput
): Promise<SourceRecordVerificationResponse> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'verify_bathroom_source_record' as never,
      {
        p_source_record_id: input.source_record_id,
        p_location_exists: input.location_exists,
        p_note: input.note?.trim() || null,
      } as never
    );

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to save this source candidate check.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      sourceRecordVerificationResultSchema,
      data,
      'source candidate verification result',
      'Unable to save this source candidate check.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: toAppError(parsedResult.error, 'Unable to save this source candidate check.'),
      };
    }

    if (!parsedResult.data) {
      return {
        data: null,
        error: toAppError(
          {
            code: 'SOURCE_RECORD_VERIFICATION_EMPTY',
            message: 'Unable to save this source candidate check.',
          },
          'Unable to save this source candidate check.'
        ),
      };
    }

    const parsedData = parsedResult.data as SourceRecordVerificationResult;
    const resultError = mapResultError(parsedData);

    if (resultError) {
      return {
        data: parsedData,
        error: resultError,
      };
    }

    return {
      data: parsedData,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to save this source candidate check.'),
        'Unable to save this source candidate check.'
      ),
    };
  }
}
