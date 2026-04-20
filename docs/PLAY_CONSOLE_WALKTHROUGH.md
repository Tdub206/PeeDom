# Google Play Console — submission walkthrough

Every field, in order, with the answer or the answer's source file. Follow this top-to-bottom the first time; after that it becomes a 45-minute pre-submission routine.

**Prereqs before you start:**
- [ ] `docs/STORE_LISTING.md` is finalized.
- [ ] Privacy policy is live at `https://stallpass.app/privacy` (content: `docs/legal/PRIVACY_POLICY.md`).
- [ ] Terms are live at `https://stallpass.app/terms`.
- [ ] Data-deletion page is live at `https://stallpass.app/delete-account`.
- [ ] Reviewer account exists (see `docs/REVIEWER_DEMO_ACCOUNT.md`).
- [ ] Production EAS build (`.aab`) is downloaded locally.

---

## Section A — Dashboard → App setup tasks

### App access
- Answer: **"All or some functionality is restricted"**
- Account credentials: from `REVIEWER_DEMO_ACCOUNT.md` §"Notes to paste"
- Any additional instructions: paste the bullet list from that same doc.

### Ads
- Answer: **Yes, my app contains ads.**
- Reason: Rewarded-video AdMob ads for optional code reveal only. Never banner, never interstitial, never mandatory.

### Content rating
- Start the IARC questionnaire. Answers:
  - Violence: None
  - Sexuality: None
  - Profanity: None (moderated UGC; treat as None)
  - Controlled substances: None
  - Gambling: None
  - Crude humor: None
  - Horror/fear: None
  - User-generated content: Yes — with reporting + moderation tools
  - User-to-user communication: No direct messaging
  - Location sharing: Device-side only; not shared peer-to-peer
  - Personal info collection: Email + optional display name
  - Digital purchases: No (launch)
- Expected ratings: **ESRB Everyone, PEGI 3** (content rating subject to IARC final determination).

### Target audience
- Target age groups: **13+** (not child-directed; mixed adult audience)
- Appeal to children: No
- Warnings/disclaimers to display: None required

### News app
- **No.**

### COVID-19 contact tracing
- **No.**

### Data safety
- Paste from `docs/LAUNCH_DOSSIER.md` §9 verbatim. Key answers:
  - Data collected: Yes
  - Data shared with third parties: No (processor-only exception)
  - Encrypted in transit: Yes
  - Users can request deletion: Yes
  - Categories:
    - **Location** — Precise and Approximate. Purpose: App functionality. Optional. Encrypted in transit. Not shared.
    - **Personal info** — Email, User IDs. Purpose: Account management, Analytics. Optional (required only for signed-in features). Encrypted in transit. Not shared.
    - **App activity** — In-app search history, Other user-generated content. Purpose: App functionality. Shared with other users (the map itself).
    - **App info & performance** — Crash logs, Diagnostics. Purpose: Analytics. Not shared beyond Sentry (processor).
    - **Device or other IDs** — Device ID. Purpose: Analytics. Not shared beyond processors.

### Government apps
- **No.**

### Financial features
- **No.**

### Health
- **No** (we are not a health app; medical-urgency users benefit, but we do not collect health data).

---

## Section B — Main store listing

### App name
- `StallPass: Find Bathrooms Fast`

### Short description
- Paste from `docs/STORE_LISTING.md`.

### Full description
- Paste from `docs/STORE_LISTING.md`.

### App icon
- `assets/icon.png` (512×512 square variant will be used by Play automatically). Confirm no alpha channel.

### Feature graphic
- `StallPass_App_Store_Assets/android/graphics/google_play_feature_graphic_1024x500.png`

### Video (optional but recommended for Top Utility tier)
- Defer to v1.0.1; add a 30-second screen-captured "Go Now" demonstration.

### Phone screenshots
- Upload all 8 from `StallPass_App_Store_Assets/android/screenshots/` (01–08).
- Minimum 2 required; 8 is the sweet spot.

### 7" and 10" tablet screenshots
- Deferred — Play will still accept the listing. Flag as v1.0.1 work.

### App category
- Category: **Maps & Navigation**
- Tags: up to 5, in priority order:
  1. Maps
  2. Navigation
  3. Travel
  4. Local
  5. Utilities

### Contact details
- Email: `support@stallpass.app`
- Phone: leave blank
- Website: `https://stallpass.app`

### Privacy policy
- URL: `https://stallpass.app/privacy`

---

## Section C — Pricing & distribution

### Free or paid
- **Free.**

### Countries
- **United States** only at launch. (Add Canada, UK, AU, NZ in v1.0.1 after moderation capacity proves out.)

### Device categories
- **Phones.** Exclude tablets for v1.0 (`ios.supportsTablet: false` in app.config.ts — make the same choice on Android until tablet screenshots exist).
- Exclude Chromebook and Android TV.

---

## Section D — Releases → Production → Create new release

1. Upload the production `.aab` from the EAS build.
2. Release name: `1.0.0 (1)` (first versionCode = 1, versionName = 1.0.0 per `app.config.ts`).
3. Release notes: paste the "What's new" block from `docs/STORE_LISTING.md`.
4. Review → Start rollout to production. Confirm the rollout percentage (default 100%, or start at 20% for safety; you can pick either — 20% recommended for first launch).

---

## Section E — Post-submission: watch for these

- Review typically completes in 2–7 days for new apps; sometimes 24h.
- If rejected:
  - Most common: privacy policy URL 404 or doesn't cover required data types. Re-check your hosted policy against the data-safety form.
  - Second most common: permission without justification in the description. Already addressed — the full description names why we use location and is explicit that it's not shared.
  - Third: crash in the reviewer's automated test pass. Check the Pre-Launch Report in Play Console; fix anything surfaced there and resubmit.
- If approved: schedule the launch-day social calendar (see `docs/LAUNCH_DAY_COMMS.md`).

---

## Quick-reference table

| Play Console field | Source |
|---|---|
| Title | `docs/STORE_LISTING.md` |
| Short desc | `docs/STORE_LISTING.md` |
| Full desc | `docs/STORE_LISTING.md` |
| Feature graphic | `StallPass_App_Store_Assets/android/graphics/` |
| Phone screenshots | `StallPass_App_Store_Assets/android/screenshots/` |
| Privacy policy URL | `https://stallpass.app/privacy` (host `docs/legal/PRIVACY_POLICY.md`) |
| Data safety answers | `docs/LAUNCH_DOSSIER.md` §9 |
| Content rating answers | this file, Section A |
| Reviewer credentials | `docs/REVIEWER_DEMO_ACCOUNT.md` |
| Release notes | `docs/STORE_LISTING.md` §"What's new" |
