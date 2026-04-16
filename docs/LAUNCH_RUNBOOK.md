# StallPass — Launch-Day Runbook

For T-0 and the 72 hours after. The on-call hat (you) reads this top-to-bottom before the submission clears, and keeps it open on launch day.

---

## 1. Pre-launch gate — all boxes must be checked before rollout

- [ ] Type-check, lint, tests, `expo config` all passing (see `LAUNCH_MANIFEST.md`).
- [ ] Privacy policy, Terms, and Data Deletion pages are live and returning 200 at their canonical URLs.
- [ ] Play Console "App content" section is 100% green.
- [ ] Production EAS build (`.aab`) uploaded and internal-tested on at least one real device by you.
- [ ] QA walkthrough (`docs/QA_DEVICE_WALKTHROUGH.md`) has been run; no open Blocker bugs.
- [ ] Sentry production DSN configured in EAS secrets and sanity-check event has been received in the Sentry UI.
- [ ] Production Supabase has been seeded with at least 50 bathrooms in your primary launch city (SF Bay area per `config.map.defaultRegion`). Empty maps kill first impressions.
- [ ] Reviewer demo account works end-to-end.
- [ ] Press pitch sent to 5–10 contacts (see `docs/LAUNCH_DAY_COMMS.md`).
- [ ] Social posts queued.

---

## 2. Rollout strategy

Recommendation: **staged rollout at 20% on Day 1, 50% on Day 2 if crash-free ≥ 99.5%, 100% on Day 3.**

Why staged: if a crash is hiding in a permission combination we didn't test, 20% contains the blast radius and still lets us hear from real users.

How to do it in Play Console:
- Create release → set "Rollout percentage" to 20%.
- Monitor Android Vitals hourly on Day 1.
- At 24h, if Crash-free user rate ≥ 99.5% and ANR rate ≤ 0.47% (Play's bar), bump to 50%.
- At 48h, if still green, bump to 100%.
- At any time, if crash rate climbs above 1% or a specific issue shows > 50 users affected, halt the rollout and push a hotfix.

---

## 3. Sentry alert specs

Create these rules in Sentry → Alerts before launch.

**Alert 1 — Crash spike**
- When: The number of events in an issue is more than **50** in **1 hour**
- Environment: production
- Action: email + push to your phone

**Alert 2 — New issue**
- When: A new issue is created
- Environment: production
- Filter: level ≥ error
- Action: email

**Alert 3 — Session crash-free rate drops**
- When: Crash-free session rate < **99%** over **1 hour**
- Environment: production
- Action: email + push

**Alert 4 — Regression**
- When: An issue marked resolved becomes unresolved
- Environment: production
- Action: email

**Alert 5 — User feedback submitted**
- When: A user submits feedback
- Action: email

Test each by firing a synthetic error before launch day (`Sentry.captureException(new Error('launch-day-smoke-test'))` in a dev build pointed at production DSN). Verify the alert lands. Delete the test issue.

---

## 4. Launch-day on-call protocol

- First 24 hours: check Play Console, Sentry, and the support inbox at the top of every hour. After that, quarterly for the remainder of the week.
- If a crash with > 10 affected users shows up: reproduce, ticket, hotfix within 24h if possible. If not possible, communicate in the support inbox autoresponder and halt the rollout.
- Every 4 hours during launch day: reply to Play Store reviews received in that window.
- At the end of Day 1, Day 3, and Day 7: write a short "what we learned" note into `docs/LAUNCH_LEARNINGS.md`.

---

## 5. Rollback procedure

Two kinds of rollback:

### 5a. JS-only issue (we have an OTA channel)
- Revert the offending commit.
- Push an Expo Updates OTA patch via `eas update --branch production --message "..."`.
- Users get the fix on next app open (within ~5 seconds).
- Add a line to the next release notes: "Hotfixed [issue] via OTA update on [date]."

### 5b. Native-level or metadata issue (requires new build/listing)
- Halt the rollout in Play Console immediately.
- Create a new release at `1.0.1 (2)` with the fix.
- Re-submit. Note in release notes: "This update addresses [issue]. Our apologies."
- If the original release caused data integrity issues, post a pinned "What happened" note at `https://stallpass.app/incident/<date>` and link from in-app.

---

## 6. Known launch-risk areas (watch these specifically)

1. **AdMob consent on EU devices.** We present the UMP prompt. A misconfiguration here is the most likely cause of a bad first-run experience for EU users. Since launch is US-only, this is low risk on Day 1 but will matter in v1.0.1.
2. **Map render on low-RAM devices.** react-native-maps can OOM on 1GB devices with lots of pins. Clustering is enabled; verify by watching ANR rate on Android Vitals.
3. **Location permission flow on older Androids.** Android 12 and earlier had different permission UX. Our minSdk should cover the supported range — verify against the `android/` Gradle config if any bug reports mention location not working.
4. **Deep links after submission.** `scheme: 'stallpass'` is declared. Verify `stallpass://bathroom/<id>` opens correctly from a real external link on a real device.
5. **Background realtime listener leaks.** If users report battery drain, suspect `useRealtime*` hooks not cleaning up on unmount.

---

## 7. Comms template for "we broke something"

If something breaks publicly, write before you fix:

> **Subject: StallPass issue — what happened and what we're doing**
>
> At [time local], we learned that [user-visible symptom]. We've halted the rollout at X% and are pushing a fix. [If data was affected:] No personal data was lost or shared. [Else:] Existing users are not affected. We'll update this note within [24h / 4h / 1h depending on severity]. If you have questions, reply to this email and we'll get back within 24 hours.
>
> Thank you for your patience.
>
> — StallPass

Post this at `https://stallpass.app/incident/<date>`. Link in-app from the offline banner if relevant.

---

## 8. Success signals (what "good" looks like on Day 7)

- Crash-free sessions ≥ 99.5%.
- ANR rate ≤ 0.47% (Play's bad-behavior threshold).
- D1 retention ≥ 35% (utility benchmark).
- D7 retention ≥ 20%.
- Avg Play Store rating ≥ 4.2.
- At least 3 organic posts outside your own seeding.
- At least one of: a city officially reaches out, an accessibility org reshares, or a journalist writes.

Anything less than that on Day 7 is not a failure — it's a data point about where to push harder in v1.0.1.

---

## 9. What to stop doing after launch

- Obsessively refreshing Play Console. Let the data accrue for 4-hour windows, not 4-minute ones.
- Responding to trolls. Use Template C once and move on.
- Adding features on the hype. The first two weeks are for listening, not building.
