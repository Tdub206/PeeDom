import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
            StallPass Business
          </div>
          <h1 className="text-3xl font-black tracking-tight text-ink-900">
            Sign in to your hub
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Manage hours, coupons, and featured placements. Changes sync instantly to the
            StallPass mobile app.
          </p>
        </div>

        <div className="rounded-4xl border border-surface-strong bg-surface-card p-8 shadow-card">
          <LoginFormWrapper searchParams={searchParams} />
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          Don&apos;t have a claim yet?{' '}
          <Link href="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
            Start by claiming a bathroom in the mobile app
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

async function LoginFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const resolved = await searchParams;
  return <LoginForm nextPath={resolved.next} initialError={resolved.error} />;
}
