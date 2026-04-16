# StallPass — Launch Dossier

**Compiled:** April 14, 2026 &nbsp;·&nbsp; **Target launch:** April 24, 2026 (10 days)
**Mission:** Equal and fair restroom access for all humans.

This is the master briefing for the StallPass launch. It replaces no other document — `LAUNCH_MANIFEST.md` remains the canonical repo-state source of truth — but it collects the decisions, copy, and execution plan that the seven-hat team (PM, Architect, Engineer, Designer, QA, Growth, Support) has agreed on.

---

## 1. What StallPass actually is

A phone-first, crowd-sourced map that tells anyone where the nearest real, usable, accessible bathroom is *right now* — whether they're a traveler in a strange city, a pregnant mom with a toddler at a street fair, a Crohn's patient ninety seconds from disaster, a construction worker judged by their boots at a café counter, or someone without housing who has been told "no" for the fourth time today.

**The product promise in one sentence:** *No one should have to beg, buy, or plead to find a bathroom.*

Everything downstream — the map, the codes, the ratings, the ads, the business features — is in service of that promise.

---

## 2. The Team (one brain, seven hats)

The minimum viable product-development team is seven roles. I am embodying all seven for this launch. When a decision gets made below, the hat responsible is named in parentheses.

| # | Role | What they own | How I'm carrying it |
|---|------|---------------|---------------------|
| 1 | Product Manager | Why, what, when, success metrics | Scope, roadmap, OKRs (§3) |
| 2 | Lead Architect | System design, contracts, non-negotiables | Manifest compliance, RLS review, offline/auth contracts |
| 3 | Mobile Engineer | Features, screens, data layer | Code changes, blocker fixes (§7) |
| 4 | UX/UI Designer | Flow, feel, first impression, a11y | UX audit, friction log (§6) |
| 5 | QA / Release | Builds, device matrix, submission | EAS pipeline readiness (§7) |
| 6 | Growth | Store listing, ASO, narrative, launch | Store copy, keywords, positioning (§5) |
| 7 | Support / Community | Reviews, reports, moderation | Review response template, abuse playbook (§8) |

Scaling beyond seven (Data, Legal, DevOps, Research) is a post-launch conversation. Do not add headcount before launch; it slows the ship.

---

## 3. Product scope — what ships in v1.0

### 3.1 In-scope (must ship to submit)
1. Map discovery with clustering and current-location centering.
2. Search with filters (accessibility, open now, has code, family-friendly, 24/7).
3. Bathroom detail: rating, cleanliness, access notes, code reveal (opt-in, gated by a rewarded ad *only*).
4. Favorites, fully offline-replayable.
5. Guest browsing (no login wall to *find* a bathroom — this is non-negotiable, per mission).
6. Submit new bathroom / submit code / flag report (signed-in users).
7. Emergency "Go Now" — one-tap nearest usable bathroom + native maps handoff.
8. Accessibility metadata: wheelchair, changing table, gender-neutral, free-to-use, no-purchase-required.
9. Offline cache of last-viewed region + favorites.
10. Account deactivation flow (GDPR-compliant).

### 3.2 Explicitly deferred to v1.1+ (do not build this week)
- Business claim flow (scaffolded; full verification waits).
- Badges and gamification beyond basic point display.
- Push notifications for favorite updates (infra exists; UX polish waits).
- iOS submission (Android first; iOS follows within 30 days).
- Paid tier / premium features.

### 3.3 Launch success criteria (first 14 days)
- Crash-free sessions ≥ 99.5%.
- D1 retention ≥ 35% (utility benchmark).
- Search-to-navigation conversion ≥ 25%.
- Zero store-policy rejections (Google Play).
- At least one unhoused-advocate organization has reviewed and blessed the accessibility framing.

---

## 4. Audit scorecard — repo state as of 2026-04-14

