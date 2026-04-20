import { z } from 'zod';
import { importedLocationVerificationResultSchema, parseSupabaseNullableRow } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import type { ImportedLocationVerificationInput } from '@/types';

type ImportedLocationVerificationResult = z.infer<typeof importedLocationVerificationResultSchema>;

interface VerificationError extends Error {
  code?: string;
  nextAllowedAt?: string | null;
}

interface ImportedLocationVerificationResponse {
  data: ImportedLocationVerificationResult | null;
  error: VerificationError | null;
}

function toAppError(
  error: { message: string; code?: string; nextAllowedAt?: string | null },
  fallbackMessage: string
): VerificationError {
  const appError = new Error(error.message || fallbackMessage) as VerificationError;

  if (/AUTH_REQUIRED/i.test(error.message)) {
    appError.code = 'AUTH_REQUIRED';
  } else if (/BATHROOM_NOT_FOUND/i.test(error.message)) {
    appError.code = 'BATHROOM_NOT_FOUND';
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

function mapResultError(result: ImportedLocationVerificationResult): VerificationError | null {
  if (result.success) {
    return null;
  }

  const errorCode = (result.error ?? 'imported_location_verification_failed').toUpperCase();
  const fallbackMessage =
    result.error === 'cooldown_active'
      ? 'You recently verified this imported location.'
      : result.error === 'imported_location_required'
        ? 'Only imported bathrooms can use this verification flow.'
        : 'Unable to save this imported location check.';

  return toAppError(
    {
      code: errorCode,
      message: fallbackMessage,
      nextAllowedAt: result.next_allowed_at,
    },
    fallbackMessage
  );
}

export async function verifyImportedBathroomLocation(
  input: ImportedLocationVerificationInput
): Promise<ImportedLocationVerificationResponse> {
  try {
    const { data, error } = await getSupabaseClient().rpc('verify_imported_bathroom_location' as never, {
      p_bathroom_id: input.bathroom_id,
      p_location_exists: input.location_exists,
      p_note: input.note?.trim() || null,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to save this imported location check.'),
      };
    }

    const parsedResult = parseSupabaseNullableRow(
      importedLocationVerificationResultSchema,
      data,
      'imported location verification result',
      'Unable to save this imported location check.'
    );

    if (parsedResult.error) {
      return {
        data: null,
        error: toAppError(parsedResult.error, 'Unable to save this imported location check.'),
      };
    }

    if (!parsedResult.data) {
      return {
        data: null,
        error: toAppError(
          {
            code: 'IMPORTED_LOCATION_VERIFICATION_EMPTY',
            message: 'Unable to save this imported location check.',
          },
          'Unable to save this imported location check.'
        ),
      };
    }

    const parsedData = parsedResult.data as ImportedLocationVerificationResult;
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
        error instanceof Error ? error : new Error('Unable to save this imported location check.'),
        'Unable to save this imported location check.'
      ),
    };
  }
}
