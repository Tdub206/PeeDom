/**
 * query-client.ts — TanStack QueryClient + NetInfo Online State
 *
 * Wires @react-native-community/netinfo to TanStack's onlineManager so that:
 *   • Query refetch (on reconnect) and custom offline queue flush share the
 *     same network truth source — no divergence between them
 *   • Queries paused due to being offline automatically resume on reconnect
 *
 * The onlineManager subscription is set up once at module load time so it
 * is active for the entire app lifetime without requiring a component mount.
 */

import { QueryClient, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

// ── Wire NetInfo → TanStack onlineManager ────────────────────────────────────

onlineManager.setEventListener((setOnline) => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline =
      state.isConnected === true && state.isInternetReachable !== false;
    setOnline(isOnline);
  });

  // Return the unsubscribe function; TanStack will call it on cleanup
  return unsubscribe;
});

// ── QueryClient ──────────────────────────────────────────────────────────────

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      staleTime: 5 * 60 * 1000,    // 5 minutes
      gcTime: 10 * 60 * 1000,      // 10 minutes
      // networkMode: 'offlineFirst' means queries will be paused (not errored)
      // when offline, and will automatically refetch when NetInfo reports online.
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Mutations use the offline queue for retry — not TanStack's built-in retry
      retry: 0,
      networkMode: 'always',
    },
  },
});
