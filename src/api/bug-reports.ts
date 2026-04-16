import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getSupabaseClient } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edge-functions';
import type { BugReportMutationPayload } from '@/types';
import {
  sanitizeComment,
  sanitizeErrorMessage,
  sanitizeStack,
} from '@/utils/bug-report-helpers';

export { generateIdempotencyKey } from '@/utils/bug-report-helpers';

export function buildBugReportPayload(options: {
  errorMessage: string;
  errorStack: string | null;
  componentStack: string | null;
  screenName: string;
  userComment: string;
  idempotencyKey: string;
}): BugReportMutationPayload {
  return {
    schema_version: 1,
    idempotency_key: options.idempotencyKey,
    screen_name: options.screenName,
    error_message: sanitizeErrorMessage(options.errorMessage),
    error_stack: sanitizeStack(options.errorStack),
    component_stack: sanitizeStack(options.componentStack),
    user_comment: sanitizeComment(options.userComment),
    app_version: Constants.expoConfig?.version ?? '',
    os_name: Device.osName ?? '',
    os_version: Device.osVersion ?? '',
    device_model: Device.modelName ?? '',
    captured_at: new Date().toISOString(),
    sentry_event_id: null,
  };
}

export interface SubmitBugReportResult {
  success: boolean;
  error: Error | null;
  isTerminal: boolean;
}

export async function submitBugReport(
  payload: BugReportMutationPayload
): Promise<SubmitBugReportResult> {
  try {
    const {
      data: { session },
    } = await getSupabaseClient().auth.getSession();

    const accessToken = session?.access_token;

    if (!accessToken) {
      return { success: false, error: new Error('Not authenticated'), isTerminal: true };
    }

    const response = await invokeEdgeFunction<{ success: boolean }>({
      functionName: 'submit-bug-report',
      accessToken,
      method: 'POST',
      body: payload,
    });

    if (response.error) {
      const status = response.status ?? 0;
      const isTerminal = status === 400 || status === 413 || status === 429;
      return { success: false, error: response.error, isTerminal };
    }

    return { success: true, error: null, isTerminal: false };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      isTerminal: false,
    };
  }
}
