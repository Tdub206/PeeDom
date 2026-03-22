import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc,
  }),
}));

describe('reports API', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('creates bathroom reports through the hardened RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        report_id: 'report-1',
        created_at: '2026-03-20T12:00:00.000Z',
      },
      error: null,
    });

    const { createBathroomReport } = await import('@/api/reports');
    const result = await createBathroomReport('user-1', {
      bathroom_id: 'bathroom-1',
      report_type: 'wrong_code',
      notes: '  Old code on the door  ',
    });

    expect(result.error).toBeNull();
    expect(result.data?.report_id).toBe('report-1');
    expect(rpc).toHaveBeenCalledWith('create_bathroom_report', {
      p_bathroom_id: 'bathroom-1',
      p_report_type: 'wrong_code',
      p_notes: 'Old code on the door',
    });
  });

  it('maps duplicate open reports into stable app codes', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'P0001',
        message: 'REPORT_ALREADY_OPEN',
      },
    });

    const { createBathroomReport } = await import('@/api/reports');
    const result = await createBathroomReport('user-1', {
      bathroom_id: 'bathroom-1',
      report_type: 'wrong_code',
    });

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('REPORT_ALREADY_OPEN');
  });
});
