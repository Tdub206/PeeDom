const { spawn } = require('node:child_process');

const BOOLEANISH_ENV_KEYS = ['CI'];
const VALID_BOOLEANISH_VALUES = new Set(['0', '1', 'true', 'false']);
const DEFAULT_METRO_PORT = 8081;
const METRO_STATUS_PATH = '/status';
const ANDROID_PREWARM_PATH =
  '/index.bundle?platform=android&dev=true&minify=false&app=com.stallpass.app&modulesOnly=false&runModule=true';
const METRO_STATUS_READY_TEXT = 'packager-status:running';
const PREWARM_STATUS_TIMEOUT_MS = 90_000;
const PREWARM_BUNDLE_TIMEOUT_MS = 240_000;
const PREWARM_POLL_INTERVAL_MS = 1_000;

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

function sanitizeExpoStartEnv(env) {
  const nextEnv = sanitizeBooleanishEnv(env);

  if (nextEnv.CI === '1' || nextEnv.CI === 'true') {
    console.warn(
      '[start-dev-client] Removing CI from the Expo dev-server environment so the local dev client can keep reload and websocket support enabled.'
    );
    delete nextEnv.CI;
  }

  return nextEnv;
}

function resolveMetroPort(cliArgs, env) {
  for (let index = 0; index < cliArgs.length; index += 1) {
    const currentArg = cliArgs[index];

    if (currentArg === '--port') {
      const nextArg = cliArgs[index + 1];
      const parsedPort = Number.parseInt(nextArg ?? '', 10);

      if (Number.isFinite(parsedPort) && parsedPort > 0) {
        return parsedPort;
      }
    }

    if (currentArg.startsWith('--port=')) {
      const parsedPort = Number.parseInt(currentArg.slice('--port='.length), 10);

      if (Number.isFinite(parsedPort) && parsedPort > 0) {
        return parsedPort;
      }
    }
  }

  const envPort = Number.parseInt(env.RCT_METRO_PORT ?? '', 10);

  if (Number.isFinite(envPort) && envPort > 0) {
    return envPort;
  }

  return DEFAULT_METRO_PORT;
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function requestText({ path, port, timeoutMs, resolveOnFirstChunk = false }) {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort(new Error(`Request to ${path} timed out after ${timeoutMs}ms.`));
  }, timeoutMs);

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      signal: abortController.signal,
    });

    if (resolveOnFirstChunk) {
      const reader = response.body?.getReader();

      if (reader) {
        try {
          await reader.read();
        } finally {
          await reader.cancel();
        }
      }

      return {
        body: '',
        statusCode: response.status,
      };
    }

    return {
      body: await response.text(),
      statusCode: response.status,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function prewarmAndroidBundleWithCurl(port) {
  return new Promise((resolve, reject) => {
    const curlBinary = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const outputTarget = process.platform === 'win32' ? 'NUL' : '/dev/null';
    const stderrChunks = [];
    const child = spawn(
      curlBinary,
      [
        '--silent',
        '--show-error',
        '--fail',
        '--max-time',
        String(Math.ceil(PREWARM_BUNDLE_TIMEOUT_MS / 1000)),
        '--output',
        outputTarget,
        `http://127.0.0.1:${port}${ANDROID_PREWARM_PATH}`,
      ],
      {
        stdio: ['ignore', 'ignore', 'pipe'],
      }
    );

    child.stderr.on('data', (chunk) => {
      stderrChunks.push(chunk.toString('utf8'));
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const errorDetail = stderrChunks.join('').trim();
      reject(
        new Error(
          errorDetail || `curl prewarm exited unsuccessfully on port ${port}.`
        )
      );
    });
  });
}

async function waitForMetroReady(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await requestText({
        path: METRO_STATUS_PATH,
        port,
        timeoutMs: PREWARM_POLL_INTERVAL_MS,
      });

      if (response.statusCode === 200 && response.body.includes(METRO_STATUS_READY_TEXT)) {
        return true;
      }
    } catch {
      // Metro is still starting up. Keep polling until the deadline expires.
    }

    await wait(PREWARM_POLL_INTERVAL_MS);
  }

  return false;
}

async function prewarmAndroidBundle(port) {
  const isMetroReady = await waitForMetroReady(port, PREWARM_STATUS_TIMEOUT_MS);

  if (!isMetroReady) {
    console.warn(
      `[start-dev-client] Metro did not report ready on port ${port} before the prewarm deadline.`
    );
    return;
  }

  console.log(`[start-dev-client] Prewarming the Android Metro bundle on port ${port}.`);
  console.log(
    '[start-dev-client] The first cold Android bundle can take a couple of minutes. Wait for the warm-bundle message before connecting the emulator if Metro was just started.'
  );

  try {
    await prewarmAndroidBundleWithCurl(port);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      const response = await requestText({
        path: ANDROID_PREWARM_PATH,
        port,
        timeoutMs: PREWARM_BUNDLE_TIMEOUT_MS,
        resolveOnFirstChunk: true,
      });

      if (response.statusCode >= 400) {
        throw new Error(
          `Android bundle prewarm failed with HTTP ${response.statusCode} on port ${port}.`
        );
      }
    } else {
      throw error;
    }
  }

  console.log(`[start-dev-client] Android Metro bundle is warm on port ${port}.`);
}

function spawnExpoCli(cliArgs) {
  return spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--dev-client', ...cliArgs], {
    env: sanitizeExpoStartEnv(process.env),
    stdio: 'inherit',
  });
}

function main() {
  const cliArgs = process.argv.slice(2);
  const metroPort = resolveMetroPort(cliArgs, process.env);
  const child = spawnExpoCli(cliArgs);

  prewarmAndroidBundle(metroPort).catch((error) => {
    console.warn('[start-dev-client] Android bundle prewarm failed.', error);
  });

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
}

module.exports = {
  sanitizeBooleanishEnv,
  sanitizeExpoStartEnv,
  resolveMetroPort,
};

if (require.main === module) {
  main();
}
