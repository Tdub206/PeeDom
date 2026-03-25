import React, { ErrorInfo, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sentry } from '@/lib/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View className="flex-1 justify-center bg-surface-base px-6 py-10">
        <View className="rounded-[28px] border border-surface-strong bg-surface-card p-6">
          <Text className="text-3xl font-black text-ink-900">Something broke at launch.</Text>
          <Text className="mt-3 text-base leading-6 text-ink-600">
            Pee-Dom hit an unexpected client-side error. You can retry the screen without losing your place.
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
}
