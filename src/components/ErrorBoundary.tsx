import React, { ErrorInfo, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Sentry } from '@/lib/sentry';
import { isProductionEnv } from '@/constants/config';
import { getActiveScreen } from '@/utils/active-screen-tracker';
import {
  buildBugReportPayload,
  generateIdempotencyKey,
  readOrCreateDeviceId,
  submitBugReport,
} from '@/api/bug-reports';
import { offlineQueue } from '@/lib/offline-queue';
import { getSupabaseClient } from '@/lib/supabase';

const IS_BETA = !isProductionEnv;

interface ErrorBoundaryProps {
  children: ReactNode;
}

type SubmitPhase = 'idle' | 'submitting' | 'submitted' | 'error' | 'queued';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  capturedScreenName: string;
  idempotencyKey: string;
  userComment: string;
  submitPhase: SubmitPhase;
  submitErrorMessage: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
      capturedScreenName: 'unknown',
      idempotencyKey: '',
      userComment: '',
      submitPhase: 'idle',
      submitErrorMessage: null,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      capturedScreenName: getActiveScreen(),
      idempotencyKey: generateIdempotencyKey(),
      userComment: '',
      submitPhase: 'idle',
      submitErrorMessage: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    this.setState({ componentStack: errorInfo.componentStack ?? null });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      componentStack: null,
      capturedScreenName: 'unknown',
      idempotencyKey: '',
      userComment: '',
      submitPhase: 'idle',
      submitErrorMessage: null,
    });
  };

  private handleSubmit = async (): Promise<void> => {
    this.setState({ submitPhase: 'submitting', submitErrorMessage: null });

    const deviceId = await readOrCreateDeviceId();

    const payload = buildBugReportPayload({
      deviceId,
      errorMessage: this.state.error?.message ?? 'Unknown error',
      errorStack: this.state.error?.stack ?? null,
      componentStack: this.state.componentStack,
      screenName: this.state.capturedScreenName,
      userComment: this.state.userComment,
      idempotencyKey: this.state.idempotencyKey,
    });

    const result = await submitBugReport(payload);

    if (result.success) {
      this.setState({ submitPhase: 'submitted' });
      return;
    }

    // Terminal errors (400, 413, 429, not authenticated): don't queue, show error.
    if (result.isTerminal) {
      this.setState({
        submitPhase: 'error',
        submitErrorMessage: result.error?.message ?? 'Could not submit report.',
      });
      return;
    }

    // Transient error (network, timeout, 5xx): try to queue for later.
    try {
      const {
        data: { session },
      } = await getSupabaseClient().auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        await offlineQueue.enqueue('bug_report', payload, userId);
        this.setState({ submitPhase: 'queued' });
      } else {
        this.setState({
          submitPhase: 'error',
          submitErrorMessage: 'No network connection. Sign in to queue reports for later.',
        });
      }
    } catch {
      this.setState({
        submitPhase: 'error',
        submitErrorMessage: 'Could not save report for later. Please try again.',
      });
    }
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Production: keep existing minimal screen.
    if (!IS_BETA) {
      return (
        <View className="flex-1 justify-center bg-surface-base px-6 py-10">
          <View className="rounded-[28px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black text-ink-900">Something broke at launch.</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              StallPass hit an unexpected client-side error. You can retry the screen without losing
              your place.
            </Text>
            {this.state.error?.message ? (
              <Text className="mt-4 rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-700">
                {this.state.error.message}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={this.handleReset}
              className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-brand-600 px-4 py-3"
            >
              <Text className="text-base font-semibold text-white">Retry App Shell</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // Beta: submitted confirmation.
    if (this.state.submitPhase === 'submitted' || this.state.submitPhase === 'queued') {
      return (
        <View className="flex-1 justify-center bg-surface-base px-6 py-10">
          <View className="rounded-[28px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black text-ink-900">
              {this.state.submitPhase === 'queued' ? 'Report Saved' : 'Report Received'}
            </Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              {this.state.submitPhase === 'queued'
                ? "You're offline — we saved your report and will send it when you reconnect."
                : 'Thanks for reporting this, Beta Pioneer.'}
            </Text>
            <View className="mt-5 rounded-2xl bg-brand-50 px-4 py-3">
              <Text className="text-sm leading-5 text-brand-700">
                You're helping build StallPass — your name will be part of its story.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={this.handleReset}
              className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-brand-600 px-4 py-3"
            >
              <Text className="text-base font-semibold text-white">Return to App</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // Beta: bug report form.
    const isSubmitting = this.state.submitPhase === 'submitting';

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-surface-base"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-[28px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-3xl font-black text-ink-900">Something went wrong</Text>
            <Text className="mt-3 text-base leading-6 text-ink-600">
              StallPass hit an unexpected error. Help us fix it by describing what you were doing.
            </Text>

            {this.state.error?.message ? (
              <Text className="mt-4 rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-700">
                {this.state.error.message}
              </Text>
            ) : null}

            <Text className="mt-5 text-sm font-semibold text-ink-800">
              What were you doing when this happened?
            </Text>
            <TextInput
              className="mt-2 min-h-[100px] rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-base text-ink-900"
              multiline
              textAlignVertical="top"
              placeholder="e.g. I tapped on a bathroom pin and then..."
              placeholderTextColor="#9CA3AF"
              value={this.state.userComment}
              onChangeText={(text) => this.setState({ userComment: text })}
              editable={!isSubmitting}
              maxLength={1000}
            />

            {this.state.submitPhase === 'error' && this.state.submitErrorMessage ? (
              <Text className="mt-3 text-sm text-red-600">{this.state.submitErrorMessage}</Text>
            ) : null}

            <View className="mt-5 rounded-2xl bg-brand-50 px-4 py-3">
              <Text className="text-sm leading-5 text-brand-700">
                You're helping build StallPass — your name will be part of its story.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={this.handleSubmit}
              disabled={isSubmitting}
              className={`mt-6 min-h-[52px] flex-row items-center justify-center rounded-2xl px-4 py-3 ${
                isSubmitting ? 'bg-brand-400' : 'bg-brand-600'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
              ) : null}
              <Text className="text-base font-semibold text-white">
                {isSubmitting ? 'Sending...' : 'Submit a Bug'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={this.handleReset}
              disabled={isSubmitting}
              className="mt-3 min-h-[44px] items-center justify-center"
            >
              <Text className="text-sm font-medium text-ink-500">Skip & return to app</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
}
