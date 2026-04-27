'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getApprovedLocationById } from '@/lib/business/queries';
import type { BusinessWebDatabase } from '@/lib/supabase/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const createFeaturedCampaignSchema = z
  .object({
    bathroom_id: z.string().uuid('Pick a location before launching.'),
    placement_type: z.enum(['search_top', 'map_priority', 'nearby_featured'], {
      required_error: 'Select a placement type.',
    }),
    start_date: z
      .string()
      .min(1, 'Enter a start date.')
      .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid start date.'),
    end_date: z
      .string()
      .min(1, 'Enter an end date.')
      .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid end date.'),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    path: ['end_date'],
    message: 'End date must be after start date.',
  });

export type CreateFeaturedCampaignInput = z.infer<typeof createFeaturedCampaignSchema>;
export type CreateFeaturedCampaignResult = { ok: true } | { ok: false; error: string };

type FeaturedPlacementInsert =
  BusinessWebDatabase['public']['Tables']['business_featured_placements']['Insert'];

interface FeaturedPlacementInsertBuilder {
  insert(values: FeaturedPlacementInsert): Promise<{
    error: { message: string } | null;
  }>;
}

interface FeaturedPlacementTableClient {
  from(table: 'business_featured_placements'): FeaturedPlacementInsertBuilder;
}

export async function createFeaturedCampaign(
  input: unknown
): Promise<CreateFeaturedCampaignResult> {
  const parsed = createFeaturedCampaignSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Check the form and try again.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Your session expired. Sign in again and retry.' };
  }

  const ownership = await getApprovedLocationById(supabase, user.id, parsed.data.bathroom_id);

  if (ownership.error) {
    return { ok: false, error: 'Unable to verify this location right now.' };
  }

  if (!ownership.location) {
    return { ok: false, error: "We couldn't find that location on your account." };
  }

  const featuredClient = supabase as unknown as FeaturedPlacementTableClient;
  const { error } = await featuredClient.from('business_featured_placements').insert({
    bathroom_id: parsed.data.bathroom_id,
    business_user_id: user.id,
    placement_type: parsed.data.placement_type,
    geographic_scope: {},
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    status: 'active',
  });

  if (error) {
    return { ok: false, error: 'Failed to create the campaign. Try again in a moment.' };
  }

  revalidatePath('/featured');

  return { ok: true };
}
