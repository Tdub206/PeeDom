'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'password' | 'magic-link';

export function LoginForm({
  nextPath,
  initialError,
}: {
  nextPath?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const redirectTarget = nextPath && nextPath.startsWith('/') ? nextPath : '/hub';

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    startTransition(() => {
      router.replace(redirectTarget);
      router.refresh();
    });
  }

  async function handleMagicLinkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTarget)}`,
      },
    });

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setInfo('Check your inbox — we just sent you a sign-in link.');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-full bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`flex-1 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[1px] transition ${
            mode === 'password' ? 'bg-brand-600 text-white shadow-pop' : 'text-ink-600'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode('magic-link')}
          className={`flex-1 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[1px] transition ${
            mode === 'magic-link' ? 'bg-brand-600 text-white shadow-pop' : 'text-ink-600'
          }`}
        >
          Magic link
        </button>
      </div>

      {mode === 'password' ? (
        <form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
          <EmailInput value={email} onChange={setEmail} />
          <PasswordInput value={password} onChange={setPassword} />
          <SubmitButton disabled={isPending || !email || !password}>
            {isPending ? 'Signing in…' : 'Sign in'}
          </SubmitButton>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleMagicLinkSubmit}>
          <EmailInput value={email} onChange={setEmail} />
          <SubmitButton disabled={isPending || !email}>Send magic link</SubmitButton>
        </form>
      )}

      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {info}
        </div>
      ) : null}
    </div>
  );
}

function EmailInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">Email</span>
      <input
        type="email"
        autoComplete="email"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-surface-card focus:outline-none"
        placeholder="you@business.com"
      />
    </label>
  );
}

function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
        Password
      </span>
      <input
        type="password"
        autoComplete="current-password"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-surface-card focus:outline-none"
        placeholder="••••••••"
      />
    </label>
  );
}

function SubmitButton({
  disabled,
  children,
}: {
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
