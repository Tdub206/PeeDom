import { getSupabaseClient } from '@/lib/supabase';

export async function sendKudos(
  bathroomId: string,
  message?: string,
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await getSupabaseClient().rpc(
      'send_business_kudos' as never,
      {
        p_bathroom_id: bathroomId,
        p_message: message ?? null,
      } as never,
    );

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error('Failed to send kudos'),
    };
  }
}

export async function fetchKudosCount(
  bathroomId: string,
): Promise<{ count: number; error: Error | null }> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      'get_bathroom_kudos_count' as never,
      { p_bathroom_id: bathroomId } as never,
    );

    if (error) {
      return { count: 0, error: new Error(error.message) };
    }

    return { count: (data as unknown as number) ?? 0, error: null };
  } catch (err) {
    return {
      count: 0,
      error: err instanceof Error ? err : new Error('Failed to fetch kudos count'),
    };
  }
}
