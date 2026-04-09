import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface-base font-sans text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
