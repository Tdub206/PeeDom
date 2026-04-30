import { describe, expect, it } from '@jest/globals';

const { resolveMetroPort, sanitizeExpoStartEnv } = require('../scripts/start-dev-client.cjs') as {
  resolveMetroPort: (cliArgs: string[], env: NodeJS.ProcessEnv) => number;
  sanitizeExpoStartEnv: (env: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
};

function createProcessEnv(
  values: Record<string, string>
): NodeJS.ProcessEnv & { NODE_ENV: 'development' | 'production' | 'test' } {
  return {
    NODE_ENV: 'test',
    ...values,
  };
}

describe('start dev client helpers', () => {
  it('removes a truthy CI flag from the Expo local dev environment', () => {
    const sanitizedEnv = sanitizeExpoStartEnv(createProcessEnv({
      CI: 'true',
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    }));

    expect(sanitizedEnv.CI).toBeUndefined();
    expect(sanitizedEnv.EXPO_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
  });

  it('keeps a falsy CI flag unchanged', () => {
    const sanitizedEnv = sanitizeExpoStartEnv(createProcessEnv({
      CI: '0',
    }));

    expect(sanitizedEnv.CI).toBe('0');
  });

  it('reads the explicit Metro port from Expo CLI arguments', () => {
    expect(resolveMetroPort(['--clear', '--port', '8099'], createProcessEnv({}))).toBe(8099);
    expect(resolveMetroPort(['--port=8100'], createProcessEnv({}))).toBe(8100);
  });

  it('falls back to RCT_METRO_PORT when the CLI args do not set a port', () => {
    expect(resolveMetroPort([], createProcessEnv({ RCT_METRO_PORT: '8123' }))).toBe(8123);
  });
});
