import { z } from 'zod';

// Small runtime guard so we fail loudly on boot if Supabase env vars
// are missing, rather than at the first request. Mirrors the pattern
// used in ../../src/lib/supabase-config.ts on the mobile side.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing',
  }),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3030'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cached: PublicEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (cached) return cached;

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    // Log the zod issues so whoever is deploying can see what's missing.
    // eslint-disable-next-line no-console
    console.error('[business-web] Invalid public env:', parsed.error.flatten().fieldErrors);
    throw new Error(
      'Business web app is misconfigured: required NEXT_PUBLIC_* environment variables are missing. See apps/business-web/.env.example.'
    );
  }

  cached = parsed.data;
  return cached;
}
