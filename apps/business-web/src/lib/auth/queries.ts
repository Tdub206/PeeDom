import type { BusinessWebDatabase } from '../supabase/database';
import type { BusinessSupabaseClient } from '../supabase/server';

export type CurrentUserProfile = Pick<
  BusinessWebDatabase['public']['Tables']['profiles']['Row'],
  'id' | 'role'
> & {
  full_name: string | null;
};

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
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
    .overrideTypes<BusinessWebDatabase['public']['Tables']['profiles']['Row'], { merge: false }>();

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
