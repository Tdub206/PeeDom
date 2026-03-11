import { QueryClient } from '@tanstack/react-query';
import { config } from '@/constants/config';

export const queryClient = new QueryClient({
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
