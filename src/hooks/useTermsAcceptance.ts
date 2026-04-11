import { useCallback, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';

/**
 * Tracks whether the current user has accepted the Terms of Service.
 * Acceptance is persisted locally via AsyncStorage so the gate is shown
 * only once per device.
 */
export function useTermsAcceptance() {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    void storage.get<string>(storage.keys.TERMS_ACCEPTED_AT).then((value) => {
      if (!cancelled) {
        setHasAccepted(value != null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const acceptTerms = useCallback(async () => {
    const timestamp = new Date().toISOString();
    await storage.set(storage.keys.TERMS_ACCEPTED_AT, timestamp);
    setHasAccepted(true);
  }, []);

  return { hasAccepted, acceptTerms };
}
