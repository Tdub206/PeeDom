import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edge-functions';
import { supabaseRuntimeConfig } from '@/lib/supabase-config';
import { storage } from '@/lib/storage';
import type { BugReportMutationPayload } from '@/types';
import {
  sanitizeComment,
  sanitizeErrorMessage,
  sanitizeStack,
} from '@/utils/bug-report-helpers';

export { generateIdempotencyKey } from '@/utils/bug-report-helpers';

// ---------------------------------------------------------------------------
// Device ID — stable per-device identifier for rate limiting.
// Prefers the existing analytics anonymous ID, falls back to a dedicated key.
// ---------------------------------------------------------------------------

export async function readOrCreateDeviceId(): Promise<string> {
  try {
    const analyticsId = await AsyncStorage.getItem(storage.keys.ANALYTICS_ANONYMOUS_ID);

    if (analyticsId) {
      return analyticsId;
    }

    const existingGuestId = await AsyncStorage.getItem(storage.keys.BUG_REPORT_GUEST_ID);

    if (existingGuestId) {
      return existingGuestId;
    }

    const newId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(storage.keys.BUG_REPORT_GUEST_ID, newId);
    return newId;
  } catch {
    return `guest_fallback_${Date.now()}`;
  }
}

// ---------------------------------------------------------------------------
// Payload builder
// ---------------------------------------------------------------------------

export function buildBugReportPayload(options: {
  deviceId: string;
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
    device_id: options.deviceId,
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

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

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

    if (session?.access_token) {
      // Authenticated path — full edge function invocation with user JWT.
      const response = await invokeEdgeFunction<{ success: boolean }>({
        functionName: 'submit-bug-report',
        accessToken: session.access_token,
        method: 'POST',
        body: payload,
      });

      if (response.error) {
        const status = response.status ?? 0;
        const isTerminal = status === 400 || status === 413 || status === 429;
        return { success: false, error: response.error, isTerminal };
      }

      return { success: true, error: null, isTerminal: false };
    }

    // Guest path — no JWT, submit with anon key only. Edge function stores user_id = null.
    const { supabaseUrl, supabaseAnonKey } = supabaseRuntimeConfig;
    const edgeUrl = `${supabaseUrl}/functions/v1/submit-bug-report`;

    const resp = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const isTerminal = resp.status === 400 || resp.status === 413 || resp.status === 429;
      return {
        success: false,
        error: new Error(`Bug report submission failed: HTTP ${resp.status}`),
        isTerminal,
      };
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
