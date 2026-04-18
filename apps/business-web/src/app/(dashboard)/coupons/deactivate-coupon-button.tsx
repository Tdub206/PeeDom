'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deactivateBusinessCoupon } from './deactivate-action';

export function DeactivateCouponButton({ couponId }: { couponId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleClick() {
    if (isPending) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await deactivateBusinessCoupon(couponId);

        if (!result.ok) {
          setErrorMessage(result.error);
          return;
        }

        router.refresh();
      } catch {
        setErrorMessage('Unable to deactivate the coupon right now. Try again in a moment.');
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-danger/20 bg-danger/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[1.5px] text-danger transition hover:border-danger hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
        {isPending ? 'Deactivating...' : 'Deactivate'}
      </button>

      {errorMessage ? <p className="text-xs font-semibold text-danger">{errorMessage}</p> : null}
    </div>
  );
}
