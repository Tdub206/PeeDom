/**
 * mutation-registry.ts — Mutation Registry
 *
 * Single source of truth for every queueable mutation type.
 * Each entry owns:
 *   - payloadSchema   Zod validator for the payload (validates before queue write)
 *   - executor        Async function that performs the Supabase call
 *   - invalidationKeys  Query keys to invalidate after successful replay
 *   - optimisticUpdate  Optional function to apply an optimistic cache update
 *
 * Adding a new mutation type: add entry here, update MutationType in types/index.ts.
 */

import { z } from 'zod';
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MutationType } from '@/types';

// ── Optimistic snapshot shape ─────────────────────────────────────────────────

export interface OptimisticSnapshot {
  queryKey: readonly unknown[];
  previousData: unknown;
}

// ── Registry entry shape ──────────────────────────────────────────────────────

export interface RegistryEntry<TPayload = unknown> {
  /** Validate the payload before writing to queue or executing */
  payloadSchema: z.ZodType<TPayload>;
  /** Execute the mutation for a verified authenticated user */
  executor: (payload: TPayload, userId: string) => Promise<void>;
  /**
   * Query keys to invalidate after successful execution.
   * Called with the payload so keys can be parameterised.
   */
  invalidationKeys: (payload: TPayload, userId: string) => readonly (readonly unknown[])[];
  /**
   * Apply an optimistic update before the network call.
   * Returns a snapshot for rollback on failure.
   */
  applyOptimistic?: (
    payload: TPayload,
    userId: string,
    queryClient: QueryClient
  ) => Promise<OptimisticSnapshot[]>;
  /** Roll back optimistic updates using the snapshot from applyOptimistic */
  rollbackOptimistic?: (
    snapshots: OptimisticSnapshot[],
    queryClient: QueryClient
  ) => void;
}

// ── Payload schemas ───────────────────────────────────────────────────────────

const FavoriteAddPayloadSchema = z.object({
  bathroom_id: z.string().uuid(),
});

const FavoriteRemovePayloadSchema = z.object({
  bathroom_id: z.string().uuid(),
});

const CodeVotePayloadSchema = z.object({
  code_id: z.string().uuid(),
  vote: z.union([z.literal(-1), z.literal(1)]),
});

const ReportCreatePayloadSchema = z.object({
  bathroom_id: z.string().uuid(),
  report_type: z.enum([
    'wrong_code',
    'closed',
    'unsafe',
    'duplicate',
    'incorrect_hours',
    'no_restroom',
    'other',
  ]),
  notes: z.string().optional(),
});

const RatingCreatePayloadSchema = z.object({
  bathroom_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  notes: z.string().optional(),
});

// ── Payload type exports (used by mutation hooks) ─────────────────────────────

export type FavoriteAddPayload = z.infer<typeof FavoriteAddPayloadSchema>;
export type FavoriteRemovePayload = z.infer<typeof FavoriteRemovePayloadSchema>;
export type CodeVotePayload = z.infer<typeof CodeVotePayloadSchema>;
export type ReportCreatePayload = z.infer<typeof ReportCreatePayloadSchema>;
export type RatingCreatePayload = z.infer<typeof RatingCreatePayloadSchema>;

