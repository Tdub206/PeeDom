import { z } from 'zod';
import { ReportCreate } from '@/types';
import { bathroomReportResultSchema, parseSupabaseNullableRow } from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';

type BathroomReportResult = z.infer<typeof bathroomReportResultSchema>;

interface ReportMutationResponse {
  data: BathroomReportResult | null;
  error: (Error & { code?: string }) | null;
}

function toAppError(error: { message: string; code?: string }, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  if (/AUTH_REQUIRED/i.test(error.message)) {
    appError.code = 'AUTH_REQUIRED';
  } else if (/BATHROOM_NOT_FOUND/i.test(error.message)) {
    appError.code = 'BATHROOM_NOT_FOUND';
  } else if (/INVALID_REPORT_TYPE/i.test(error.message)) {
    appError.code = 'INVALID_REPORT_TYPE';
  } else if (/INVALID_REPORT_NOTES/i.test(error.message)) {
    appError.code = 'INVALID_REPORT_NOTES';
  } else if (/REPORT_ALREADY_OPEN/i.test(error.message)) {
    appError.code = 'REPORT_ALREADY_OPEN';
  } else {
    appError.code = error.code;
  }
  return appError;
}

export async function createBathroomReport(
  _userId: string,
  reportInput: ReportCreate
): Promise<ReportMutationResponse> {
  try {
    const notes = reportInput.notes?.trim() || null;
    const { data, error } = await getSupabaseClient().rpc('create_bathroom_report' as never, {
      p_bathroom_id: reportInput.bathroom_id,
      p_report_type: reportInput.report_type,
      p_notes: notes,
    } as never);

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to submit this report.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      bathroomReportResultSchema,
      data,
      'bathroom report result',
      'Unable to submit this report.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as BathroomReportResult | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to submit this report.'),
        'Unable to submit this report.'
      ),
    };
  }
}
