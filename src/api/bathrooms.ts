import { supabase } from '@/lib/supabase';
import type { Database } from '@/types';

export type PublicBathroomDetailRow = Database['public']['Views']['v_bathroom_detail_public']['Row'];

export async function fetchBathroomDetailById(
  bathroomId: string
): Promise<{ data: PublicBathroomDetailRow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('v_bathroom_detail_public')
      .select('*')
      .eq('id', bathroomId)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: new Error(error.message),
      };
    }

    if (!data) {
      return {
        data: null,
        error: new Error('That bathroom could not be found.'),
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to load bathroom details.'),
    };
  }
}
