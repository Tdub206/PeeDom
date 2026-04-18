'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Building2,
  DoorOpen,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Sparkles,
  Tag,
} from 'lucide-react';

type SidebarIcon = 'hub' | 'locations' | 'coupons' | 'codes' | 'analytics' | 'featured' | 'claims';

export interface SidebarNavItem {
  href: '/hub' | '/locations' | '/coupons' | '/codes' | '/analytics' | '/featured' | '/claims';
  icon: SidebarIcon;
  label: string;
}

const SIDEBAR_ICONS: Record<SidebarIcon, LucideIcon> = {
  hub: LayoutDashboard,
  locations: Building2,
  coupons: Tag,
  codes: DoorOpen,
  analytics: BarChart3,
  featured: Sparkles,
  claims: FileText,
};

export function SidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto p-3">
      {items.map((item) => {
        const Icon = SIDEBAR_ICONS[item.icon];
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-600 hover:bg-surface-base hover:text-ink-900'
            }`}
          >
            <span className={isActive ? 'text-brand-700' : 'text-ink-500'}>
              <Icon size={18} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
