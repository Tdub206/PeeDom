/**
 * useOfflineMutation — Base TanStack Mutation + Offline Queue Bridge
 *
 * Implements the full mutation lifecycle from spec §3:
 *
 *   onMutate:
 *     1. Auth gate — if guest, return auth_required immediately (no optimistic work)
 *     2. Capture userIdAtInvocation
 *     3. Cancel affected queries
 *     4. Snapshot previous cache
 *     5. Apply optimistic update
 *     6. Return context { userIdAtInvocation, snapshots, invalidationKeys }
 *
 *   mutationFn:
 *     - Reads userIdAtInvocation from a ref (populated by onMutate)
 *     - If early auth_required was set, returns it without network call
 *     - Executes registry executor
 *     - On network error: enqueues and returns queued_retry
 *     - On auth/RLS error: returns auth_required (triggers onSuccess rollback)
 *     - On success: returns completed
 *     - On non-retryable error: throws (propagates to onError)
 *
 *   onSuccess (receives MutationOutcome):
 *     - completed: invalidate query keys
 *     - auth_required: rollback optimistic, call refreshUser
 *     - queued_retry: keep optimistic (item is in queue)
 *
 *   onError (only for non-retryable throws):
 *     - Rollback optimistic
 *     - Re-throw so mutation.error is populated for the caller
 *
 *   onSettled:
 *     - Clear any pending UI flags (implemented by caller via callback)
 *
 * The hook always resolves (never rejects) for auth and network failures.
 * Only non-retryable business/validation errors cause mutateAsync to reject.
 */

import { useRef } from 'react';
import { useMutation, useQueryClient, QueryClient, onlineManager } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuthContext } from '@/contexts/AuthProvider';
import { offlineQueue } from '@/lib/offline/offline-queue';
import { getRegistryEntry, OptimisticSnapshot } from '@/lib/offline/mutation-registry';
import { MutationType, MutationOutcome } from '@/types';
import { classifyAuthFailure } from '@/services/auth/AuthService';

// ── Network error detection ───────────────────────────────────────────────────

function isTransientNetworkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('socket hang up')
  );
}

function isAuthOrRlsError(error: unknown): boolean {
  const classification = classifyAuthFailure(error);
  return classification.isAuthError || classification.code === 'rls_violation';
}

// ── Mutation context (passed from onMutate → onSuccess/onError/onSettled) ────

interface MutationContext {
  userIdAtInvocation: string;
  snapshots: OptimisticSnapshot[];
  invalidationKeys: readonly (readonly unknown[])[];
  earlyOutcome: MutationOutcome | null; // set in onMutate for auth_required fast-path
}

// ── Hook options ──────────────────────────────────────────────────────────────

export interface UseOfflineMutationOptions<TPayload> {
  mutationType: MutationType;
  onSuccess?: (outcome: MutationOutcome, payload: TPayload) => void;
  onQueued?: (payload: TPayload) => void;
  onAuthRequired?: () => void;
  onSettled?: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOfflineMutation<TPayload>({
  mutationType,
  onSuccess: onSuccessCallback,
  onQueued,
  onAuthRequired,
  onSettled: onSettledCallback,
}: UseOfflineMutationOptions<TPayload>) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuthContext();
  const isOffline = onlineManager.isOnline() === false;

  // Ref to carry userIdAtInvocation from onMutate → mutationFn
  // (TanStack does not pass context to mutationFn directly)
  const mutationContextRef = useRef<MutationContext | null>(null);

  const entry = getRegistryEntry<TPayload>(mutationType);

