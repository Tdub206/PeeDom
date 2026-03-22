const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(PROJECT_ROOT, 'android');
const IS_WINDOWS = process.platform === 'win32';
const BOOLEANISH_ENV_KEYS = ['CI'];
const VALID_BOOLEANISH_VALUES = new Set(['0', '1', 'true', 'false']);
const TEST_ANDROID_ADMOB_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

function parseEnvFileContent(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');

    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

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
      delete nextEnv[key];
      continue;
    }

    nextEnv[key] = normalizedValue;
  }

  return nextEnv;
}

function resolveEnvironmentName(env) {
  return env.EXPO_PUBLIC_ENV?.trim() || 'local';
}

function resolveEnvFilePath(environmentName) {
  if (environmentName === 'production') {
    return path.join(PROJECT_ROOT, '.env.production');
  }

  if (environmentName === 'staging') {
    return path.join(PROJECT_ROOT, '.env.staging');
  }

  return path.join(PROJECT_ROOT, '.env.local');
}

function loadProjectEnvironment() {
  const environmentName = resolveEnvironmentName(process.env);
  const envFilePath = resolveEnvFilePath(environmentName);

  if (!fs.existsSync(envFilePath)) {
    return sanitizeBooleanishEnv(process.env);
  }

  const fileValues = parseEnvFileContent(fs.readFileSync(envFilePath, 'utf8'));

  return sanitizeBooleanishEnv({
    ...fileValues,
    ...process.env,
    EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV ?? fileValues.EXPO_PUBLIC_ENV ?? environmentName,
  });
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function collectFilesWithSuffix(rootPath, suffix) {
  const matches = [];

  if (!fs.existsSync(rootPath)) {
    return matches;
  }

  const stack = [rootPath];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(suffix)) {
        matches.push(entryPath);
      }
    }
  }

  return matches;
}