// ── Registry ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry: Record<MutationType, RegistryEntry<any>> = {
  favorite_add: {
    payloadSchema: FavoriteAddPayloadSchema,

    async executor(payload: FavoriteAddPayload, userId: string): Promise<void> {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, bathroom_id: payload.bathroom_id });
      if (error) throw new Error(error.message);
    },

    invalidationKeys: (payload: FavoriteAddPayload, userId: string) => [
      ['favorites', userId],
      ['bathroom', payload.bathroom_id],
    ] as const,

    async applyOptimistic(payload: FavoriteAddPayload, userId: string, qc: QueryClient) {
      const key = ['favorites', userId] as const;
      await qc.cancelQueries({ queryKey: key });
      const previousData = qc.getQueryData(key);
      qc.setQueryData(key, (old: string[] = []) => [...old, payload.bathroom_id]);
      return [{ queryKey: key, previousData }];
    },

    rollbackOptimistic(snapshots: OptimisticSnapshot[], qc: QueryClient) {
      for (const { queryKey, previousData } of snapshots) {
        qc.setQueryData(queryKey, previousData);
      }
    },
  },

  favorite_remove: {
    payloadSchema: FavoriteRemovePayloadSchema,

    async executor(payload: FavoriteRemovePayload, userId: string): Promise<void> {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('bathroom_id', payload.bathroom_id);
      if (error) throw new Error(error.message);
    },

    invalidationKeys: (payload: FavoriteRemovePayload, userId: string) => [
      ['favorites', userId],
      ['bathroom', payload.bathroom_id],
    ] as const,

    async applyOptimistic(payload: FavoriteRemovePayload, userId: string, qc: QueryClient) {
      const key = ['favorites', userId] as const;
      await qc.cancelQueries({ queryKey: key });
      const previousData = qc.getQueryData(key);
      qc.setQueryData(key, (old: string[] = []) =>
        old.filter((id) => id !== payload.bathroom_id)
      );
      return [{ queryKey: key, previousData }];
    },

    rollbackOptimistic(snapshots: OptimisticSnapshot[], qc: QueryClient) {
      for (const { queryKey, previousData } of snapshots) {
        qc.setQueryData(queryKey, previousData);
      }
    },
  },

  code_vote: {
    payloadSchema: CodeVotePayloadSchema,

    async executor(payload: CodeVotePayload, userId: string): Promise<void> {
      const { error } = await supabase.from('code_votes').upsert(
        { code_id: payload.code_id, user_id: userId, vote: payload.vote },
        { onConflict: 'code_id,user_id' }
      );
      if (error) throw new Error(error.message);
    },

    invalidationKeys: (payload: CodeVotePayload) => [
      ['code_votes', payload.code_id],
    ] as const,
  },

  report_create: {
    payloadSchema: ReportCreatePayloadSchema,

    async executor(payload: ReportCreatePayload, userId: string): Promise<void> {
      const { error } = await supabase.from('bathroom_reports').insert({
        bathroom_id: payload.bathroom_id,
        reported_by: userId,
        report_type: payload.report_type,
        notes: payload.notes ?? null,
      });
      if (error) throw new Error(error.message);
    },

    invalidationKeys: (payload: ReportCreatePayload) => [
      ['bathroom', payload.bathroom_id],
    ] as const,
  },

  rating_create: {
    payloadSchema: RatingCreatePayloadSchema,

    async executor(payload: RatingCreatePayload, userId: string): Promise<void> {
      const { error } = await supabase.from('cleanliness_ratings').upsert(
        {
          bathroom_id: payload.bathroom_id,
          user_id: userId,
          rating: payload.rating,
          notes: payload.notes ?? null,
        },
        { onConflict: 'bathroom_id,user_id' }
      );
      if (error) throw new Error(error.message);
    },

    invalidationKeys: (payload: RatingCreatePayload) => [
      ['bathroom', payload.bathroom_id],
    ] as const,
  },
};

// ── Public accessor ───────────────────────────────────────────────────────────

export function getRegistryEntry<TPayload>(
  type: MutationType
): RegistryEntry<TPayload> {
  const entry = registry[type];
  if (!entry) throw new Error(`[mutation-registry] Unknown mutation type: ${type}`);
  return entry as RegistryEntry<TPayload>;
}

/** Validate a raw payload against the registry schema for a given type. */
export function validatePayload<TPayload>(
  type: MutationType,
  payload: unknown
): { ok: true; data: TPayload } | { ok: false; error: z.ZodError } {
  const entry = getRegistryEntry<TPayload>(type);
  const result = entry.payloadSchema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error };
}
