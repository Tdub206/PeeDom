# Security Migration Plan (AsyncStorage -> SecureStore)

## Current state
- Supabase session persistence currently uses `AsyncStorage`.
- App-specific cache and non-sensitive state also use `AsyncStorage`.

## Target state
- Keep non-sensitive caches in `AsyncStorage`.
- Move auth/session-sensitive records to `expo-secure-store`.

## Proposed phases
1. Introduce a storage abstraction with explicit sensitivity levels.
2. Migrate auth/session keys to `SecureStore` with fallback handling.
3. Add migration routine to move legacy keys once at startup.
4. Validate sign-in/sign-out/session refresh on both iOS and Android.

## Notes
- `EXPO_PUBLIC_*` values are public build-time values and must not contain secrets.
- Never commit real credentials to repository-managed `.env` files.