| Category | Status | Notes |
|----------|--------|-------|
| Code quality | PASS | Manifest confirms type-check, lint, Jest, expo config pass. Expo config re-verified today. |
| Env security | PASS (1 cleanup) | `.env*` correctly gitignored. No service-role keys in client code (they live only in Supabase Edge Functions, which is correct). `.env.local.backup` is tracked but contains placeholder values — harmless, flagged for cleanup. |
| Supabase / RLS | PASS | 44 migrations; 23 files enable RLS; 94 `CREATE POLICY` statements; `assert_active_user()` guard present. |
| Android config | PASS | `targetSdkVersion 36` (exceeds Google's Android 15/API 35 requirement). Package `com.stallpass.app`. EAS `production` profile uses `app-bundle` and `distribution: "store"`. |
| Location permissions | PASS | iOS `NSLocationWhenInUseUsageDescription` set; Android `ACCESS_FINE/COARSE_LOCATION` + `POST_NOTIFICATIONS` declared; risky perms (storage, mic, overlay) explicitly blocked. |
| Store assets | PARTIAL | Icon, adaptive icon, splash, feature graphic (1024×500), 8 phone screenshots, promotional banner, OG image — all present. **Missing:** 7" and 10" tablet screenshots (Play Store optional but recommended for "Top Utility"). |
| Privacy policy | BLOCKER | No `privacyUrl` configured anywhere in `app.config.ts`. Google Play will reject the listing without a live privacy policy URL. |
| Full-length store copy | BLOCKER | Short description written in checklist. Full 4000-char description, data-safety Q&A, and content-rating answers not yet drafted. Drafted in §5 below. |
| Demo account for reviewer | BLOCKER | Not created. Google Play won't always require one, but having it cuts review time. |
| Device verification | PARTIAL | Per memory, device testing began 2026-04-03. Manifest lists 4 unverified paths (Android location flow, map rendering, offline replay, iOS parity — iOS deferred). Must close Android items before submission. |
| EAS build | NOT RUN | Will trigger `preview` build first for real-device smoke, then `production` once blockers close. |

**Net verdict:** Code is launch-ready. Launch is blocked by *paperwork*, not engineering — privacy policy, store copy, demo account, one tablet screenshot pass. These are all 1–2 day items for a motivated team, well inside the 10-day window.

---

## 5. Growth deliverables — store listing, ASO, narrative

Full store copy lives in `docs/STORE_LISTING.md` (created alongside this dossier). Summary:

- **Short description (80 chars):** "Find the nearest open bathroom fast. Free. Accessible. For everyone."
- **App name:** "StallPass: Find Bathrooms Fast"
- **Primary keyword cluster:** bathroom, restroom, toilet, public, nearby, emergency, accessible, ADA.
- **Positioning axis:** utility + dignity. Competitors (Flush, SitOrSquat, Toilet Finder) compete on coverage. We compete on *access* — the promise that whoever you are, whatever you look like, you'll find a bathroom that will actually let you in.
- **Launch narrative arc:** "Built for the moment no one wants to talk about." Lead with relatable urgency (pregnant traveler, road-trip dad, Crohn's student), then widen to the dignity frame (unhoused neighbors, delivery drivers, field workers). This order prevents people from dismissing us as a "niche advocacy app" before they've felt the universal pain.

---

## 6. UX friction audit — the Designer's pass

Walking the app flow as a first-time user in an emergency (the hardest use case), these are the friction points that, if fixed, raise perceived quality most per hour of work:

1. **Empty states.** Every list and map view must have a designed empty state with a clear next action. Not a spinner. Not "No results." A sentence, an icon, and a button.
2. **Onboarding is invisible by design.** No forced tutorial. First launch = map centered on the user with three pins visible and the emergency button live. Permissions asked in context on first interaction, not on launch.
3. **The "Go Now" button is the hero.** It should be the largest, highest-contrast UI element on the home screen. Minimum 64×64pt touch target, minimum 72pt at rest.
4. **Code reveal flow.** The rewarded-ad gate must be *optional* and *labeled*. Free-to-use bathrooms never show this gate. Never. This is a mission line — gating a free public resource behind an ad is exactly what we are against.
5. **Loading states longer than 300ms need a skeleton.** Not a spinner.
6. **Error messages must name the recovery path.** Never "Something went wrong." Always "Can't reach the server — you can still browse your favorites while offline. [Retry]"
7. **Accessibility metadata must lead the detail view.** Wheelchair access, changing table, gender-neutral option, and "free / no purchase required" go above the photo, not below.
8. **Contrast audit.** Brand-600 on white, ink-900 on surface-base: verify WCAG AA ≥ 4.5:1 before submission. One hour of work.
9. **Haptics on one-tap actions.** Emergency button + code copy should trigger haptic feedback; it makes the product feel $10M even at $0M.
10. **The "Report" action is a dignity feature.** If a bathroom turned someone away or was filthy, reporting it should feel like solidarity, not a complaint. Rewrite the copy: "Help the next person → Tell us what happened."

---

## 7. Blockers list — what to actually fix this week

Ordered by severity. An asterisk means Daddy must do it, not me.

1. **Write privacy policy, host it, put URL in `app.config.ts` + Play Console.** (I can draft; you host at `stallpass.app/privacy` or on Notion/GitHub Pages.) — *blocker for submission.*
2. **Draft full Play Store listing copy** — done in `docs/STORE_LISTING.md` this session.
3. **Complete data-safety form answers** — drafted in §9 below. You paste into Play Console.
4. **Untrack `.env.local.backup`** (`git rm --cached .env.local.backup` — requires your approval since it's a destructive git op).
5. **Device-test the four Android paths from Manifest §3.4:** permission flow, map render, offline replay, cold start on low-RAM device. — requires your phone.
6. **Create reviewer demo account** in production Supabase with pre-populated favorites + one submitted code. Document credentials in Play Console's "App access" section.*
7. **Trigger a `preview` EAS build**, install on your device, run the QA scenarios from `LAUNCH_CHECKLIST.md` §8. Then trigger `production`.*
8. **Capture tablet screenshots** (7" and 10") — optional for submission, recommended for "Top Utility" tier.
9. **Final branded icon + splash pass** — current art is described as "placeholders unblocking prebuild" in the manifest. Decide if current art is launch-grade or needs a designer pass.
10. **Configure crash alert rules in Sentry** (crash rate > 1%, new-issue spike) — 15 min of clicking.

---

## 8. Support / community playbook

**Day 1 abuse vectors we will see:**
- Joke submissions ("White House bathroom, 5 stars").
- Spam coordinates in the ocean / Null Island.
- Gender-war comments on gender-neutral listings.
- Fake codes submitted to game the reveal ad.
- Locations flagged as "refused service" — legitimate reports we want, but also a harassment surface if businesses retaliate.

**Moderation defaults:**
- All new submissions enter a lightweight quarantine for 24 h or 3 community approvals, whichever comes first.
- Reports of a single bathroom ≥ 3 from distinct users auto-hide the listing pending human review.
- "Refused service" reports include an optional, *private-to-moderators* free-text field; never publicly attached to the business name without manual review.
- Appeals in-app (not email), routed to a single support queue.

**Review response template:** drafted in `docs/REVIEW_RESPONSE_TEMPLATES.md` (add if time permits this week — not a launch blocker).

---

## 9. Google Play Data Safety form — ready-to-paste answers

| Question | Answer |
|----------|--------|
| Do you collect or share user data? | Yes, collect; no, don't share with third parties beyond service providers. |
| Location — precise | Collected. Purpose: App functionality (finding nearby bathrooms). Not shared. Optional. Encrypted in transit. |
| Location — approximate | Collected. Same as above. |
| Personal info — Email | Collected. Purpose: Account management. Not shared. Required for signed-in features; guest browsing does not require it. |
| Personal info — User IDs | Collected. Purpose: Account management, analytics. Not shared. Required for signed-in features. |
| App activity — In-app search history | Collected. Purpose: App functionality (recent searches). Not shared. Optional. |
| App activity — Other user-generated content | Collected (submissions, reports). Purpose: App functionality. Shared with other users (the entire value proposition). |
| Device or other IDs | Collected (for analytics + crash). Purpose: Analytics, crash diagnostics. Not shared beyond service providers (Sentry). |
| Data encrypted in transit | Yes (HTTPS everywhere; Supabase TLS). |
| Users can request data deletion | Yes (account deactivation flow per migration 017). |

---

## 10. 10-day execution plan

Each day names the hat driving. Daddy is a consistent QA tester across the whole plan.

| Day | Date | Primary focus | Output |
|-----|------|---------------|--------|
| 1 | Mon Apr 14 | PM + Growth — this dossier + store copy | `docs/LAUNCH_DOSSIER.md`, `docs/STORE_LISTING.md` |
| 2 | Tue Apr 15 | Engineer — add `privacyUrl`; untrack `.env.local.backup`; verify Sentry prod DSN | Atomic PR |
| 3 | Wed Apr 16 | Designer — empty states, error message copy pass, contrast audit | Commits against `src/components/*` |
| 4 | Thu Apr 17 | QA — run `preview` EAS build on your phone; walk full device-matrix scenarios | Bug list |
| 5 | Fri Apr 18 | Engineer — fix bug list from day 4 | Atomic PR(s) |
| 6 | Sat Apr 19 | Growth — capture/retouch screenshots; tablet screenshots if time; create reviewer demo account | Assets folder updated |
| 7 | Sun Apr 20 | PM — privacy policy written, hosted, linked. Support queue routing set up. | Live URLs |
| 8 | Mon Apr 21 | QA — trigger `production` EAS build; internal-test track on Play Console | AAB uploaded |
| 9 | Tue Apr 22 | Growth + PM — final Play Console walkthrough: listing, data safety, content rating, pricing, countries, device exclusions | Submitted for review |
| 10 | Wed Apr 23 | Buffer — respond to Play review feedback if any; finalize launch-day comms | Launch-ready |

Google Play's first-review turnaround is usually 2–7 days; targeting submission on Day 9 leaves a realistic public launch on or around **Apr 30**. If submission clears faster, we move.

---

## 11. The "Catapult It" thesis — what makes StallPass go viral after launch

This is Growth's job on day 11+. Noted here so nothing gets dropped.

1. **Seed the unglamorous communities.** r/ibs, r/crohnsdisease, r/pregnant, r/roadtrip, r/uber, r/homeless, r/disabled. Not r/apps. The pain is the marketing — the people who hurt most will refer hardest.
2. **One unforgettable story per medium.** TikTok: a pregnant woman finding a bathroom in 20 seconds at a farmer's market. Reddit AMA: a Crohn's patient. LinkedIn: the accessibility/ADA angle for field-service and delivery companies. X: the dignity frame — one unhoused advocate quoting the app.
3. **Public-sector partnerships.** Every city has a parks department, an accessibility commissioner, a homeless services office. A free MOU giving a city anonymized usage data in exchange for them seeding their public restroom inventory is a 4-stakeholder win (city PR + accessibility advocates + us + users).
4. **Event-shaped growth.** Marathons, parades, pride, concerts, protests. One pre-event social push per event + a city-specific screenshot = 1,000 installs per event with zero paid spend.
5. **Never lose the thread.** Every feature we ever ship gets a "does this serve the person who has been told no?" gate. If it doesn't, it waits.

---

*Prepared by your seven-hat dream team. Let's ship.*
