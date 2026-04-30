'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, LockKeyhole, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import {
  updateBusinessNotificationPreferences,
  updateBusinessProfile,
  type UpdateBusinessProfileResult,
  type UpdateNotificationPreferencesResult,
} from './actions';

export interface NotificationPreferences {
  code_verified: boolean;
  favorite_update: boolean;
  nearby_new: boolean;
  streak_reminder: boolean;
  arrival_alert: boolean;
}

interface SettingsSectionsProps {
  initialDisplayName: string;
  email: string;
  initialNotificationPreferences: NotificationPreferences;
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export function SettingsSections({
  initialDisplayName,
  email,
  initialNotificationPreferences,
}: SettingsSectionsProps) {
  return (
    <div className="grid max-w-4xl gap-5">
      <ProfileSection initialDisplayName={initialDisplayName} email={email} />
      <NotificationSection initialPreferences={initialNotificationPreferences} />
      <SecuritySection />
      <DangerZoneSection />
    </div>
  );
}

function ProfileSection({
  initialDisplayName,
  email,
}: {
  initialDisplayName: string;
  email: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setSaveState('saving');
    setMessage('Saving business profile...');
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateBusinessProfile({
        display_name: displayName,
      });

      applyResult(result);
    });
  }

  function applyResult(result: UpdateBusinessProfileResult) {
    if (!result.ok) {
      setSaveState('error');
      setMessage(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    setSaveState('success');
    setMessage('Business profile updated.');
    setFieldErrors({});
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card"
    >
      <SectionHeading
        eyebrow="Profile"
        title="Business profile"
        description="This display name is shared across the business dashboard surfaces."
      />

      <div className="mt-5 grid gap-4">
        <FieldRow label="Display name" error={fieldErrors.display_name}>
          <input
            type="text"
            maxLength={80}
            className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
            value={displayName}
            disabled={isPending}
            onChange={(event) => {
              setDisplayName(event.target.value);
              if (fieldErrors.display_name) {
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.display_name;
                  return next;
                });
              }
              setSaveState('idle');
              setMessage(null);
            }}
          />
        </FieldRow>

        <FieldRow label="Account email" helper="Managed by Supabase auth for this account.">
          <input
            type="email"
            className="w-full rounded-2xl border border-surface-strong bg-surface-muted px-4 py-3 text-sm font-semibold text-ink-500 outline-none"
            value={email}
            disabled
            readOnly
          />
        </FieldRow>
      </div>

      <SectionFooter
        saveState={saveState}
        message={message}
        buttonLabel={isPending ? 'Saving...' : 'Save changes'}
        isPending={isPending}
      />
    </form>
  );
}

function NotificationSection({
  initialPreferences,
}: {
  initialPreferences: NotificationPreferences;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setSaveState('saving');
    setMessage('Saving notification preferences...');

    startTransition(async () => {
      const result = await updateBusinessNotificationPreferences(preferences);
      applyResult(result);
    });
  }

  function applyResult(result: UpdateNotificationPreferencesResult) {
    if (!result.ok) {
      setSaveState('error');
      setMessage(result.error);
      return;
    }

    setSaveState('success');
    setMessage('Notification preferences saved.');
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card"
    >
      <SectionHeading
        eyebrow="Notifications"
        title="Email and account alerts"
        description="These toggles save into the same notification-preference surface the mobile app uses."
      />

      <div className="mt-5 grid gap-3">
        <ToggleRow
          label="Code verification updates"
          description="When a code tied to one of your locations is verified or replaced."
          value={preferences.code_verified}
          onChange={(nextValue) => {
            setPreferences((current) => ({ ...current, code_verified: nextValue }));
            setSaveState('idle');
            setMessage(null);
          }}
        />
        <ToggleRow
          label="Favorites and guest activity"
          description="Notify me when engagement changes around saved locations."
          value={preferences.favorite_update}
          onChange={(nextValue) => {
            setPreferences((current) => ({ ...current, favorite_update: nextValue }));
            setSaveState('idle');
            setMessage(null);
          }}
        />
        <ToggleRow
          label="Nearby new bathrooms"
          description="Share launches and newly-added restrooms near my managed footprint."
          value={preferences.nearby_new}
          onChange={(nextValue) => {
            setPreferences((current) => ({ ...current, nearby_new: nextValue }));
            setSaveState('idle');
            setMessage(null);
          }}
        />
        <ToggleRow
          label="Streak reminders"
          description="Keep contributor streak reminders aligned with the mobile app."
          value={preferences.streak_reminder}
          onChange={(nextValue) => {
            setPreferences((current) => ({ ...current, streak_reminder: nextValue }));
            setSaveState('idle');
            setMessage(null);
          }}
        />
        <ToggleRow
          label="Arrival alerts"
          description="Allow reminders for arrival-based premium alerts and related business updates."
          value={preferences.arrival_alert}
          onChange={(nextValue) => {
            setPreferences((current) => ({ ...current, arrival_alert: nextValue }));
            setSaveState('idle');
            setMessage(null);
          }}
        />
      </div>

      <SectionFooter
        saveState={saveState}
        message={message}
        buttonLabel={isPending ? 'Saving...' : 'Save preferences'}
        isPending={isPending}
      />
    </form>
  );
}

