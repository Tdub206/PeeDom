'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Building2,
  DoorOpen,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Tag,
} from 'lucide-react';

interface DashboardNavProps {
  pendingClaimsCount: number;
}

interface NavItem {
  href: string;
  label: string;
  section: string | null;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/hub',
    label: 'Overview',
    section: null,
    icon: <LayoutDashboard size={18} />,
  },
  {
    href: '/locations',
    label: 'Locations',
    section: 'Manage',
    icon: <Building2 size={18} />,
  },
  {
    href: '/analytics',
    label: 'Analytics',
    section: null,
    icon: <BarChart3 size={18} />,
  },
  {
    href: '/coupons',
    label: 'Coupons',
    section: null,
    icon: <Tag size={18} />,
  },
  {
    href: '/codes',
    label: 'Access codes',
    section: null,
    icon: <DoorOpen size={18} />,
  },
  {
    href: '/featured',
    label: 'Featured',
    section: 'Grow',
    icon: <Sparkles size={18} />,
  },
  {
    href: '/claims',
    label: 'Claim history',
    section: null,
    icon: <FileText size={18} />,
  },
  {
    href: '/settings',
    label: 'Settings',
    section: 'Account',
    icon: <Settings size={18} />,
  },
];

export function DashboardNav({ pendingClaimsCount }: DashboardNavProps) {
  const pathname = usePathname();
  let lastSection: string | null = null;

  return (
    <nav className="flex-1 overflow-y-auto p-3">
      {NAV_ITEMS.map((item) => {
        const showSection = item.section !== null && item.section !== lastSection;
        lastSection = item.section ?? lastSection;
        const isActive = isPathActive(pathname, item.href);

        return (
          <div key={item.href}>
            {showSection ? (
              <div className="px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[1.5px] text-ink-400">
                {item.section}
              </div>
            ) : null}

            <Link
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-600 hover:bg-surface-base hover:text-ink-900'
              }`}
            >
              <span className={isActive ? 'text-brand-600' : 'text-ink-500'}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === '/claims' && pendingClaimsCount > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-danger px-2 py-1 text-[10px] font-bold uppercase tracking-[1px] text-white">
                  {pendingClaimsCount}
                </span>
              ) : null}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

function isPathActive(pathname: string, href: string): boolean {
  if (href === '/hub') {
    return pathname === '/hub';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
