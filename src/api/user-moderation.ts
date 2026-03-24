import { getSupabaseClient } from '@/lib/supabase';

type UserReportReason = 'spam' | 'harassment' | 'false_info' | 'impersonation' | 'inappropriate_content' | 'other';

interface RpcResult {
  success: boolean;
  error?: string;
}

function parseRpcResult(data: unknown): RpcResult {
  if (typeof data === 'object' && data !== null && 'success' in data) {
    return data as RpcResult;
  }
  return { success: false, error: 'unexpected_response' };
}

export async function reportUser(
  reportedUserId: string,
  reason: UserReportReason,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('report_user' as never, {
      p_reported_user_id: reportedUserId,
      p_reason: reason,
      p_notes: notes ?? null,
    } as never);

    if (error) {
      return { success: false, error: error.message };
    }

    return parseRpcResult(data);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function blockUser(blockedUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('block_user' as never, {
      p_blocked_user_id: blockedUserId,
    } as never);

    if (error) {
      return { success: false, error: error.message };
    }

    return parseRpcResult(data);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function unblockUser(blockedUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await getSupabaseClient().rpc('unblock_user' as never, {
      p_blocked_user_id: blockedUserId,
    } as never);

    if (error) {
      return { success: false, error: error.message };
    }

    return parseRpcResult(data);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function fetchBlockedUsers(): Promise<{ data: string[]; error?: string }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('user_blocks')
      .select('blocked_user_id');

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data ?? []).map((row: { blocked_user_id: string }) => row.blocked_user_id) };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