function SecuritySection() {
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSavingPassword) {
      return;
    }

    if (password.length < 8) {
      setSaveState('error');
      setMessage('Choose a password that is at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSaveState('error');
      setMessage('Password confirmation does not match.');
      return;
    }

    setIsSavingPassword(true);
    setSaveState('saving');
    setMessage('Updating password...');

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setSaveState('error');
        setMessage(error.message || 'Unable to update password right now.');
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setSaveState('success');
      setMessage('Password updated.');
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to update password right now.');
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
      <SectionHeading
        eyebrow="Security"
        title="Password and sign-in protection"
        description="Password changes run against the live Supabase auth account for this session."
      />

      <form onSubmit={handlePasswordSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldRow label="New password">
            <input
              type="password"
              minLength={8}
              className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
              value={password}
              disabled={isSavingPassword}
              onChange={(event) => {
                setPassword(event.target.value);
                setSaveState('idle');
                setMessage(null);
              }}
            />
          </FieldRow>

          <FieldRow label="Confirm password">
            <input
              type="password"
              minLength={8}
              className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
              value={confirmPassword}
              disabled={isSavingPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setSaveState('idle');
                setMessage(null);
              }}
            />
          </FieldRow>
        </div>

        <div className="rounded-2xl border border-surface-strong bg-surface-base p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 flex-none text-brand-600" />
            <div className="text-sm leading-6 text-ink-600">
              Two-factor authentication is still managed from the Supabase account security flow.
              Turn it on once the shared auth settings surface is available.
            </div>
          </div>
        </div>

        <SectionFooter
          saveState={saveState}
          message={message}
          buttonLabel={isSavingPassword ? 'Saving...' : 'Change password'}
          isPending={isSavingPassword}
          icon={isSavingPassword ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
        />
      </form>
    </div>
  );
}

function DangerZoneSection() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteState, setDeleteState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleDeleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isDeleting) {
      return;
    }

    if (confirmText !== 'DELETE') {
      setDeleteState('error');
      setMessage('Type DELETE to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    setDeleteState('saving');
    setMessage('Requesting account deletion...');

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke<{
        success?: boolean;
        warning?: string | null;
      }>('delete-account', {
        method: 'POST',
      });

      if (error) {
        setDeleteState('error');
        setMessage(error.message || 'Unable to delete your account right now.');
        return;
      }

      await supabase.auth.signOut();
      setDeleteState('success');
      setMessage(data?.warning ?? 'Account deletion confirmed. Redirecting to sign-in...');
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setDeleteState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to delete your account right now.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleDeleteAccount}
      className="rounded-4xl border border-danger/20 bg-surface-card p-6 shadow-card"
    >
      <SectionHeading
        eyebrow="Danger zone"
        title="Delete account"
        description="This removes your business access, related claims, and dashboard session. Type DELETE to continue."
      />

      <div className="mt-5 grid gap-4">
        <FieldRow label='Type "DELETE" to confirm'>
          <input
            type="text"
            className="w-full rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-ink-900 outline-none transition focus:border-danger"
            value={confirmText}
            disabled={isDeleting}
            onChange={(event) => {
              setConfirmText(event.target.value.toUpperCase());
              setDeleteState('idle');
              setMessage(null);
            }}
          />
        </FieldRow>
      </div>

      <SectionFooter
        saveState={deleteState}
        message={message}
        buttonLabel={isDeleting ? 'Deleting...' : 'Delete account'}
        isPending={isDeleting}
        buttonTone="danger"
        icon={isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      />
    </form>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">{eyebrow}</div>
      <div className="mt-1 text-xl font-black tracking-tight text-ink-900">{title}</div>
      <div className="mt-1 max-w-2xl text-sm text-ink-500">{description}</div>
    </div>
  );
}

function FieldRow({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-semibold text-danger">{error}</span>
      ) : helper ? (
        <span className="text-xs text-ink-500">{helper}</span>
      ) : null}
    </label>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-surface-strong bg-surface-base p-4">
      <div className="flex-1">
        <div className="text-sm font-bold text-ink-900">{label}</div>
        <div className="mt-1 text-sm leading-6 text-ink-600">{description}</div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-8 w-14 items-center rounded-full border transition ${
          value ? 'border-brand-600 bg-brand-600' : 'border-surface-strong bg-surface-muted'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${
            value ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function SectionFooter({
  saveState,
  message,
  buttonLabel,
  isPending,
  buttonTone = 'brand',
  icon,
}: {
  saveState: SaveState;
  message: string | null;
  buttonLabel: string;
  isPending: boolean;
  buttonTone?: 'brand' | 'danger';
  icon?: React.ReactNode;
}) {
  const buttonClasses =
    buttonTone === 'danger'
      ? 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/40'
      : 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300';

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-surface-strong pt-5 sm:flex-row sm:items-center sm:justify-between">
      <StatusMessage saveState={saveState} message={message} />
      <button
        type="submit"
        disabled={isPending}
        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-pop transition disabled:cursor-not-allowed ${buttonClasses}`}
      >
        {icon ?? (isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />)}
        {buttonLabel}
      </button>
    </div>
  );
}

function StatusMessage({
  saveState,
  message,
}: {
  saveState: SaveState;
  message: string | null;
}) {
  if (!message) {
    return (
      <p className="text-sm text-ink-500">
        Changes are validated before they hit Supabase.
      </p>
    );
  }

  const icon =
    saveState === 'error' ? (
      <AlertTriangle size={16} />
    ) : saveState === 'success' ? (
      <CheckCircle2 size={16} />
    ) : (
      <Loader2 size={16} className="animate-spin" />
    );

  const toneClass =
    saveState === 'error'
      ? 'text-danger'
      : saveState === 'success'
        ? 'text-success'
        : 'text-ink-600';

  return (
    <div className={`inline-flex items-center gap-2 text-sm font-semibold ${toneClass}`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}
