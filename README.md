# PeeDom

Expo Router mobile app for finding bathrooms. Android local development is supported through the tracked native `android/` project, while release builds remain on EAS.

## Prerequisites

- Node.js 22.x
- Android Studio installed at `C:\Program Files\Android\Android Studio`
- Android SDK installed at `%LOCALAPPDATA%\Android\Sdk`

Set these user environment variables on Windows before opening Android Studio:

- `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`
- `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`
- `ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk`

Ensure your user `Path` includes:

- `%JAVA_HOME%\bin`
- `%ANDROID_HOME%\platform-tools`
- `%ANDROID_HOME%\emulator`

If PowerShell blocks `npm` or `npx` shim execution, use `npm.cmd` and `npx.cmd` instead.

## Android Studio workflow

1. Install dependencies with `npm install`.
2. Regenerate the native Android project with `npm run android:prebuild` after changes to `app.config.ts`, Expo plugins, package IDs, splash/icons, or native-capable dependencies.
3. Create `android/local.properties` locally with:

```properties
sdk.dir=C\:/Users/T/AppData/Local/Android/Sdk
```

4. Open `android/` in Android Studio and wait for Gradle sync.
5. Start Metro with `npm run start`.
6. Run the `app` configuration from Android Studio, or build from the terminal with `npm run android:assembleDebug`.
7. For a faster Windows emulator-only smoke build, use `npm run android:assembleDebug:emulator`.

## Release workflow

- Local Android builds: Android Studio or `npm run android:assembleDebug`
- Fast Windows emulator verification: `npm run android:assembleDebug:emulator`
- Android release artifacts: EAS via `eas.json`
- iOS local builds: `npx expo run:ios`