function resolveAndroidSdkPath(env) {
  const candidates = [
    env.ANDROID_HOME,
    env.ANDROID_SDK_ROOT,
    path.join(env.LOCALAPPDATA ?? '', 'Android', 'Sdk'),
    path.join(env.USERPROFILE ?? os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function resolveJavaHome(env) {
  const candidates = [
    env.JAVA_HOME,
    path.join(env.ProgramFiles ?? 'C:\\Program Files', 'Android', 'Android Studio', 'jbr'),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function resolveGradleUserHome(env) {
  if (env.GRADLE_USER_HOME) {
    return env.GRADLE_USER_HOME;
  }

  return path.join(env.USERPROFILE ?? os.homedir(), '.g', 'peedom');
}

function resolveAndroidStudioOptionsDirectories(env) {
  const appDataRoot =
    env.APPDATA ?? path.join(env.USERPROFILE ?? os.homedir(), 'AppData', 'Roaming');
  const googleConfigRoot = path.join(appDataRoot, 'Google');

  if (!fs.existsSync(googleConfigRoot)) {
    return [];
  }

  return fs
    .readdirSync(googleConfigRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('AndroidStudio'))
    .map((entry) => path.join(googleConfigRoot, entry.name, 'options'))
    .filter((optionsDirectory) => fs.existsSync(optionsDirectory))
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
}

function ensureAndroidStudioGradleServiceDirectory(env, gradleUserHome) {
  if (!gradleUserHome) {
    return 0;
  }

  const normalizedGradleUserHome = gradleUserHome.replace(/\\/g, '/');
  const optionsDirectories = resolveAndroidStudioOptionsDirectories(env);
  let updatedFiles = 0;

  for (const optionsDirectory of optionsDirectories) {
    const gradleSettingsPath = path.join(optionsDirectory, 'gradle.settings.xml');
    const desiredOption = `    <option name="serviceDirectoryPath" value="${normalizedGradleUserHome}" />`;
    const desiredComponent = [
      '  <component name="GradleSystemSettings">',
      desiredOption,
      '  </component>',
    ].join(os.EOL);
    const fallbackContent = [
      '<application>',
      desiredComponent,
      '</application>',
      '',
    ].join(os.EOL);
    const currentContent = fs.existsSync(gradleSettingsPath)
      ? fs.readFileSync(gradleSettingsPath, 'utf8')
      : null;
    let nextContent = fallbackContent;

    if (currentContent) {
      if (currentContent.includes('<component name="GradleSystemSettings">')) {
        nextContent = currentContent.replace(
          /<component name="GradleSystemSettings">[\s\S]*?<\/component>/,
          desiredComponent
        );
      } else if (currentContent.includes('</application>')) {
        nextContent = currentContent.replace('</application>', `${desiredComponent}${os.EOL}</application>`);
      } else {
        nextContent = fallbackContent;
      }
    }

    if (currentContent === nextContent) {
      continue;
    }

    fs.writeFileSync(gradleSettingsPath, nextContent, 'utf8');
    updatedFiles += 1;
  }

  return updatedFiles;
}

function removeCompletedGradleLocks(wrapperDistsRoot) {
  const lockPaths = collectFilesWithSuffix(wrapperDistsRoot, '.zip.lck');
  let removedLocks = 0;

  for (const lockPath of lockPaths) {
    const completedMarkerPath = lockPath.replace(/\.lck$/, '.ok');

    if (!fs.existsSync(completedMarkerPath)) {
      continue;
    }

    try {
      fs.rmSync(lockPath, { force: true });
      removedLocks += 1;
    } catch (error) {
      console.warn(`[android-tooling] Unable to remove stale Gradle lock: ${lockPath}`);
    }
  }

  return removedLocks;
}

function writeLocalProperties(env, sdkPath) {
  const localPropertiesPath = path.join(ANDROID_DIR, 'local.properties');
  const environment = resolveEnvironmentName(env);
  const androidAdMobAppId =
    env.ANDROID_ADMOB_APP_ID?.trim() || (environment === 'production' ? '' : TEST_ANDROID_ADMOB_APP_ID);
  const lines = [
    '## Generated by scripts/android-tooling.cjs - do not commit',
    `sdk.dir=${sdkPath.replace(/\\/g, '/')}`,
    `EXPO_PUBLIC_ENV=${environment}`,
  ];

  if (env.ANDROID_GOOGLE_MAPS_API_KEY) {
    lines.push(`ANDROID_GOOGLE_MAPS_API_KEY=${env.ANDROID_GOOGLE_MAPS_API_KEY}`);
  }

  if (androidAdMobAppId) {
    lines.push(`ANDROID_ADMOB_APP_ID=${androidAdMobAppId}`);
  }

  if (env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED) {
    lines.push(`EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED=${env.EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED}`);
  }

  const nextContent = `${lines.join(os.EOL)}${os.EOL}`;
  const currentContent = fs.existsSync(localPropertiesPath)
    ? fs.readFileSync(localPropertiesPath, 'utf8')
    : null;

  if (currentContent !== nextContent) {
    fs.writeFileSync(localPropertiesPath, nextContent, 'utf8');
  }
}

function prepareAndroidEnvironment() {
  const nextEnv = loadProjectEnvironment();
  const sdkPath = resolveAndroidSdkPath(nextEnv);

  if (!sdkPath) {
    throw new Error(
      'Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT, or install the SDK into the default Android Studio location.'
    );
  }

  nextEnv.ANDROID_HOME = sdkPath;
  nextEnv.ANDROID_SDK_ROOT = sdkPath;

  if (IS_WINDOWS) {
    const javaHome = resolveJavaHome(nextEnv);

    if (javaHome) {
      nextEnv.JAVA_HOME = javaHome;
    }

    const gradleUserHome = resolveGradleUserHome(nextEnv);
    ensureDirectory(gradleUserHome);
    nextEnv.GRADLE_USER_HOME = gradleUserHome;
  }

  if (!nextEnv.NODE_ENV) {
    nextEnv.NODE_ENV = 'development';
  }

  writeLocalProperties(nextEnv, sdkPath);

  return {
    env: nextEnv,
    sdkPath,
    gradleUserHome: nextEnv.GRADLE_USER_HOME ?? null,
    javaHome: nextEnv.JAVA_HOME ?? null,
  };
}

function runGradleCommand(gradleArgs) {
  const { env } = prepareAndroidEnvironment();
  const command = IS_WINDOWS ? 'cmd.exe' : './gradlew';
  const args = IS_WINDOWS ? ['/d', '/s', '/c', `gradlew.bat ${gradleArgs.join(' ')}`] : gradleArgs;

  const child = spawn(command, args, {
    cwd: ANDROID_DIR,
    env,
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error('[android-tooling] Unable to launch Gradle.', error);
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

function launchAndroidStudio() {
  if (!IS_WINDOWS) {
    console.error('[android-tooling] Android Studio launch helper is only implemented for Windows.');
    process.exit(1);
  }

  const { env, gradleUserHome } = prepareAndroidEnvironment();
  const studioCandidates = [
    env.ANDROID_STUDIO_BIN,
    path.join(env.ProgramFiles ?? 'C:\\Program Files', 'Android', 'Android Studio', 'bin', 'studio64.exe'),
    path.join(env.ProgramFiles ?? 'C:\\Program Files', 'Android', 'Android Studio', 'bin', 'studio.exe'),
  ].filter(Boolean);
  const studioExecutable = studioCandidates.find((candidate) => fs.existsSync(candidate));

  if (!studioExecutable) {
    console.error('[android-tooling] Android Studio executable not found.');
    process.exit(1);
  }

  const updatedGradleSettings = ensureAndroidStudioGradleServiceDirectory(env, gradleUserHome);

  if (updatedGradleSettings > 0) {
    console.log(
      `[android-tooling] Updated Android Studio Gradle settings in ${updatedGradleSettings} file(s) to use GRADLE_USER_HOME.`
    );
  }

  const studioRoot = path.dirname(path.dirname(studioExecutable));
  const wrapperDistsRoots = [path.join(studioRoot, 'wrapper', 'dists')];

  if (gradleUserHome) {
    wrapperDistsRoots.push(path.join(gradleUserHome, 'wrapper', 'dists'));
  }

  const removedLocks = wrapperDistsRoots.reduce(
    (count, wrapperDistsRoot) => count + removeCompletedGradleLocks(wrapperDistsRoot),
    0
  );

  if (removedLocks > 0) {
    console.log(`[android-tooling] Removed ${removedLocks} stale Gradle wrapper lock file(s) before launch.`);
  }

  console.log(`[android-tooling] Launching Android Studio with GRADLE_USER_HOME=${gradleUserHome}`);
  const child = spawn(studioExecutable, [ANDROID_DIR], {
    cwd: PROJECT_ROOT,
    env,
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
}

function printEnvironment() {
  const prepared = prepareAndroidEnvironment();

  console.log(`ANDROID_HOME=${prepared.sdkPath}`);
  if (prepared.javaHome) {
    console.log(`JAVA_HOME=${prepared.javaHome}`);
  }
  if (prepared.gradleUserHome) {
    console.log(`GRADLE_USER_HOME=${prepared.gradleUserHome}`);
  }
}

function main() {
  const [, , command, ...args] = process.argv;

  if (command === 'gradle') {
    if (!args.length) {
      console.error('[android-tooling] Missing Gradle arguments.');
      process.exit(1);
    }

    runGradleCommand(args);
    return;
  }

  if (command === 'studio') {
    launchAndroidStudio();
    return;
  }

  if (command === 'print-env') {
    printEnvironment();
    return;
  }

  console.error('[android-tooling] Expected one of: gradle, studio, print-env');
  process.exit(1);
}

main();
