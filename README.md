# StallPass

Expo Router mobile app for finding bathrooms. Android local development is supported through the tracked native `android/` project, while release builds remain on EAS.

## Prerequisites

- Node.js 22.x
- Android Studio installed at `C:\Program Files\Android\Android Studio`
- Android SDK installed at `%LOCALAPPDATA%\Android\Sdk`

Set these user environment variables on Windows before opening Android Studio:

- `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`
- `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`
- `ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk`
- `GRADLE_USER_HOME=%USERPROFILE%\.g\stallpass`

Ensure your user `Path` includes:

- `%JAVA_HOME%\bin`
- `%ANDROID_HOME%\platform-tools`
- `%ANDROID_HOME%\emulator`

If PowerShell blocks `npm` or `npx` shim execution, use `npm.cmd` and `npx.cmd` instead.

## Android Studio workflow

1. Install dependencies with `npm install`.
2. Only run `npm run android:prebuild` when you intentionally want to regenerate the native Android project. It uses `expo prebuild --clean` and will overwrite local native edits.
3. On Windows, prefer `npm run android:studio`. It loads `.env.local`, `.env.staging`, or `.env.production`, writes `android/local.properties`, applies a short `GRADLE_USER_HOME`, and opens the tracked native project with those environment variables.
4. If you open Android Studio manually, create `android/local.properties` locally with:

```properties
sdk.dir=C\:/Users/T/AppData/Local/Android/Sdk
EXPO_PUBLIC_ENV=local
ANDROID_GOOGLE_MAPS_API_KEY=your-maps-key
ANDROID_ADMOB_APP_ID=ca-app-pub-3940256099942544~3347511713
```

5. Open `android/` in Android Studio and wait for Gradle sync.
6. Start Metro with `npm run start`.
   This wrapper normalizes malformed boolean env vars such as `CI=1 ` that would otherwise crash Expo CLI before Metro starts.
7. Run the `app` configuration from Android Studio, or build from the terminal with `npm run android:assembleDebug`.
8. For a faster Windows emulator-only smoke build, use `npm run android:assembleDebug:emulator`.

## AdMob notes

- Set `ANDROID_ADMOB_APP_ID` and `EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID` in the active env file for rewarded code reveals.
- Local and staging Android builds fall back to Google's test app id when `ANDROID_ADMOB_APP_ID` is blank.
- Production builds should use your real AdMob app id and rewarded unit id.

## Google Hours Sync

- Set `GOOGLE_PLACES_API_KEY` as a Supabase Edge Function secret before deploying `supabase/functions/google-place-hours`.
- The business hours editor now supports linking a Google Place ID and importing weekly hours through that function.

## Google Maps and Places launch setup

- Use separate native Android, native iOS, and server-side Places keys.
- Keep the Places key server-side only in Supabase Edge Function secrets.
- Follow the repo checklist in `docs/google-maps-places-production-checklist-2026-04-02.md`.

## Release workflow

- Local Android builds: Android Studio or `npm run android:assembleDebug`
- Windows Android Studio launch helper: `npm run android:studio`
- Fast Windows emulator verification: `npm run android:assembleDebug:emulator`
- Android release artifacts: EAS via `eas.json`
- iOS local builds: `npx expo run:ios`
