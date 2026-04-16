# StallPass — QA Device Walkthrough (for Daddy's phone)

Run this end-to-end on a real Android device before triggering the `production` EAS build. Expect 45–60 minutes.

## Setup (10 min)

1. Install the `preview` EAS build APK on your phone (side-loaded from EAS).
2. Connect to Wi-Fi.
3. Plug in for power (the emergency-flow scripting can drain the battery via GPS).
4. Open Settings → Apps → StallPass → Permissions. Confirm both location options are present but not yet granted.
5. Enable TalkBack once for the a11y pass, then turn it back off.

## Scenarios

### S1 — Cold start, no account, no location (5 min)
1. First launch after install.
2. Expect: splash → map centered on default region (SF Bay) with at least one pin.
3. No login wall.
4. Emergency button visible and tappable.
5. **Pass criterion:** time-to-interactive map ≤ 3 seconds; no crash; no white flash.

### S2 — Location permission in context (5 min)
1. Tap the emergency button with location permission still denied.
2. Expect: a non-blocking prompt explaining why we need location.
3. Tap "Enable" → OS system dialog → grant "While using the app."
4. **Pass criterion:** after granting, the emergency flow continues from where it left off. No cold restart.

### S3 — Emergency flow to maps handoff (5 min)
1. Tap the emergency button with location granted.
2. Expect: within ≤ 5 seconds, the nearest open bathroom is displayed and the "Navigate" action is ready.
3. Tap "Navigate."
4. Expect: Google Maps (or system default) opens with a pre-filled route.
5. **Pass criterion:** handoff succeeds; returning to StallPass does not crash; location state survives.

### S4 — Sign up, submit bathroom, earn point (10 min)
1. Tap Profile → Create account.
2. Use a real email (required for recovery) and a strong password.
3. Verify email via the Supabase confirmation link.
4. Return to app → tap "Add a bathroom."
5. Use current location; fill in name, access notes; submit.
6. **Pass criterion:** confirmation screen shows a clear status ("Pending community review"), point counter on your profile increments.

### S5 — Favorite, go offline, come back online (10 min)
1. While signed in with network, favorite two bathrooms from different neighborhoods.
2. Enable Airplane Mode.
3. Open the Favorites tab → both favorites are still visible with data.
4. Try to favorite a third bathroom while offline.
5. Expect: offline banner appears, the action queues, toast says something like "Will sync when you're back online."
6. Disable Airplane Mode.
7. Wait ≤ 15 seconds.
8. **Pass criterion:** third favorite appears without a manual refresh; queue drains; no duplicate entries.

### S6 — Code reveal (rewarded ad) (5 min)
1. Find a bathroom that has a code (CodeBadge visible).
2. Tap the locked code pill.
3. Expect: explanatory sheet, then "Watch short ad to reveal."
4. Watch the rewarded ad in full.
5. **Pass criterion:** code appears; "Copy" action works; a haptic fires on copy. Ad frequency cap is respected — a second attempt in the same minute does not show a new ad.

### S7 — Free-to-use bathrooms never show ad gate (2 min)
1. Find a bathroom marked "Free / no purchase required" that also has a community code.
2. Expect: the code is visible without the rewarded-ad gate.
3. **Pass criterion:** the ad flow does NOT trigger. (This is a mission-level check.)

### S8 — Accessibility mode filter end-to-end (5 min)
1. Open Filters → enable "Wheelchair accessible."
2. Expect: list and map prune to matching listings only.
3. Tap any result.
4. Expect: the detail view prominently shows accessibility notes above the photo.
5. **Pass criterion:** filter applies everywhere (map, list, search); clearing it restores all results.

### S9 — Deactivated account detection (5 min)
1. In the Supabase dashboard, set one test account's `is_active` to false while it is signed in on the device.
2. Force-close and re-open the app.
3. **Pass criterion:** user is signed out with a single clear message ("Your account has been deactivated. Contact support."). No crash, no hung state.

### S10 — Background/foreground realtime reconnect (5 min)
1. Open a bathroom detail with live status.
2. Send the app to background for ≥ 30 seconds.
3. Bring it back to foreground.
4. **Pass criterion:** realtime channel reconnects silently; status refreshes; no duplicated listeners.

### S11 — Rotation (2 min)
1. (If the device allows rotation for this app — it's locked to portrait in `app.config.ts`.) Verify portrait lock.
2. **Pass criterion:** rotation does not change layout; confirmation that portrait lock is in effect.

### S12 — Deep link to a deleted bathroom (3 min)
1. In Supabase, soft-delete one bathroom.
2. From another device or browser, open the deep link `stallpass://bathroom/<id>`.
3. **Pass criterion:** app routes to a friendly "This listing is no longer available" screen, not a crash or an infinite spinner.

### S13 — Low-RAM device stress (optional, 10 min, only if an Android Go device is available)
1. Install on a 1–2GB RAM device.
2. Run S1, S5, S10.
3. **Pass criterion:** no OOM; cold start ≤ 6 seconds; scrolling on search list is not visibly dropped.

## Recording

- During at least S3 (emergency flow) and S6 (code reveal), record the screen. These recordings feed launch-day social content.
- Capture one still of the map with pins clustered — crop for the Reddit seed posts.

## Filing bugs

Any failure gets a Sentry issue *and* a line in `docs/QA_BUGS_<date>.md` with:
- Scenario ID (S1, S2, …)
- Device + Android version
- Steps to reproduce
- Expected vs actual
- Severity (Blocker / Major / Minor / Cosmetic)

Blockers halt the `production` build. Majors get a decision — fix in v1.0 or defer to v1.0.1 hotfix. Minors and cosmetics get tickets for v1.1.
