import { getSupabaseClient } from '@/lib/supabase';

interface DataExportResult {
  success: boolean;
  exported_at?: string;
  data?: Record<string, unknown>;
  error?: string;
}

export async function exportMyData(): Promise<{ data: DataExportResult | null; error: string | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('export_my_data' as never);

    if (error) {
      return { data: null, error: error.message };
    }

    const result = data as DataExportResult | null;

    if (!result?.success) {
      return { data: null, error: result?.error ?? 'Unable to export your data right now.' };
    }

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
