import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  DoorOpen,
  FileText,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Tag,
} from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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

  // Fetch the profile row so we can show the user's display name /
  // role. The mobile app stores this in `public.profiles`.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const displayName = profile?.full_name || user.email || 'Business owner';
  const initials = getInitials(displayName);

  return (
    <div className="flex min-h-screen bg-surface-base">
      <aside className="sticky top-0 flex h-screen w-[260px] flex-col border-r border-surface-strong bg-surface-card">
        <div className="border-b border-surface-strong px-6 py-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
            StallPass
          </div>
          <div className="mt-1 text-xl font-black tracking-tight text-ink-900">Business Hub</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <SidebarLink href="/hub" icon={<LayoutDashboard size={18} />}>
            Overview
          </SidebarLink>
          <SidebarLink href="/locations" icon={<Building2 size={18} />}>
            Locations
          </SidebarLink>
          <SidebarLink href="/coupons" icon={<Tag size={18} />}>
            Coupons
          </SidebarLink>
          <SidebarLink href="/codes" icon={<DoorOpen size={18} />}>
            Access codes
          </SidebarLink>
          <SidebarLink href="/analytics" icon={<BarChart3 size={18} />}>
            Analytics
          </SidebarLink>
          <SidebarLink href="/featured" icon={<Sparkles size={18} />}>
            Featured
          </SidebarLink>
          <SidebarLink href="/claims" icon={<FileText size={18} />}>
            Claim history
          </SidebarLink>
        </nav>

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

function SidebarLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-ink-600 transition hover:bg-surface-base hover:text-ink-900"
    >
      <span className="text-ink-500">{icon}</span>
      {children}
    </Link>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'SP';
}
