import { useCallback, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';

export function useOnboarding() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    storage
      .get<boolean>(storage.keys.HAS_COMPLETED_ONBOARDING)
      .then((value) => setHasOnboarded(value === true))
      .catch(() => setHasOnboarded(false));
  }, []);

  const completeOnboarding = useCallback(async () => {
    await storage.set(storage.keys.HAS_COMPLETED_ONBOARDING, true);
    setHasOnboarded(true);
  }, []);

  return { hasOnboarded, completeOnboarding };
}
