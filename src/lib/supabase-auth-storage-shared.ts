export interface LegacySupabaseSessionSplitResult {
  secureSessionValue: string;
  userStorageValue: string | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildSupabaseAuthStorageKey(supabaseUrl: string): string {
  const hostname = new URL(supabaseUrl).hostname;
  return `sb-${hostname.split('.')[0]}-auth-token`;
}

export function splitLegacySupabaseSessionValue(serializedValue: string): LegacySupabaseSessionSplitResult {
  try {
    const parsedValue = JSON.parse(serializedValue);

    if (!isPlainObject(parsedValue) || !('user' in parsedValue)) {
      return {
        secureSessionValue: serializedValue,
        userStorageValue: null,
      };
    }

    const { user, ...sessionValue } = parsedValue;

    return {
      secureSessionValue: JSON.stringify(sessionValue),
      userStorageValue: JSON.stringify({
        user,
      }),
    };
  } catch {
    return {
      secureSessionValue: serializedValue,
      userStorageValue: null,
    };
  }
}
