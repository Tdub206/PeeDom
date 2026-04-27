'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUp, Bell, Bot, Loader2, Settings, Sparkles, X } from 'lucide-react';

interface DashboardTopbarProps {
  initials: string;
  pendingClaimsCount: number;
  businessContext: string;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const PAGE_TITLES: Record<string, string> = {
  '/hub': 'Overview',
  '/locations': 'Locations',
  '/analytics': 'Analytics',
  '/coupons': 'Coupons',
  '/codes': 'Access codes',
  '/featured': 'Featured',
  '/claims': 'Claim history',
  '/settings': 'Settings',
};

const SUGGESTED_PROMPTS = [
  'How can I improve my trust score?',
  'What should I add to my listing description?',
  'How do featured placements work?',
  'Write a reply template for a negative review',
];

export function DashboardTopbar({
  initials,
  pendingClaimsCount,
  businessContext,
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const [openPanel, setOpenPanel] = useState<'ai' | 'notifications' | null>(null);
  const title = getPageTitle(pathname);

  return (
    <div className="sticky top-0 z-20 border-b border-surface-strong bg-surface-base/95 backdrop-blur">
      <div className="relative flex items-center gap-4 px-8 py-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            StallPass Business
          </div>
          <div className="mt-1 text-xl font-black tracking-tight text-ink-900">{title}</div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenPanel((current) => (current === 'ai' ? null : 'ai'))}
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
              openPanel === 'ai'
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-surface-strong bg-surface-card text-ink-700 hover:border-brand-200 hover:text-brand-700'
            }`}
          >
            <Sparkles size={16} />
            AI
          </button>

          <button
            type="button"
            onClick={() =>
              setOpenPanel((current) => (current === 'notifications' ? null : 'notifications'))
            }
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
              openPanel === 'notifications'
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-surface-strong bg-surface-card text-ink-700 hover:border-brand-200 hover:text-brand-700'
            }`}
            aria-label="Notifications"
          >
            <Bell size={16} />
            {pendingClaimsCount > 0 && openPanel !== 'notifications' ? (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand-600" />
            ) : null}
          </button>

          <Link
            href="/settings"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-strong bg-surface-card text-ink-700 transition hover:border-brand-200 hover:text-brand-700"
            aria-label="Settings"
          >
            <Settings size={16} />
          </Link>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black text-white">
            {initials}
          </div>
        </div>

        {openPanel === 'ai' ? (
          <AiPanel businessContext={businessContext} onClose={() => setOpenPanel(null)} />
        ) : null}
        {openPanel === 'notifications' ? (
          <NotificationsPanel
            pendingClaimsCount={pendingClaimsCount}
            onClose={() => setOpenPanel(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function AiPanel({
  businessContext,
  onClose,
}: {
  businessContext: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  async function send(text?: string) {
    const userText = (text ?? input).trim();

    if (!userText || isLoading) {
      return;
    }

    setInput('');
    setError(null);

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          businessContext,
        }),
      });

      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || data.error) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setMessages(nextMessages);
        return;
      }

      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: data.text ?? 'I could not generate a reply. Please try again.',
        },
      ]);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }

  return (
    <div
      className="absolute right-8 top-full z-30 mt-3 flex w-full max-w-md flex-col rounded-4xl border border-surface-strong bg-surface-card shadow-pop"
      style={{ height: 'min(560px, calc(100vh - 120px))' }}
    >
      <div className="flex items-center gap-3 rounded-t-4xl border-b border-surface-strong px-5 py-4">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
          <Bot size={16} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-black tracking-tight text-ink-900">StallPass AI</div>
          <div className="text-[11px] text-ink-500">Powered by Claude</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition hover:bg-surface-muted hover:text-ink-900"
          aria-label="Close AI panel"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="mb-3 text-sm leading-6 text-ink-500">
              I can help you improve listings, draft copy, or answer dashboard questions. Try:
            </p>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-2.5 text-left text-sm font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-surface-muted text-ink-900'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-3xl bg-surface-muted px-4 py-3 text-ink-500">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-2.5 text-sm text-danger">
                {error}
              </div>
            ) : null}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 rounded-b-4xl border-t border-surface-strong p-3">
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          disabled={isLoading}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="Ask anything about your listings..."
          className="flex-1 resize-none rounded-2xl border border-surface-strong bg-surface-base px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 disabled:opacity-50"
          style={{ maxHeight: 120 }}
        />
        <button
          type="button"
          disabled={isLoading || !input.trim()}
          onClick={() => void send()}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-brand-600 text-white shadow-pop transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          aria-label="Send"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
}

function NotificationsPanel({
  pendingClaimsCount,
  onClose,
}: {
  pendingClaimsCount: number;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-8 top-full mt-3 w-full max-w-md rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-pop">
      <PanelHeader title="Notifications" onClose={onClose} />

      <div className="mt-4 grid gap-3">
        {pendingClaimsCount > 0 ? (
          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4">
            <div className="text-sm font-bold text-ink-900">
              {pendingClaimsCount} pending claim{pendingClaimsCount === 1 ? '' : 's'}
            </div>
            <div className="mt-1 text-sm leading-6 text-ink-600">
              Claim review updates still arrive by email while the real-time notification feed is
              being wired into the business dashboard.
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-surface-strong bg-surface-base p-4 text-sm leading-6 text-ink-600">
            No new claim alerts right now.
          </div>
        )}

        <div className="rounded-2xl border border-surface-strong bg-surface-base p-4 text-sm leading-6 text-ink-600">
          Real-time in-app notifications are the next step after the table-backed notification feed
          is added to the schema.
        </div>
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
          Dashboard panel
        </div>
        <div className="mt-1 text-lg font-black tracking-tight text-ink-900">{title}</div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-strong bg-surface-card text-ink-500 transition hover:border-brand-200 hover:text-brand-700"
        aria-label={`Close ${title}`}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const directMatch = PAGE_TITLES[pathname];

  if (directMatch) {
    return directMatch;
  }

  const entry = Object.entries(PAGE_TITLES).find(([prefix]) => pathname.startsWith(`${prefix}/`));
  return entry?.[1] ?? 'Business Hub';
}
