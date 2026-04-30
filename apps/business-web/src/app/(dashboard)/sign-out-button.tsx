'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

export function SignOutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.replace('/login');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Sign out"
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-strong bg-surface-card text-ink-600 transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
