import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Root route just bounces the visitor to the right place based on
// their auth state. Marketing lives on the static ../../web/ site.
export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/hub');
  }
  redirect('/login');
}
