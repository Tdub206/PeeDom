# StallPass Google Maps and Places Production Checklist

This checklist is for the current StallPass architecture:

- Native map rendering uses Google Maps keys through Expo config in `app.config.ts`
- Address autocomplete runs server-side through Supabase Edge Functions
- The Places web-service key must never be shipped in the mobile client
- Business hours can remain manual; Google hours sync is not required for launch

## Current StallPass wiring

- Android map key env: `ANDROID_GOOGLE_MAPS_API_KEY`
- iOS map key env: `IOS_GOOGLE_MAPS_API_KEY`
- Server-side Places key env: `GOOGLE_PLACES_API_KEY`
- Android package: `com.stallpass.app`
- iOS bundle identifier: `com.stallpass.app`
- Address autocomplete function: `supabase/functions/google-place-autocomplete`
- Selected-address resolution function: `supabase/functions/google-place-address`

## API inventory

Enable only the APIs StallPass actually needs:

- `Maps SDK for Android`
- `Maps SDK for iOS`
- `Places API`

Do not enable extra Google Maps Platform APIs unless StallPass starts using them. Right now, address search does not require the app to expose a Geocoding key on device.

## Key plan

Create separate keys. Google explicitly recommends separate keys per app and split client-side from server-side usage.

### 1. Android maps key

Purpose:
- Native Google map rendering inside the Android app

Restriction:
- Application restriction: `Android apps`
- Package name: `com.stallpass.app`
- SHA-1 fingerprints:
  - local debug fingerprint for developer builds
  - release or Play App Signing fingerprint for production

API restriction:
- `Maps SDK for Android`

Suggested name:
- `stallpass-android-maps-prod`

### 2. iOS maps key

Purpose:
- Native Google map rendering inside the iOS app

Restriction:
- Application restriction: `iOS apps`
- Bundle identifier: `com.stallpass.app`

API restriction:
- `Maps SDK for iOS`

Suggested name:
- `stallpass-ios-maps-prod`

### 3. Server-side Places key

Purpose:
- Places Autocomplete and Place Details calls from Supabase Edge Functions

Restriction:
- Application restriction: none if you do not have fixed egress IPs
- If you later move this traffic behind fixed outbound IPs, add `IP addresses` restriction then

API restriction:
- `Places API`

Suggested name:
- `stallpass-server-places-prod`

Important:
- Do not reuse the Android or iOS map keys for Places web-service calls
- Do not put `GOOGLE_PLACES_API_KEY` into `EXPO_PUBLIC_*` env vars
- Do not commit any of these keys into the repo

## Cost controls already implemented

The current code is already aligned with the cheaper address-search path:

- Google autocomplete only runs for address-like queries, not every generic search
- Requests wait until at least 3 characters
- Requests are debounced
- Suggestions are capped to a small result set
- Queries are biased to the user location or current map region
- The Places session token is reused across autocomplete and selection
- Place Details uses a minimal field mask
- Hours remain manual instead of introducing more Google traffic

Operationally, keep it this way for launch unless usage data shows a clear reason to expand.

## Possible future cost optimization

Google’s current Places docs say that for address-only use cases, programmatic Autocomplete plus Geocoding can be cheaper than session-based Autocomplete plus Place Details if users usually select within four autocomplete requests or fewer.

Do not switch now.

Launch recommendation:
- keep the current implementation
- measure average autocomplete requests per successful selection
- only test a Geocoding-based variant after real traffic confirms it is likely cheaper

## Google Cloud Console steps

1. Open your Google Cloud project used for StallPass.
2. Confirm billing is enabled.
3. Enable:
   - `Maps SDK for Android`
   - `Maps SDK for iOS`
   - `Places API`
4. Create the Android maps key and apply:
   - Android application restriction
   - package `com.stallpass.app`
   - correct SHA-1 fingerprints
   - API restriction `Maps SDK for Android`
5. Create the iOS maps key and apply:
   - iOS application restriction
   - bundle ID `com.stallpass.app`
   - API restriction `Maps SDK for iOS`
