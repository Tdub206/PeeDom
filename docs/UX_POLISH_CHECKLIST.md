# StallPass — UX Polish Checklist (Designer hat)

This checklist is what to walk through on a real device before production submission. The app already has thoughtful empty-state components (`FavoritesEmptyState`, `OnboardingScreen`, `TermsGate`, `ConfigurationErrorScreen`, `ForceUpdateScreen`). The goal of this pass is not to rewrite; it is to verify and fine-tune.

## 1. First-run impression (15 min)

- [ ] Fresh install → splash hides only when bootstrapping is truly done (no white flash).
- [ ] First screen after splash is the map centered on your approximate location (network-approximate is fine) with at least a few pins visible.
- [ ] No login wall between launch and the map.
- [ ] Location permission is requested in context on first interaction that needs it, not before.
- [ ] Notifications permission is deferred until after the user has favorited or submitted at least once.

## 2. The Go-Now / Emergency button (10 min)

- [ ] Button is the single most visible UI element on the home screen.
- [ ] Touch target ≥ 64×64pt (manifest says 64×64 verified — confirm on real device).
- [ ] Haptic on tap.
- [ ] Animation implies urgency but does not nauseate (no infinite pulse at full opacity; a subtle breathing scale is fine).
- [ ] Tapping without location permission gracefully prompts for it and retries.
- [ ] Tapping with no result nearby shows a designed empty state, not a spinner.

## 3. Core flows (30 min each)

### Search flow
- [ ] Text search accepts partial city names.
- [ ] Filters (accessible, open now, free, has code, family) are reachable in ≤ 2 taps.
- [ ] Applied filters are visually persistent (chip row or count badge).
- [ ] Clearing filters restores the full list without reload friction.

### Submit-a-bathroom flow
- [ ] Guest tapping “Submit” is routed to login with the intent to return.
- [ ] Required fields are clearly marked.
- [ ] Location-autofill from GPS is present.
- [ ] Photo upload is optional and clearly says so.
- [ ] Successful submission shows a confirmation with “What’s next? (it goes into review for 24h or 3 community approvals).”

### Code reveal flow
- [ ] Locked codes show a padlock icon and an explanatory line (“Unlocked by watching a short ad, or by contributing your own code”).
- [ ] Bathrooms marked free / no purchase required never show the lock.
- [ ] Tapping to unlock plays the rewarded ad, then reveals the code.
- [ ] Ad failure falls back gracefully (try again later, or submit your own).

### Favorites flow
- [ ] Guest sees the `FavoritesEmptyState` with the “Sign in to save” CTA.
- [ ] Signed-in user with zero favorites sees the “Browse search” CTA.
- [ ] Adding a favorite while offline queues and replays on reconnect (manifest confirms this works in code).

## 4. Accessibility (30 min)

- [ ] Every interactive element has `accessibilityRole` and `accessibilityLabel`.
- [ ] Map pins announce their name + “accessible” / “has changing table” when selected with TalkBack.
- [ ] Emergency button label includes urgency (“Find the nearest open bathroom now”).
- [ ] Text size respects OS-level large-text setting up to 200%.
- [ ] Brand-600 on white tested with a contrast checker → expect WCAG AA (≥ 4.5:1). If it fails, darken to the nearest shade that passes.
- [ ] Every icon-only button has a text alternative in its accessibility label.

## 5. Error states (20 min)

- [ ] No network: offline banner appears; cached data is served; submissions queue.
- [ ] API timeout (15s): shows “Can’t reach the server — try again” with retry; does not crash.
- [ ] Location permission denied: map still renders (default region); a chip prompts to enable permission.
- [ ] Supabase auth token expired mid-session: `refreshUser()` demotes to guest; user is not logged out mid-flow without a message.
- [ ] Push notification tap on a deleted bathroom: routes to a friendly “This bathroom was removed” screen, not a crash.

## 6. Small but memorable (10 min)

- [ ] Haptic tick on filter selection.
- [ ] The map pin animation on selection is smooth, not janky.
- [ ] Pull-to-refresh works on list screens and feels mechanical, not decorative.
- [ ] Long-press on a map pin offers “Copy address” and “Open in Maps.”
- [ ] Copying a code triggers a haptic confirmation and a toast: “Code copied.”

## 7. Done when

- Every box above is either checked or has a Sentry-tracked issue filed for v1.1.
- A screen recording of the emergency flow is captured for launch-day social.
