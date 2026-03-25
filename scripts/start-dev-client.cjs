const { spawn } = require('node:child_process');

const BOOLEANISH_ENV_KEYS = ['CI'];
const VALID_BOOLEANISH_VALUES = new Set(['0', '1', 'true', 'false']);

function sanitizeBooleanishEnv(env) {
  const nextEnv = { ...env };

  for (const key of BOOLEANISH_ENV_KEYS) {
    const rawValue = nextEnv[key];

    if (typeof rawValue !== 'string') {
      continue;
    }

    const trimmedValue = rawValue.trim();

    if (!trimmedValue) {
      delete nextEnv[key];
      continue;
    }

    const normalizedValue =
      trimmedValue === '0' || trimmedValue === '1' ? trimmedValue : trimmedValue.toLowerCase();

    if (!VALID_BOOLEANISH_VALUES.has(normalizedValue)) {
      console.warn(
        `[start-dev-client] Ignoring invalid ${key} value "${rawValue}" so Expo CLI can start normally.`
      );
      delete nextEnv[key];
      continue;
    }

    if (normalizedValue !== rawValue) {
      console.warn(
        `[start-dev-client] Normalized ${key} from "${rawValue}" to "${normalizedValue}" for Expo CLI.`
      );
    }

    nextEnv[key] = normalizedValue;
  }

  return nextEnv;
}

const child = spawn(
  process.execPath,
  [require.resolve('expo/bin/cli'), 'start', '--dev-client', ...process.argv.slice(2)],
  {
    env: sanitizeBooleanishEnv(process.env),
    stdio: 'inherit',
  }
);

child.on('error', (error) => {
  console.error('[start-dev-client] Unable to launch Expo CLI.', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