6. Create the server Places key and apply:
   - API restriction `Places API`
   - no app restriction unless you have fixed server egress IPs
7. Label the keys clearly so rotation later is obvious.

## How to get Android SHA-1 fingerprints

### Debug SHA-1

Run this locally:

```powershell
keytool -list -v -alias androiddebugkey -keystore "$env:USERPROFILE\.android\debug.keystore" -storepass android -keypass android
```

### Release SHA-1

Use one of these:

- your release keystore fingerprint if you self-sign
- the Play App Signing certificate fingerprint from Play Console if Google signs the release build

If you publish through Play App Signing, the Play signing fingerprint is the one that matters for production installs from Google Play.

## StallPass env mapping

Set these in your local non-committed env file and in build/deploy systems:

```dotenv
ANDROID_GOOGLE_MAPS_API_KEY=
IOS_GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_API_KEY=
```

Where each one goes:

- `ANDROID_GOOGLE_MAPS_API_KEY`
  - consumed by `app.config.ts`
  - consumed by `android/app/build.gradle`
- `IOS_GOOGLE_MAPS_API_KEY`
  - consumed by `app.config.ts`
- `GOOGLE_PLACES_API_KEY`
  - only for Supabase Edge Functions
  - never public

## Supabase deployment steps

Set the server-side secret on the real project:

```powershell
supabase secrets set GOOGLE_PLACES_API_KEY=your_server_places_key --project-ref YOUR_PROJECT_REF
```

Deploy only the functions needed for this feature:

```powershell
supabase functions deploy google-place-autocomplete --project-ref YOUR_PROJECT_REF
supabase functions deploy google-place-address --project-ref YOUR_PROJECT_REF
```

You do not need to deploy `google-place-hours` for the current launch scope if business hours stay manual.

## EAS and native build steps

Before production builds:

1. Put `ANDROID_GOOGLE_MAPS_API_KEY` into the EAS environment used for Android builds.
2. Put `IOS_GOOGLE_MAPS_API_KEY` into the EAS environment used for iOS builds.
3. Keep `GOOGLE_PLACES_API_KEY` out of EAS app-public config unless you are also deploying functions from that environment.
4. Verify `app.config.ts` resolves the expected keys during:
   - Android EAS build
   - iOS EAS build

## Verification checklist

### Local verification

- `npm run lint`
- `npm run type-check`
- `npm test -- --runInBand`
- `npm run android:assembleDebug`

### Product verification

- Search for an address like `123 Main St`
- Confirm Google suggestions appear
- Select a suggestion
- Confirm the map recenters even when there are zero bathrooms
- Confirm the searched address marker stays visible
- Confirm the “no bathrooms listed here yet” state appears when applicable
- Confirm regular StallPass bathroom search still works
- Confirm “Locate Me” clears the searched-address target and returns to user-centered browsing

### Security verification

- No Google server key appears in `.env.example` with a real value
- No Google key is committed to tracked source files
- Android release builds fail fast if `ANDROID_GOOGLE_MAPS_API_KEY` is missing
- Server-side Places traffic only uses the Supabase secret

### Console verification

- Check key metrics and quota after first staging traffic
- Confirm the Android key only shows Android Maps traffic
- Confirm the iOS key only shows iOS Maps traffic
- Confirm the server key only shows Places API traffic

## Launch recommendation

For launch, use this exact shape:

- Google Maps SDK key on Android
- Google Maps SDK key on iOS
- Separate server-side Places key in Supabase
- Keep autocomplete address-focused
- Keep manual business hours
- Revisit Geocoding-vs-Place-Details optimization only after usage data exists

## Official references

- [Google Maps Platform security best practices](https://developers.google.com/maps/api-security-best-practices)
- [Places Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)
- [Autocomplete session pricing](https://developers.google.com/maps/documentation/places/web-service/session-pricing)
- [Places API usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Maps SDK for iOS setup](https://developers.google.com/maps/documentation/ios-sdk/config)
