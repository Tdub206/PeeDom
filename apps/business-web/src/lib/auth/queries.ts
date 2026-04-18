import type { BusinessWebDatabase } from '@/lib/supabase/database';
import type { BusinessSupabaseClient } from '@/lib/supabase/server';

export type CurrentUserProfile = Pick<
  BusinessWebDatabase['public']['Tables']['profiles']['Row'],
  'id' | 'role'
> & {
  full_name: string | null;
};

type CurrentUserProfileRow = Pick<
  BusinessWebDatabase['public']['Tables']['profiles']['Row'],
  'id' | 'display_name' | 'role'
>;

export async function getCurrentUserProfile(
  supabase: BusinessSupabaseClient
): Promise<CurrentUserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', user.id)
    .maybeSingle()
    .overrideTypes<CurrentUserProfileRow, { merge: false }>();

  if (error) {
    return null;
  }

  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    full_name: profile.display_name,
    role: profile.role,
  };
}
