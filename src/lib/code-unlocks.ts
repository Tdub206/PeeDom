import { storage } from '@/lib/storage';
import { buildCodeUnlockExpiry, CodeUnlockRecord, sanitizeCodeUnlockMap } from '@/lib/code-unlock-state';

async function readStoredCodeUnlocks(): Promise<Record<string, CodeUnlockRecord>> {
  try {
    const storedValue = await storage.get<unknown>(storage.keys.CODE_UNLOCKS);
    return sanitizeCodeUnlockMap(storedValue);
  } catch (error) {
    console.error('Unable to read rewarded code unlocks from storage:', error);
    return {};
  }
}

async function persistCodeUnlocks(unlocks: Record<string, CodeUnlockRecord>): Promise<void> {
  try {
    await storage.set(storage.keys.CODE_UNLOCKS, unlocks);
  } catch (error) {
    console.error('Unable to persist rewarded code unlocks to storage:', error);
    throw error;
  }
}

export async function hasActiveCodeUnlock(bathroomId: string): Promise<boolean> {
  try {
    const unlocks = await readStoredCodeUnlocks();
    return Boolean(unlocks[bathroomId]);
  } catch (error) {
    console.error('Unable to determine whether a rewarded code unlock is active:', error);
    return false;
  }
}

export async function grantCodeUnlock(bathroomId: string, codeExpiresAt?: string | null): Promise<void> {
  try {
    const unlocks = await readStoredCodeUnlocks();
    const now = new Date();

    unlocks[bathroomId] = {
      bathroom_id: bathroomId,
      unlocked_at: now.toISOString(),
      expires_at: buildCodeUnlockExpiry(now, codeExpiresAt),
    };

    await persistCodeUnlocks(unlocks);
  } catch (error) {
    console.error('Unable to persist a rewarded code unlock:', error);
    throw error;
  }
}

export async function clearExpiredCodeUnlocks(): Promise<void> {
  try {
    const unlocks = await readStoredCodeUnlocks();
    await persistCodeUnlocks(unlocks);
  } catch (error) {
    console.error('Unable to clear expired rewarded code unlocks:', error);
  }
}
