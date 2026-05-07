# StallPass App Store Asset Pack

This asset pack is the store-facing creative system for StallPass.

## Included Exports

- iOS iPhone 6.9 screenshots: 8 PNG files at 1290x2796, no alpha
- iOS iPhone 6.5 screenshots: 8 PNG files at 1284x2778, no alpha
- iOS iPhone 5.5 screenshots: 8 PNG files at 1242x2208, no alpha
- Google Play screenshots: 8 PNG files at 1080x1920, no alpha
- Google Play feature graphic: 1024x500 PNG, no alpha
- App Store promotional banner: 1024x500 PNG
- Android notification icon: 96x96 transparent PNG
- PWA icons: 192x192 and 512x512 PNG
- Open Graph social preview: 1200x630 PNG
- Adaptive icon background: 1024x1024 PNG
- Master app icon: 1024x1024 PNG, no alpha

## Creative Narrative

The screenshot sequence emphasizes:

1. Nearby discovery on the map
2. Access-code differentiation
3. Emergency mode urgency
4. Accessibility trust
5. Live status and photo proof
6. Favorites and contribution history
7. Offline route planning
8. Verified business trust signals

## Directory Layout

- `ios/iphone_6.9/`
- `ios/iphone_6.5/`
- `ios/iphone_5.5/`
- `android/screenshots/`
- `android/graphics/`
- `additional/`
- `icons/`
- `previews/`

## Verification

Run `npm run store:ready` from the repository root to validate metadata constraints, asset paths, screenshot dimensions, and alpha-channel requirements.

Run `npm run store:ready:urls` before submission to confirm hosted legal, support, privacy, and deletion URLs are live.

## Notes

- iPad assets are intentionally omitted because `app.config.ts` sets `ios.supportsTablet` to `false`.
- The iOS screenshot exports are derived from the approved phone screenshot sequence so App Store Connect receives current accepted device dimensions.
