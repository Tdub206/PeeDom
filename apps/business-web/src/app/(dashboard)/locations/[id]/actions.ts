'use server';

import { revalidatePath } from 'next/cache';
import { getApprovedLocationById } from '@/lib/business/queries';
import { updateBusinessBathroomSettingsSchema } from '@/lib/business/schemas';
import type { BusinessWebDatabase } from '@/lib/supabase/database';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UpsertBusinessBathroomSettingsResult =
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
