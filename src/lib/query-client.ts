import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { config } from '@/constants/config';
import { Sentry } from '@/lib/sentry';

function serializeKey(key: readonly unknown[] | undefined): string {
  try {
    return JSON.stringify(key ?? []);
  } catch (_e) {
    return '[unserializable-query-key]';
  }
}

function captureReactQueryError(
  source: 'mutation' | 'query',
  error: unknown,
  context: {
    key: readonly unknown[] | undefined;
    status: string;
  }
): void {
  const normalizedError = error instanceof Error ? error : new Error('Unknown React Query error.');

  Sentry.captureException(normalizedError, {
    tags: {
      source: `react-query:${source}`,
      status: context.status,
    },
    extra: {
      key: serializeKey(context.key),
    },
  });
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      captureReactQueryError('mutation', error, {
        key: mutation.options.mutationKey,
        status: mutation.state.status,
      });
    },
  }),
  queryCache: new QueryCache({
    onError: (error, query) => {
      captureReactQueryError('query', error, {
        key: query.queryKey,
        status: query.state.status,
      });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: config.query.staleTime,
      gcTime: config.query.gcTime,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