  const mutation = useMutation<MutationOutcome, Error, TPayload, MutationContext>({
    // ── onMutate ─────────────────────────────────────────────────────────────
    onMutate: async (payload: TPayload): Promise<MutationContext> => {
      const store = useAuthStore.getState();
      const userId = store.user?.id;

      const baseContext: MutationContext = {
        userIdAtInvocation: userId ?? '',
        snapshots: [],
        invalidationKeys: [],
        earlyOutcome: null,
      };

      // Auth gate — return immediately, no optimistic work
      if (!userId) {
        mutationContextRef.current = { ...baseContext, earlyOutcome: 'auth_required' };
        return mutationContextRef.current;
      }

      // Compute invalidation keys from registry
      const keys = entry.invalidationKeys(payload, userId);

      // Cancel in-flight queries to prevent overwriting optimistic update
      await Promise.all(
        keys.map((key) => queryClient.cancelQueries({ queryKey: key }))
      );

      // Apply optimistic update if registry entry defines one
      let snapshots: OptimisticSnapshot[] = [];
      if (entry.applyOptimistic) {
        snapshots = await entry.applyOptimistic(payload, userId, queryClient);
      }

      const context: MutationContext = {
        userIdAtInvocation: userId,
        snapshots,
        invalidationKeys: keys,
        earlyOutcome: null,
      };

      mutationContextRef.current = context;
      return context;
    },

    // ── mutationFn ────────────────────────────────────────────────────────────
    mutationFn: async (payload: TPayload): Promise<MutationOutcome> => {
      const ctx = mutationContextRef.current;

      // Fast-path: auth gate was triggered in onMutate
      if (ctx?.earlyOutcome) {
        return ctx.earlyOutcome;
      }

      const userId = ctx?.userIdAtInvocation;
      if (!userId) {
        // Defensive: should not happen if onMutate ran correctly
        return 'auth_required';
      }

      // If we know we're offline, enqueue immediately without attempting network
      if (isOffline) {
        const queueId = await offlineQueue.enqueue(mutationType, payload, userId);
        console.log(`[useOfflineMutation] Offline — queued ${queueId}`);
        return 'queued_retry';
      }

      try {
        await entry.executor(payload, userId);
        return 'completed';
      } catch (error) {
        if (isAuthOrRlsError(error)) {
          // Auth/RLS failure — do not enqueue; rollback will happen in onSuccess
          console.warn('[useOfflineMutation] Auth/RLS error:', error);
          return 'auth_required';
        }

        if (isTransientNetworkError(error)) {
          // Transient failure — enqueue for offline replay
          const queueId = await offlineQueue.enqueue(mutationType, payload, userId);
          console.log(`[useOfflineMutation] Network error — queued ${queueId}`);
          return 'queued_retry';
        }

        // Non-retryable business/validation error — propagate to onError
        throw error instanceof Error ? error : new Error(String(error));
      }
    },

    // ── onSuccess ─────────────────────────────────────────────────────────────
    onSuccess: async (outcome: MutationOutcome, payload: TPayload, context) => {
      const ctx = context ?? mutationContextRef.current;

      switch (outcome) {
        case 'completed': {
          // Invalidate query keys declared in the registry
          const keys = ctx?.invalidationKeys ?? entry.invalidationKeys(payload, ctx?.userIdAtInvocation ?? '');
          await Promise.allSettled(
            keys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
          );
          onSuccessCallback?.(outcome, payload);
          break;
        }

        case 'auth_required': {
          // Roll back any optimistic update
          if (ctx?.snapshots && entry.rollbackOptimistic) {
            entry.rollbackOptimistic(ctx.snapshots, queryClient);
          } else if (ctx?.snapshots) {
            rollbackSnapshots(ctx.snapshots, queryClient);
          }
          // Trigger session refresh — may demote to GUEST
          void refreshUser();
          onAuthRequired?.();
          onSuccessCallback?.(outcome, payload);
          break;
        }

        case 'queued_retry': {
          // Optimistic update stays in place — item will replay when back online
          onQueued?.(payload);
          onSuccessCallback?.(outcome, payload);
          break;
        }
      }
    },

    // ── onError (non-retryable business errors only) ──────────────────────────
    onError: (_error: Error, _payload: TPayload, context) => {
      const ctx = context ?? mutationContextRef.current;
      // Rollback optimistic update
      if (ctx?.snapshots && entry.rollbackOptimistic) {
        entry.rollbackOptimistic(ctx.snapshots, queryClient);
      } else if (ctx?.snapshots) {
        rollbackSnapshots(ctx.snapshots, queryClient);
      }
    },

    // ── onSettled ─────────────────────────────────────────────────────────────
    onSettled: () => {
      // Clear pending UI flags only — data is handled in onSuccess/onError
      mutationContextRef.current = null;
      onSettledCallback?.();
    },
  });

  return mutation;
}

// ── Snapshot rollback helper ──────────────────────────────────────────────────

function rollbackSnapshots(snapshots: OptimisticSnapshot[], queryClient: QueryClient): void {
  for (const { queryKey, previousData } of snapshots) {
    queryClient.setQueryData(queryKey, previousData);
  }
}
