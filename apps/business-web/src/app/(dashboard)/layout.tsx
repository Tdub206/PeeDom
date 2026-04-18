import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { getCurrentUserProfile } from '@/lib/auth/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SidebarNav, type SidebarNavItem } from './sidebar-nav';
import { SignOutButton } from './sign-out-button';

// Server-component shell for all authenticated pages. Loads the
// current user once and hydrates the sidebar + topbar. Individual
// pages can re-fetch what they need per-request.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The middleware should have already redirected, but belt + braces.
  if (!user) {
    redirect('/login');
  }

  const profile = await getCurrentUserProfile(supabase);
  const displayName = profile?.full_name || user.email || 'Business owner';
  const initials = getInitials(displayName);
  const sidebarItems: SidebarNavItem[] = [
    { href: '/hub', icon: 'hub', label: 'Overview' },
    { href: '/locations', icon: 'locations', label: 'Locations' },
    { href: '/coupons', icon: 'coupons', label: 'Coupons' },
    { href: '/codes', icon: 'codes', label: 'Access codes' },
    { href: '/analytics', icon: 'analytics', label: 'Analytics' },
    { href: '/featured', icon: 'featured', label: 'Featured' },
    { href: '/claims', icon: 'claims', label: 'Claim history' },
  ];

  return (
    <div className="flex min-h-screen bg-surface-base">
      <aside className="sticky top-0 flex h-screen w-[260px] flex-col border-r border-surface-strong bg-surface-card">
        <div className="border-b border-surface-strong px-6 py-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
            StallPass
          </div>
          <div className="mt-1 text-xl font-black tracking-tight text-ink-900">Business Hub</div>
        </div>

        <SidebarNav items={sidebarItems} />

        <div className="border-t border-surface-strong px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink-900">{displayName}</div>
              <div className="truncate text-[11px] uppercase tracking-[1px] text-ink-500">
                {profile?.role ?? 'business'}
              </div>
            </div>
            <SignOutButton>
              <LogOut size={16} />
            </SignOutButton>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'SP';
}
