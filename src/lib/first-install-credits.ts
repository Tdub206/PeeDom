import { z } from 'zod';
import { storage } from '@/lib/storage';

const INITIAL_CODE_REVEALS = 2;
const INITIAL_EMERGENCY_FINDS = 1;

const firstInstallCreditsSchema = z.object({
  initialized: z.boolean(),
  code_reveals: z.number().int().min(0),
  emergency_finds: z.number().int().min(0),
});

export type FirstInstallCredits = z.infer<typeof firstInstallCreditsSchema>;

async function readCredits(): Promise<FirstInstallCredits> {
  try {
    const stored = await storage.get<unknown>(storage.keys.FIRST_INSTALL_CREDITS);
    const parsed = firstInstallCreditsSchema.safeParse(stored);
    if (parsed.success) return parsed.data;
  } catch (_e) {
    // Fall through to defaults
  }
  return { initialized: false, code_reveals: 0, emergency_finds: 0 };
}

/**
 * Called once on app boot. Sets the onboarding credits if this is a fresh install.
 * Safe to call on every launch — idempotent after first run.
 */
export async function initializeFirstInstallCredits(): Promise<void> {
  const credits = await readCredits();
  if (credits.initialized) return;

  await storage.set(storage.keys.FIRST_INSTALL_CREDITS, {
    initialized: true,
    code_reveals: INITIAL_CODE_REVEALS,
    emergency_finds: INITIAL_EMERGENCY_FINDS,
  } satisfies FirstInstallCredits);
}

export async function getFirstInstallCredits(): Promise<FirstInstallCredits> {
  return readCredits();
}

/**
 * Attempts to consume one free code reveal credit.
 * Returns true if a credit was available and consumed, false otherwise.
 */
export async function consumeCodeRevealCredit(): Promise<boolean> {
  const credits = await readCredits();
  if (!credits.initialized || credits.code_reveals <= 0) return false;

  await storage.set(storage.keys.FIRST_INSTALL_CREDITS, {
    ...credits,
    code_reveals: credits.code_reveals - 1,
  } satisfies FirstInstallCredits);
  return true;
}

/**
 * Attempts to consume the free emergency find credit.
 * Returns true if a credit was available and consumed, false otherwise.
 */
export async function consumeEmergencyFindCredit(): Promise<boolean> {
  const credits = await readCredits();
  if (!credits.initialized || credits.emergency_finds <= 0) return false;

  await storage.set(storage.keys.FIRST_INSTALL_CREDITS, {
    ...credits,
    emergency_finds: credits.emergency_finds - 1,
  } satisfies FirstInstallCredits);
  return true;
}
