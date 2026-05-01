'use server';

import { revalidatePath } from 'next/cache';
import { getApprovedLocationById } from '@/lib/business/queries';
import {
  updateBusinessBathroomSettingsSchema,
  updateBusinessRestroomMetadataSchema,
} from '@/lib/business/schemas';
import type { BusinessWebDatabase } from '@/lib/supabase/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UpsertBusinessBathroomSettingsResult =
  | { ok: true }
  | { ok: false; error: string };

export type UpsertBusinessRestroomMetadataResult =
  | { ok: true }
  | { ok: false; error: string };

interface UpsertBusinessBathroomSettingsRpcClient {
  rpc(
    fn: 'upsert_business_bathroom_settings',
    args: BusinessWebDatabase['public']['Functions']['upsert_business_bathroom_settings']['Args']
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

interface UpsertBusinessRestroomMetadataRpcClient {
  rpc(
    fn: 'upsert_business_restroom_metadata',
    args: BusinessWebDatabase['public']['Functions']['upsert_business_restroom_metadata']['Args']
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

export async function upsertBusinessBathroomSettings(
  input: unknown
): Promise<UpsertBusinessBathroomSettingsResult> {
  const parsedInput = updateBusinessBathroomSettingsSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      error: parsedInput.error.issues[0]?.message ?? 'Check your settings and try again.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: 'Your session expired. Sign in again and retry.',
    };
  }

  const verifiedLocation = await getApprovedLocationById(
    supabase,
    user.id,
    parsedInput.data.bathroom_id
  );

  if (verifiedLocation.error) {
    return {
      ok: false,
      error: 'Unable to verify this location right now. Try again in a moment.',
    };
  }

  if (!verifiedLocation.location) {
    return {
      ok: false,
      error: "We couldn't find that location.",
    };
  }

  const normalizedInput = {
    ...parsedInput.data,
    show_on_free_map: parsedInput.data.requires_premium_access
      ? parsedInput.data.show_on_free_map
      : true,
  };

  const { error } = await (supabase as unknown as UpsertBusinessBathroomSettingsRpcClient).rpc(
    'upsert_business_bathroom_settings',
    {
      p_bathroom_id: normalizedInput.bathroom_id,
      p_requires_premium_access: normalizedInput.requires_premium_access,
      p_show_on_free_map: normalizedInput.show_on_free_map,
      p_is_location_verified: normalizedInput.is_location_verified,
      p_is_locked: normalizedInput.is_locked,
    }
  );

  if (error) {
    return {
      ok: false,
      error: 'Unable to save StallPass settings right now. Try again in a moment.',
    };
  }

  revalidatePath('/locations/[id]', 'page');
  revalidatePath('/locations');
  revalidatePath('/hub');

  return { ok: true };
}

export async function upsertBusinessRestroomMetadata(
  input: unknown
): Promise<UpsertBusinessRestroomMetadataResult> {
  const parsedInput = updateBusinessRestroomMetadataSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      error: parsedInput.error.issues[0]?.message ?? 'Check your restroom metadata and try again.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: 'Your session expired. Sign in again and retry.',
    };
  }

  const verifiedLocation = await getApprovedLocationById(
    supabase,
    user.id,
    parsedInput.data.bathroom_id
  );

  if (verifiedLocation.error) {
    return {
      ok: false,
      error: 'Unable to verify this location right now. Try again in a moment.',
    };
  }

  if (!verifiedLocation.location) {
    return {
      ok: false,
      error: "We couldn't find that location.",
    };
  }

  const { error } = await (supabase as unknown as UpsertBusinessRestroomMetadataRpcClient).rpc(
    'upsert_business_restroom_metadata',
    {
      p_bathroom_id: parsedInput.data.bathroom_id,
      p_has_toilet_paper: parsedInput.data.has_toilet_paper,
      p_has_soap: parsedInput.data.has_soap,
      p_has_hand_dryer: parsedInput.data.has_hand_dryer,
      p_has_paper_towels: parsedInput.data.has_paper_towels,
      p_has_changing_table: parsedInput.data.has_changing_table,
      p_has_family_restroom: parsedInput.data.has_family_restroom,
      p_is_gender_neutral: parsedInput.data.is_gender_neutral,
      p_is_single_user: parsedInput.data.is_single_user,
      p_is_private_room: parsedInput.data.is_private_room,
      p_stall_count: parsedInput.data.stall_count,
      p_privacy_level: parsedInput.data.privacy_level,
      p_access_type: parsedInput.data.access_type,
      p_code_required: parsedInput.data.code_required,
      p_key_required: parsedInput.data.key_required,
      p_customer_only: parsedInput.data.customer_only,
      p_ask_employee: parsedInput.data.ask_employee,
      p_medical_urgency_friendly: parsedInput.data.medical_urgency_friendly,
      p_child_friendly: parsedInput.data.child_friendly,
      p_outdoor_traveler_reliable: parsedInput.data.outdoor_traveler_reliable,
      p_wheelchair_accessible: parsedInput.data.wheelchair_accessible,
      p_door_clear_width_inches: parsedInput.data.door_clear_width_inches,
      p_turning_space_inches: parsedInput.data.turning_space_inches,
      p_stall_width_inches: parsedInput.data.stall_width_inches,
      p_stall_depth_inches: parsedInput.data.stall_depth_inches,
      p_has_grab_bars: parsedInput.data.has_grab_bars,
      p_has_accessible_sink: parsedInput.data.has_accessible_sink,
      p_has_step_free_access: parsedInput.data.has_step_free_access,
      p_has_power_door: parsedInput.data.has_power_door,
      p_accessibility_notes: parsedInput.data.accessibility_notes,
    }
  );

  if (error) {
    return {
      ok: false,
      error: 'Unable to save verified restroom metadata right now. Try again in a moment.',
    };
  }

  revalidatePath('/locations/[id]', 'page');
  revalidatePath('/locations');
  revalidatePath('/hub');

  return { ok: true };
}
