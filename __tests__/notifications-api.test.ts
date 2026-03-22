import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const maybeSingle: jest.MockedFunction<() => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const from: jest.MockedFunction<(table: string) => unknown> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from,
    rpc,
  }),
}));

describe('notifications API', () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
    maybeSingle.mockReset();
  });

  it('loads the current bathroom live status', async () => {
    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const gt = jest.fn().mockReturnThis();
    const order = jest.fn().mockReturnThis();
    const limit = jest.fn().mockReturnThis();

    maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'status-1',
        bathroom_id: 'bathroom-1',
        reported_by: 'user-1',
        status: 'clean',
        note: null,
        expires_at: '2026-03-16T15:00:00.000Z',
        created_at: '2026-03-16T13:00:00.000Z',
      },
      error: null,
    });

    from.mockReturnValueOnce({
      select,
      eq,
      gt,
      order,
      limit,
      maybeSingle,
    });

    const { fetchCurrentBathroomStatus } = await import('@/api/notifications');
    const result = await fetchCurrentBathroomStatus('bathroom-1');

    expect(result.error).toBeNull();
    expect(result.data?.status).toBe('clean');
  });

  it('reports bathroom live status through the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        success: true,
      },
      error: null,
    });

    const { reportBathroomStatus } = await import('@/api/notifications');
    const result = await reportBathroomStatus({
      bathroomId: 'bathroom-1',
      status: 'dirty',
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('report_bathroom_status', {
      p_bathroom_id: 'bathroom-1',
      p_status: 'dirty',
      p_note: null,
    });
  });

  it('passes live status notes through the RPC payload', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        success: true,
      },
      error: null,
    });

    const { reportBathroomStatus } = await import('@/api/notifications');
    const result = await reportBathroomStatus({
      bathroomId: 'bathroom-2',
      status: 'long_wait',
      note: 'Line out the door.',
    });

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('report_bathroom_status', {
      p_bathroom_id: 'bathroom-2',
      p_status: 'long_wait',
      p_note: 'Line out the door.',
    });
  });

  it('surfaces RPC failure codes from notification setting updates', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        success: false,
        error: 'invalid_notification_pref_key',
        key: 'bogus_setting',
      },
      error: null,
    });

    const { updateNotificationSettings } = await import('@/api/notifications');
    const result = await updateNotificationSettings({
      notificationPrefs: {
        favorite_update: false,
      },
    });

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('invalid_notification_pref_key');
  });
});
