import type { Metadata } from 'next';
import './globals.css';

// Deliberate: we use the native system-ui stack instead of
// next/font/google. Pulling Inter at build time requires outbound
// network to Google Fonts, which breaks hermetic CI/sandbox builds.
// The Tailwind `font-sans` utility already maps to the same stack
// via tailwind.config.ts.

export const metadata: Metadata = {
  title: {
    default: 'StallPass Business',
    template: '%s · StallPass Business',
  },
  description:
    'Manage your StallPass listings, hours, coupons, access codes, and featured placements. Changes sync instantly to the StallPass mobile app.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-base font-sans text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
