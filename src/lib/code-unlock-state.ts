import { z } from 'zod';

const CODE_UNLOCK_TTL_MS = 24 * 60 * 60 * 1000;

const codeUnlockRecordSchema = z.object({
  bathroom_id: z.string().min(1),
  unlocked_at: z.string().datetime(),
  expires_at: z.string().datetime(),
});

export interface CodeUnlockRecord {
  bathroom_id: string;
  unlocked_at: string;
  expires_at: string;
}

export function buildCodeUnlockExpiry(now: Date, codeExpiresAt?: string | null): string {
  const defaultExpiry = new Date(now.getTime() + CODE_UNLOCK_TTL_MS);

  if (!codeExpiresAt) {
    return defaultExpiry.toISOString();
  }

  const parsedCodeExpiry = new Date(codeExpiresAt);

  if (Number.isNaN(parsedCodeExpiry.getTime()) || parsedCodeExpiry <= now) {
    return defaultExpiry.toISOString();
  }

  return new Date(Math.min(defaultExpiry.getTime(), parsedCodeExpiry.getTime())).toISOString();
}

export function sanitizeCodeUnlockMap(value: unknown, now: Date = new Date()): Record<string, CodeUnlockRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([bathroomId, record]) => {
      const parsedRecord = codeUnlockRecordSchema.safeParse(record);

      if (!parsedRecord.success) {
        return [];
      }

      const sanitizedRecord = parsedRecord.data;
      const expiresAt = new Date(sanitizedRecord.expires_at);

      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
        return [];
      }

      return [[bathroomId, sanitizedRecord] as const];
    }).filter(([, record]) => {
      const expiresAt = new Date(record.expires_at);
      return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
    })
  );
}
