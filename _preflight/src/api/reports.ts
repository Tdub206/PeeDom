import { DbReport, ReportCreate } from '@/types';
import { getSupabaseClient } from '@/lib/supabase';

interface ReportMutationResponse {
  data: DbReport | null;
  error: (Error & { code?: string }) | null;
}

function toAppError(error: { message: string; code?: string }, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = error.code;
  return appError;
}

export async function createBathroomReport(
  userId: string,
  reportInput: ReportCreate
): Promise<ReportMutationResponse> {
  try {
    const notes = reportInput.notes?.trim() || null;
    const { data, error } = await getSupabaseClient()
      .from('bathroom_reports')
      .insert({
        bathroom_id: reportInput.bathroom_id,
        reported_by: userId,
        report_type: reportInput.report_type,
        notes,
      } as never)
      .select('*')
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to submit this report.'),
      };
    }

    return {
      data: (data as DbReport | null) ?? null,
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
