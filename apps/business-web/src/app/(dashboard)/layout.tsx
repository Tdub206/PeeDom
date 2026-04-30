import { redirect } from 'next/navigation';
import {
  LogOut,
} from 'lucide-react';
import { getCurrentUserProfile } from '../../lib/auth/queries';
import { getApprovedLocations, getPendingClaimsCount } from '../../lib/business/queries';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { DashboardNav } from './dashboard-nav';
import { DashboardTopbar } from './dashboard-topbar';
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

  const [profile, { count: pendingClaimsCount }, { locations }] = await Promise.all([
    getCurrentUserProfile(supabase),
    getPendingClaimsCount(supabase, user.id),
    getApprovedLocations(supabase, user.id),
  ]);

  const displayName = profile?.full_name || user.email || 'Business owner';
  const initials = getInitials(displayName);

  // Compact business context injected into the AI assistant system prompt.
  const businessContext = buildBusinessContext(displayName, user.email ?? '', locations);

  return (
    <div className="flex min-h-screen bg-surface-base">
      <aside className="sticky top-0 flex h-screen w-[260px] flex-col border-r border-surface-strong bg-surface-card">
        <div className="border-b border-surface-strong px-6 py-6">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
            StallPass
          </div>
          <div className="mt-1 text-xl font-black tracking-tight text-ink-900">Business Hub</div>
        </div>

        <DashboardNav pendingClaimsCount={pendingClaimsCount} />

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

      <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
        <DashboardTopbar
          initials={initials}
          pendingClaimsCount={pendingClaimsCount}
          businessContext={businessContext}
        />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'SP';
}

function buildBusinessContext(
  displayName: string,
  email: string,
  locations: Awaited<ReturnType<typeof getApprovedLocations>>['locations']
): string {
  const locationLines =
    locations.length === 0
      ? '  - No approved locations yet'
      : locations
          .map((loc) => {
            const parts = [
              `  - ${loc.place_name} (${loc.address})`,
              loc.weekly_views > 0 ? `${loc.weekly_views} weekly views` : null,
              loc.avg_cleanliness > 0 ? `cleanliness ${loc.avg_cleanliness.toFixed(1)}/5` : null,
              loc.active_offer_count > 0 ? `${loc.active_offer_count} active coupon(s)` : null,
              loc.open_reports > 0 ? `${loc.open_reports} open report(s)` : null,
            ].filter(Boolean);
            return parts.join(', ');
          })
          .join('\n');

  return [
    `Business owner: ${displayName} (${email})`,
    `Approved locations (${locations.length}):`,
    locationLines,
  ].join('\n');
}
