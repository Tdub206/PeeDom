# Assess launch readiness and business

- Session ID: `019d2915-93f0-70a0-84b3-687784b2b7e7`
- Source: `transcripts/sessions/2026/03/26/rollout-2026-03-26T00-39-33-019d2915-93f0-70a0-84b3-687784b2b7e7.jsonl`
- Archived: `false`
- Message count: `79`

## User

`2026-03-26T07:45:26.922Z`

# AGENTS.md instructions for C:\Users\T\Desktop\PeeDom

<INSTRUCTIONS>
# ~/.codex/AGENTS.md

## General Working Agreements
- **Zero Placeholder Policy:** Never use `// TODO`, `// implementation goes here`, or dummy data. If a function is called, it must be fully implemented with production-grade logic.
- **Defensive Programming:** Every async operation must include a `try/catch` block, a loading state, and a user-friendly error handler.
- **Strict Typing:** Use TypeScript for everything. Avoid `any` at all costs. Interfaces must be descriptive and exhaustive.
- **Performance First:** Use `React.memo`, `useMemo`, and `useCallback` strategically to prevent unnecessary re-renders in mobile environments.
- **Tooling:** Prefer `pnpm` for all dependency management. Always run `npm run lint` and `npm test` after modifying logic.
- **Security:** Never hardcode API keys or secrets. Always use `.env` files and validated environment variables.

--- project-doc ---

# Pee-Dom Agent Operating Contract

This repository is a mobile-first application named Pee-Dom.

## Product Scope
Pee-Dom is a restroom-finder mobile application for iOS and Android users. It is built for launch readiness, reliability, offline tolerance, and app-store compliant mobile UX.

## Platform Priorities
1. Mobile-first behavior
2. Expo / React Native compatibility
3. TypeScript correctness
4. Supabase schema and RLS correctness
5. Offline-first behavior
6. Safe-area, navigation, permissions, and degraded-network handling
7. Production debugging, telemetry readiness, and launch hardening

## Engineering Constraints
- Prefer React Native primitives, Expo-compatible solutions, and TypeScript-safe patterns
- Do not introduce web-only assumptions into mobile flows
- Protect auth/session, location access, and user-submitted data
- Any change touching data flow must consider:
  - offline queue behavior
  - optimistic updates
  - retry semantics
  - idempotency
  - RLS implications
- Any change touching navigation must consider:
  - Expo Router route behavior
  - back-stack behavior
  - deep-link viability
  - modal interaction
- Any change touching maps/location must consider:
  - permission denial states
  - stale location
  - background/foreground transitions
  - battery and performance costs

## Review Standard
All agent reviews should evaluate:
- correctness
- edge cases
- race conditions
- offline behavior
- mobile UX regressions
- security/privacy issues
- Supabase/RLS impact
- launch risk

## Output Standard
Agents must produce:
- explicit assumptions
- concrete file targets
- exact code changes or diffs
- risks
- test checklist
</INSTRUCTIONS>

<environment_context>
  <cwd>C:\Users\T\Desktop\PeeDom</cwd>
  <shell>powershell</shell>
  <current_date>2026-03-26</current_date>
  <timezone>America/Los_Angeles</timezone>
</environment_context>

## User

`2026-03-26T07:45:26.922Z`

can you analyze the entire codebase for play store launch readiness as well as IOS app store readiness. I am resolving the graphics now for everything. I still need a business UI for the website where business have their customizeable dashboards. Please generate whatever files are needed. Lets get this thing done and out the door. In a seperate response i will ask you for testing constraints on emulators so leave that out for now

## Assistant (commentary)

`2026-03-26T07:45:44.228Z`

Using `$peedom-core-architect` and `$staff-mobile-engineer` for a full launch-readiness pass plus implementation of the missing business dashboard surface. I’m starting by mapping the repo structure, app targets, and release configuration so I can identify what is already shippable and what is still missing.

## Assistant (commentary)

`2026-03-26T07:45:55.882Z`

I’ve confirmed this is an Expo/React Native codebase with a separate `web/` surface. Next I’m reading the release-critical config, navigation, Supabase wiring, and current web implementation so I can separate launch blockers from the missing business dashboard work.

## Assistant (commentary)

`2026-03-26T07:46:17.333Z`

The core mobile shell is real and fairly mature: Expo Router, Sentry, React Query, offline handling, and Supabase are all present. I’m drilling into route coverage, native configs, and the website surface now to find the actual launch blockers and to see where the business dashboard should live.

## Assistant (commentary)

`2026-03-26T07:46:37.837Z`

`web/` is currently just a static landing surface, not a business portal yet. I’m checking the current HTML, Firebase hosting config, and the main mobile features around auth, permissions, ads, legal, offline, and submissions so I can both build the missing dashboard and document the true store-readiness gaps.

## Assistant (commentary)

`2026-03-26T07:47:02.120Z`

There’s already meaningful coverage in `__tests__`, which is a good sign, but I still need to verify whether the shipping paths match store policy and whether the business/admin surfaces are production-grade or just stubs. I’m reading the highest-risk modules next: config, auth, notifications, ads, updates, business claims, and the current mobile business tab.

## Assistant (commentary)

`2026-03-26T07:47:19.360Z`

The business and admin tabs are present in the mobile app, so I need to verify whether they are real operational surfaces or just placeholders. I hit a PowerShell path-escaping issue on those routes and am reopening them directly with quoted paths.

## Assistant (commentary)

`2026-03-26T07:47:46.113Z`

The mobile business portal is not a stub. It already has real claim tracking, analytics summaries, hours editing, and featured placements on-device. That changes the scope: the web gap is not “invent business features,” it’s “ship a credible browser-based dashboard surface that matches the existing business domain.”

## Assistant (commentary)

`2026-03-26T07:48:09.788Z`

The business domain is already backed by Supabase RPCs and typed data models, so the missing website can be grounded in real concepts instead of speculative marketing UI. I’m checking the release docs already in-repo and scanning for placeholder debt, store-policy mismatches, and unfinished legal or metadata surfaces before I start writing files.

## Assistant (commentary)

`2026-03-26T07:48:40.585Z`

The repo docs already contain launch checklists, but parts of them are stale against current store requirements. I’m now verifying the native Android surface and ads/privacy implementation directly, because that’s where launch-readiness usually breaks late.

## Assistant (commentary)

`2026-03-26T07:49:04.428Z`

The ads path actually includes consent gathering in code, which is better than the checklist suggests. I’m now checking account controls, privacy/export flows, and route coverage so I can distinguish “needs implementation” from “needs store metadata and hosted pages.”

## Assistant (commentary)

`2026-03-26T07:50:22.649Z`

I’ve confirmed one concrete Android policy mismatch already: the repo’s own checklist still says API 34, but Google Play’s official requirement for submissions has moved to Android 15 / API 35. I’m checking the generated Gradle values and then I’ll shift into editing: store-readiness docs plus the missing hosted website surfaces.

## Assistant (commentary)

`2026-03-26T07:50:46.440Z`

I have enough context to move from audit into delivery. The concrete work split is:

1. Verify release-critical gaps against the actual repo and current store requirements.
2. Generate hosted web surfaces that are currently missing for submission and business operations: business dashboard, privacy, terms, support, and updated landing links.
3. Update the repo’s launch docs so they reflect the real state of this codebase instead of stale assumptions.
4. Run validation (`lint`, `test`, and type check if practical), then summarize what is launch-ready, what I fixed, and what still needs non-code submission work.

## Assistant (commentary)

`2026-03-26T07:52:17.895Z`

A higher-order launch blocker surfaced: branding is inconsistent across the repo. The shipping app config and website say `StallPass`, while internal constants, legal copy, and several UI strings still say `Pee-Dom`. I’m measuring how widespread that is now, because store review metadata and legal URLs need one consistent public-facing name.

## Assistant (commentary)

`2026-03-26T07:53:32.613Z`

The main remaining unknowns are now narrower: whether location is requested contextually, whether release builds keep dev-only permissions out, and how much of the app is still using the old `Pee-Dom` brand. I’m spot-checking those paths before I edit the website and docs.

## Assistant (commentary)

`2026-03-26T07:54:33.107Z`

A debug build artifact showed `SYSTEM_ALERT_WINDOW`, which would be a real store blocker if it leaked into release. I’m checking the release manifest path directly before I call that out, because I don’t want to confuse dev-client permissions with production behavior.

## Assistant (commentary)

`2026-03-26T07:57:48.509Z`

The release manifest task ran longer than the shell budget, so I’m checking whether it produced the merged release manifest anyway. If it did, I can verify permissions without waiting for a full release build.

## Assistant (commentary)

`2026-03-26T07:58:14.115Z`

The public-brand evidence points one way: `app.config.ts`, the current website, and the social setup guides all point to `StallPass`, while `Pee-Dom` is mostly internal or stale UI copy. I’m going to standardize the public-facing web/legal/business surfaces around `StallPass` and call out any remaining repo-internal branding debt in the readiness report.

## Assistant (commentary)

`2026-03-26T07:59:03.524Z`

I’m starting file edits now in two tracks: first the hosted web surface (`web/`) so you have a real business dashboard plus privacy/terms/support pages, then a targeted cleanup of stale public-facing brand strings so the app and website are not presenting two different product names to the stores.

## Assistant (commentary)

`2026-03-26T08:05:21.844Z`

The first patch attempt was too large for the Windows patch tool in one shot. I’m splitting it into smaller edits so the website surface still lands cleanly without risking partial file creation.

## Assistant (commentary)

`2026-03-26T08:08:01.219Z`

The hosted privacy, terms, support, and landing pages are in place. I’m adding the actual business dashboard now with persistent widget customization and readiness-driven state, not fake analytics cards.

## User

`2026-03-26T08:10:20.295Z`

# Files mentioned by the user:

## StallPass_App_Store_Assets.zip: C:/Users/T/Desktop/PeeDom/StallPass_App_Store_Assets.zip

## My request for Codex:
heres my images and assets idk if they are relevant to your current tasks but there they are. can you place them in their according places within the local codebase

## Assistant (commentary)

`2026-03-26T08:10:36.705Z`

I’m switching to the asset drop now. I’ll inspect the ZIP contents, map each file to the app and web surfaces that currently reference launch art, and place them without disturbing the existing code paths.

## Assistant (commentary)

`2026-03-26T08:10:46.561Z`

The ZIP includes production-ready store assets, not just raw art. I’m reading its manifest and README now so I can map each file into the repo in a way that matches Expo, Android notifications, web OG previews, and store-upload folders instead of guessing names.

## Assistant (commentary)

`2026-03-26T08:11:42.446Z`

The ZIP includes both store-upload images and a few runtime/web assets. I’m checking the dimensions of the icon-related files before I overwrite anything so I only replace the assets that clearly match Expo and the website.

## Assistant (commentary)

`2026-03-26T08:12:49.279Z`

These assets are worth wiring in, not just storing. I’m extracting the full pack into a dedicated store-assets folder, then I’ll hook the runtime/web-relevant files into Expo and the hosted website.

## Assistant (commentary)

`2026-03-26T08:13:29.586Z`

The first import command was blocked because it tried to remove the existing target folder first. I’m rerunning it in a non-destructive way and only overwriting the specific asset files that should be refreshed.

## Assistant (commentary)

`2026-03-26T08:13:40.163Z`

I’ve imported the full asset pack into `assets/store/` and copied the runtime-ready files into the app and website. I’m patching the actual references now so the new icon, notification glyph, and social/web icons are the ones the codebase uses.

## Assistant (commentary)

`2026-03-26T08:14:30.030Z`

The import is done: the full pack lives under `assets/store/`, the Expo app icon has been refreshed from the ZIP, the Android notification icon is now wired into `app.config.ts`, and the hosted web pages now use the provided PWA and social preview assets. I’m verifying the file placements now, then I’ll continue the launch-readiness pass with these new assets folded in.

## Assistant (commentary)

`2026-03-26T08:15:02.923Z`

The asset pack confirms `StallPass` is the public-facing brand, so I’m cleaning up the stale in-app copy that still says `Pee-Dom`. That’s a real launch-readiness issue because store assets, legal pages, and runtime strings need to match.

## Assistant (commentary)

`2026-03-26T08:15:51.968Z`

The public brand cleanup is in progress. I’ve updated the obvious in-app and legal copy to `StallPass`; I’m running a remaining-string sweep now so I don’t leave mismatched reviewer-facing text behind.

## Assistant (commentary)

`2026-03-26T08:16:53.268Z`

The repo’s old checklist still claims API 34 and the previous brand name, so I’m correcting the stale launch checklist next. Then I’ll write a fresh audit doc that reflects what’s actually in this workspace today.

## Assistant (commentary)

`2026-03-26T08:18:00.601Z`

I’ve imported the asset bundle, wired the runtime/web assets that the codebase actually references, and I’m finishing the launch-readiness pass with a repo-backed report plus validation runs. Next I’m checking the current file state, then I’ll add the readiness document and run lint/tests so the remaining blockers are concrete.

## Assistant (commentary)

`2026-03-26T08:18:21.464Z`

I’ve confirmed the imported asset set and the current app/web wiring. I’m checking whether the bundle also includes assets we should promote into Expo config directly, then I’ll write the launch-readiness report and run the verification commands.

## Assistant (commentary)

`2026-03-26T08:18:54.369Z`

I’ve confirmed the repo scripts for `lint`, `test`, and `type-check`. One more quick pass on Expo config typing, then I’m writing the readiness report and moving straight into validation runs.

## Assistant (commentary)

`2026-03-26T08:20:37.615Z`

`rg` is blocked in this environment, so I’m falling back to PowerShell searches for the code-backed findings. After that I’m writing the audit document with exact file references and then validating the repo state.

## Assistant (commentary)

`2026-03-26T08:21:10.681Z`

I’ve got enough context to tighten the remaining gaps. I’m making one last asset/config pass now: promoting the adaptive icon background into Expo config, adding a web manifest for the imported PWA assets, and writing the launch-readiness report plus store-asset mapping before I run validation.

## Assistant (commentary)

`2026-03-26T08:22:54.343Z`

The first patch hit an encoding mismatch in the existing checklist file, so none of those edits are committed yet. I’m re-reading the exact file contents and then I’ll re-apply the patch cleanly in smaller chunks.

## Assistant (commentary)

`2026-03-26T08:25:28.076Z`

The code and asset changes are in place. I’m running `lint`, `type-check`, and `test` now so the remaining launch risks are based on actual repo failures rather than assumptions.

## Assistant (commentary)

`2026-03-26T08:25:56.942Z`

`type-check` passed. `lint` only failed on the new static website scripts because the repo ESLint setup is treating browser globals as undefined, so I’m fixing those scripts explicitly for the existing lint rules and then re-running validation.

## Assistant (commentary)

`2026-03-26T08:27:20.286Z`

Validation is clean now: `lint`, `type-check`, and the full Jest suite all passed. I’m doing one final repo-state sweep so the closeout is precise about what shipped and what still blocks store submission.

## Assistant (final_answer)

`2026-03-26T08:28:05.367Z`

Assets are placed and the missing web surfaces are generated. The full repo-backed launch audit is in [docs/launch-readiness-2026-03-26.md](C:/Users/T/Desktop/PeeDom/docs/launch-readiness-2026-03-26.md). The new business website UI lives at [web/business/index.html](C:/Users/T/Desktop/PeeDom/web/business/index.html), and the public submission pages are [web/privacy/index.html](C:/Users/T/Desktop/PeeDom/web/privacy/index.html), [web/terms/index.html](C:/Users/T/Desktop/PeeDom/web/terms/index.html), and [web/support/index.html](C:/Users/T/Desktop/PeeDom/web/support/index.html). I also wired the imported app/web assets through [app.config.ts](C:/Users/T/Desktop/PeeDom/app.config.ts) and [web/site.webmanifest](C:/Users/T/Desktop/PeeDom/web/site.webmanifest), and the full store bundle is preserved under `assets/store/`.

Launch-readiness is improved but not fully cleared yet. The main blockers are: no repo-visible iOS ATT flow despite AdMob/rewarded ads, manual App Privacy/Data Safety/App Access console work still outstanding, mixed `StallPass` vs `peedom` internal identifiers, and unverified production mailboxes/domain/release signing. The strongest repo-backed positives are guest mode, in-app account deletion, offline/retry plumbing, Sentry, business flows, and Android target SDK coverage. Google Play’s published policy currently requires API 35+ by August 31, 2025, and Apple Guideline 5.1.1(v) requires in-app account deletion, which this repo already supports. Sources: [Google Play target SDK](https://developer.android.com/google/play/requirements/target-sdk), [Apple Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/), [Apple ATT](https://developer.apple.com/documentation/apptrackingtransparency).

Validation is clean: `npm run lint` passed, `npm run type-check` passed, and `npm test -- --runInBand` passed with 41 suites and 190 tests. Testing/emulator constraints were intentionally left out for your next prompt.

## User

`2026-03-26T08:32:44.912Z`

what do you need from me in order to fix these issues:  The main blockers are: no repo-visible iOS ATT flow despite AdMob/rewarded ads, manual App Privacy/Data Safety/App Access console work still outstanding, mixed StallPass vs peedom internal identifiers, and unverified production mailboxes/domain/release signing.

## Assistant (final_answer)

`2026-03-26T08:33:09.855Z`

To clear those blockers, I need decisions and credentials more than code specs.

**1. iOS ATT / AdMob**
I need one product decision from you: on iOS, are we doing personalized ads/tracking, or are we staying non-personalized/contextual only?
If you want personalized ads, I’ll implement the ATT flow and pre-permission UX.
If you want non-personalized only, I’ll harden the ad path to avoid ATT dependency and make the disclosure language match that choice.
I also need to know whether rewarded ads must stay enabled on iOS for launch, or if you’re okay disabling them on iOS v1.

**2. App Privacy / Data Safety / App Access**
I need your store-console access or a handoff path.
If you want me to fully finish the forms, I need:
- App Store Connect access
- Play Console access
- Confirmation of what production services actually receive user data: Supabase, Sentry, Google Maps, AdMob, any analytics beyond that
- Your intended retention/deletion position for account data and reports
- Whether any features are login-gated for reviewers and whether you want a demo account created

If you do not want to share console access, I can still generate the exact answers and reviewer notes for you to paste.

**3. `StallPass` vs `peedom` identifiers**
I need a hard go/no-go decision:
- Keep internal IDs as `peedom` for launch and only ship public branding as `StallPass`
- Rename everything now

If you want the rename now, I need:
- Final iOS bundle ID
- Final Android package name
- Final deep-link scheme
- Confirmation whether any App Store Connect / Play app records already exist under current IDs
- Confirmation whether changing IDs would break existing provisioning, push setup, or submitted builds you care about

This is the biggest invasive change. If there is any schedule pressure, keeping internal IDs for v1 is the safer move.

**4. Domain / mailboxes / release signing**
I need the real production destinations:
- Final website domain
- Final support email
- Final privacy email
- Who is hosting the website or where I should prepare deployment for
- Whether EAS should manage signing or you already have Apple certs/profiles and Android keystore
- Production env vars: Supabase URL, anon key, Sentry DSN, Maps keys, AdMob IDs

If you already have signing assets, I need their current identifiers to avoid mismatches. If not, I can prepare the repo/config side and tell you exactly what to create in Apple/Google/EAS.

**Minimum you can send me right now**
Reply with these 9 lines and I can move immediately:

`ios_ads_strategy = personalized | non_personalized | disable_ios_ads`
`rewarded_ads_ios = yes | no`
`store_console_access = yes | no`
`rename_internal_ids = yes | no`
`ios_bundle_id = ...`
`android_package = ...`
`deep_link_scheme = ...`
`website_domain = ...`
`support_email / privacy_email = ...`

After that, I can take the next pass and either implement the code changes directly or generate the exact store submission package.

## User

`2026-03-26T11:36:44.907Z`

what were the plans for my api?

## Assistant (commentary)

`2026-03-26T11:37:01.511Z`

I’m checking the repo’s actual API shape and any planning docs so I can answer from what’s implemented, not from memory. I’ll pull the current API modules, env/config references, and any architecture notes that mention a backend plan.

## Assistant (commentary)

`2026-03-26T11:37:20.504Z`

The repo shape is pretty clear already: it’s mostly a Supabase-backed client, not a separate backend service today. I’m reading the actual plan doc and a couple of API modules now so I can tell you whether there was a planned standalone API layer or just typed client wrappers over Supabase/RPC.

## Assistant (final_answer)

`2026-03-26T11:38:37.745Z`

The repo does not look like it was planning a separate custom REST API as the primary backend. The actual plan in code is a Supabase-first API.

The shape is:
- Typed client wrappers in [src/api/bathrooms.ts](C:/Users/T/Desktop/PeeDom/src/api/bathrooms.ts), [src/api/business.ts](C:/Users/T/Desktop/PeeDom/src/api/business.ts), and the rest of `src/api/*`
- One shared Supabase client in [src/lib/supabase.ts](C:/Users/T/Desktop/PeeDom/src/lib/supabase.ts)
- Most business logic pushed into Postgres RPCs and views via the `supabase/migrations/` layer
- A few server-side edge functions for side effects, not as the main product API, for example [supabase/functions/send-push-notification/index.ts](C:/Users/T/Desktop/PeeDom/supabase/functions/send-push-notification/index.ts)

So the intended backend was basically:
1. Supabase tables/views for reads
2. Supabase RPCs for protected writes and business logic
3. Supabase Storage for photos
4. Edge Functions for push/jobs/integration work

There is an `apiBaseUrl` config entry in [src/constants/config.ts](C:/Users/T/Desktop/PeeDom/src/constants/config.ts), but I do not see a real app-facing custom API built around it. In practice, it looks like a placeholder for a future external service, not the current architecture.

If you want the plain answer: the plan for your API was “BaaS-backed mobile app with typed client modules over Supabase,” not “stand up a separate Express/Nest backend first.”

If you want, I can do the next pass and turn that into a concrete backend roadmap:
- keep Supabase as the API
- add a thin custom API only for sensitive ops
- or fully extract a dedicated backend service later

## User

`2026-03-26T11:41:13.981Z`

keep supabase. heres the answers to previous questions: ios_ads_strategy	non_personalized	Avoids ATT prompt rejection risk on first submission. You can upgrade to personalized later once approved and established. Less friction with Apple review.
rewarded_ads_ios	yes	Your code reveal system depends on rewarded ads for non-premium users. It's a core monetization feature — disabling it on iOS kills the free-tier unlock path.
store_console_access	yes	You need App Store Connect and Google Play Console accounts set up before you can submit anything.
rename_internal_ids	yes	Already done — app.config.ts now has com.stallpass.app for both iOS and Android, scheme is stallpass, slug is stallpass.
ios_bundle_id	com.stallpass.app	Already set in app.config.ts:67
android_package	com.stallpass.app	Already set in app.config.ts:82
deep_link_scheme	stallpass	Already set in app.config.ts:58
website_domain	stallpass.org	Your registered domain
support_email	support@stallpass.org	Your email — this goes in store listings and privacy policy
privacy_email	support@stallpass.org	Same address works. Apple/Google just need a reachable contact for privacy inquiries. No need for a separate one unless you want privacy@stallpass.org.

## Assistant (commentary)

`2026-03-26T11:41:47.980Z`

Using `$staff-mobile-engineer` and `$peedom-core-architect` here because this is release-critical mobile/backend configuration work. I’m verifying the current identifiers and ad stack in the repo first, then I’ll implement the non-personalized iOS path and any remaining StallPass renames directly.

## Assistant (commentary)

`2026-03-26T11:42:11.533Z`

Your identifier changes are already in place in the repo, so that blocker is effectively closed. I’m tightening the ad path now around your decision: keep rewarded ads on iOS, but force non-personalized handling so we stop carrying ATT-shaped risk into the first submission.

## Assistant (commentary)

`2026-03-26T11:42:52.674Z`

I’ve confirmed the rename is already landed in [app.config.ts](C:/Users/T/Desktop/PeeDom/app.config.ts). I’m updating the remaining launch-critical surfaces next: `.org` support/privacy contacts everywhere, and a runtime ad policy that forces iOS rewarded ads into non-personalized mode instead of relying on an ATT-shaped path.

## Assistant (commentary)

`2026-03-26T11:43:13.467Z`

I found the remaining policy mismatch: the current privacy copy still says “personalized ads,” which conflicts with your launch decision. I’m correcting the legal/support surfaces and the runtime ad request behavior together so the code, website, and disclosure text all say the same thing.

## Assistant (commentary)

`2026-03-26T11:43:44.953Z`

I’m editing the policy and contact surfaces now, along with the actual ad request code. After that I’ll run the same validation pass again so we know the non-personalized iOS path and `.org` switch didn’t break anything.

## User

`2026-03-26T11:44:02.396Z`

can you draft privacy policy and terms of service for site

## Assistant (final_answer)

`2026-03-26T11:44:16.205Z`

Yes. They’re already drafted in the site files:

- [privacy](C:/Users/T/Desktop/PeeDom/web/privacy/index.html)
- [terms](C:/Users/T/Desktop/PeeDom/web/terms/index.html)

They cover the core launch items:
- data collected, use, sharing, retention, deletion, and user controls
- ads/consent language aligned to StallPass
- business claims, moderation, prohibited conduct, warranties, and liability
- contact routing to `support@stallpass.org`

I also kept the in-app legal screen aligned in [app/modal/legal.tsx](C:/Users/T/Desktop/PeeDom/app/modal/legal.tsx).

If you want, the next pass can be a stricter “store submission / lawyer review” version with more formal clauses for California privacy rights, governing law, and dispute language.

## User

`2026-03-26T16:18:59.077Z`

yup yup. next pass. i want from here on out release build level of work. All the work that is done from here on out is final "Release Build" level code. Now run launch readiness and play store review

## Assistant (commentary)

`2026-03-26T16:19:23.919Z`

Using `$staff-mobile-engineer` and `$peedom-core-architect` again because this is now release-hardening, policy, and store-readiness work. I’m taking this in two tracks: first I’ll upgrade the privacy/terms copy to submission-grade language, then I’ll run a fresh Play/App launch review against the current repo and current store policies so the remaining blockers are exact.

## Assistant (commentary)

`2026-03-26T16:20:38.878Z`

I’ve got the policy sources and the current repo state. Before I rewrite the legal text, I’m checking the actual Android/iOS release config again so the launch review is based on the build inputs that would ship, not just the public pages.

## Assistant (commentary)

`2026-03-26T16:21:04.884Z`

I found a concrete Android release blocker in the repo: [android/app/build.gradle](C:/Users/T/Desktop/PeeDom/android/app/build.gradle) still signs `release` with the debug keystore. Expo’s current EAS docs say release signing is injected through `android/app/eas-build.gradle`, and this file is not imported here, so I’m fixing that path instead of leaving a store-breaking release config in place.

## Assistant (commentary)

`2026-03-26T16:22:45.494Z`

I found the most serious repo-level Play blocker: release signing is still unsafe in Gradle, and the production EAS profile is too implicit. I’m hardening the build config now, then I’ll fold those changes into the legal/docs pass and re-run validation.

## Assistant (commentary)

`2026-03-26T16:23:08.158Z`

I’m upgrading the site policies now rather than just tweaking the old copy. The goal is store-submission language: clearer scope, disclosure, deletion, ad-consent, moderation, and liability sections without leaving vague gaps for review.

## Assistant (commentary)

`2026-03-26T16:24:39.041Z`

The repo-side fixes are in. I’m updating the audit docs now so they stop reporting stale blockers and instead reflect the current release posture: non-personalized iOS ads, final StallPass identifiers, explicit store distribution, and fail-closed Android signing.

## Assistant (commentary)

`2026-03-26T16:25:50.343Z`

The release-hardening edits are done. I’m re-running the repo validation now so the final launch review reflects the current code, docs, and build config rather than the earlier state.

## Assistant (commentary)

`2026-03-26T16:26:23.053Z`

The code changes are sound, but one Jest suite broke because the new `react-native` import path is too eager for the current test setup. I’m removing that top-level import and switching to a lazy platform check so the runtime behavior stays the same without dragging RN into Node tests.

## Assistant (commentary)

`2026-03-26T16:26:49.822Z`

The test suite is clean again after the platform import fix. I’m doing one last lint pass and then I’ll close with the actual remaining release blockers, not hypothetical ones.

## Assistant (final_answer)

`2026-03-26T16:28:08.542Z`

**Findings**
1. `[P0]` Production credentials and Android signing assets are still the real launch blocker. The repo is now hardened so release builds fail closed until the required values exist, but you still need to provide them in EAS or CI. See [app.config.ts](C:/Users/T/Desktop/PeeDom/app.config.ts), [build.gradle](C:/Users/T/Desktop/PeeDom/android/app/build.gradle), and [eas.json](C:/Users/T/Desktop/PeeDom/eas.json).

2. `[P1]` Play Console and App Store Connect declarations are still manual. Code alone cannot finish Privacy/Data Safety/App Access/Ads/Content Rating. I packaged the current review state in [play-store-review-2026-03-26.md](C:/Users/T/Desktop/PeeDom/docs/play-store-review-2026-03-26.md) and the broader launch audit in [launch-readiness-2026-03-26.md](C:/Users/T/Desktop/PeeDom/docs/launch-readiness-2026-03-26.md).

3. `[P1]` The public support surfaces now exist, but they still need to be deployed and reachable on `stallpass.org` with a live mailbox. The relevant pages are [privacy](C:/Users/T/Desktop/PeeDom/web/privacy/index.html), [terms](C:/Users/T/Desktop/PeeDom/web/terms/index.html), and [support](C:/Users/T/Desktop/PeeDom/web/support/index.html).

No remaining repo-level code defect stood out above those operational blockers in this pass.

**What Changed**
I upgraded the site privacy policy and terms to submission-grade copy, kept the in-app legal screen current, removed the ATT-shaped iOS tracking config, forced iOS rewarded ads into a non-personalized path, made Android release signing fail if real signing secrets are missing, and made the EAS production profile explicitly store-distributed. The key files are [app.config.ts](C:/Users/T/Desktop/PeeDom/app.config.ts), [admob.ts](C:/Users/T/Desktop/PeeDom/src/lib/admob.ts), [build.gradle](C:/Users/T/Desktop\PeeDom/android/app/build.gradle), [privacy](C:/Users/T/Desktop/PeeDom/web/privacy/index.html), and [terms](C:/Users/T/Desktop/PeeDom/web/terms/index.html).

**Verification**
`npm run lint` passed. `npm run type-check` passed. `npm test -- --runInBand` passed with 41 suites and 190 tests.

For the policy side, the review was checked against [Google Play target SDK](https://developer.android.com/google/play/requirements/target-sdk), [Google Play review prep](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en), [Apple Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), and [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/).

The next hard step is not more code. It is you giving me, or setting in EAS, the production secrets and Android release signing material so we can generate a real submission artifact.

## User

`2026-03-26T21:15:28.310Z`

C:\Users\T\Desktop\PeeDom>eas build -p ios
The field "cli.appVersionSource" is not set, but it will be required in the future. Learn more: https://docs.expo.dev/build-reference/app-versions/
Project config: Slug for project identified by "extra.eas.projectId" (peedom-mobile) does not match the "slug" field (stallpass). Learn more: https://expo.fyi/eas-project-id
    Error: build command failed.

## Assistant (commentary)

`2026-03-26T21:15:53.513Z`

I’m checking the current Expo/EAS linkage in the repo first. The error is a config identity mismatch, so I need to see exactly where the old `peedom-mobile` project ID is still wired before I change anything.

## Assistant (commentary)

`2026-03-26T21:36:13.257Z`

I found one likely culprit already: [app.json](C:/Users/T/Desktop/PeeDom/app.json) still contains the old EAS project ID. I’m reading that file and checking whether the local Expo account is logged in so I can decide if I can relink this project cleanly from the terminal or if I need to stop at the repo-side fix.

## Assistant (commentary)

`2026-03-26T21:36:32.271Z`

You’re logged into the Expo account, so this is fixable from the terminal. The immediate mismatch is exactly what the error said: the repo evaluates to `slug: stallpass`, but [app.json](C:/Users/T/Desktop/PeeDom/app.json) still links the old EAS project ID, and that remote project is registered under `peedom-mobile`. I’m checking the linked project metadata now and then I’ll either relink or create the correct StallPass project.

## Assistant (commentary)

`2026-03-26T21:37:48.827Z`

I’ve got the repo-side fix path. I’m removing the hardcoded old EAS project ID, switching versioning to explicit local control, and making the config read a linked project ID from static config or env instead of forcing the stale fallback. After that I’ll try to relink the project from the CLI.

## Assistant (commentary)

`2026-03-26T21:38:21.481Z`

The stale EAS link is out of the repo now, and the config evaluates cleanly. I’m trying a fresh EAS project init from the logged-in StallPass account so the new `stallpass` slug gets a matching project ID instead of the old `peedom-mobile` link.

## Assistant (commentary)

`2026-03-26T21:38:47.074Z`

The EAS relink worked. The project is now linked as `@stallpass/stallpass` with a new project ID, so the original `peedom-mobile` slug mismatch is gone. I’m checking the linked config and the next build command surface now to confirm what the next actual blocker is, rather than stopping at the first one.

## Assistant (commentary)

`2026-03-26T21:39:09.298Z`

I found one more release-grade config issue while checking the build path: the production EAS profile wasn’t explicitly setting `EXPO_PUBLIC_ENV=production`, so a “production” build could still evaluate like a local build. I’m tightening that and pruning the static Expo config so the linked project ID is the only thing app.json carries.

## Assistant (commentary)

`2026-03-26T21:39:38.709Z`

The original EAS project mismatch is fixed. I’m running the build command one step further in non-interactive mode now to expose the next real blocker, which should be credentials or production envs rather than Expo project identity.

## Assistant (commentary)

`2026-03-26T21:39:55.429Z`

The Expo linkage problem is gone. The build now fails on the next correct gate: production secrets. I’m checking what, if anything, is already configured in EAS for the production environment so I can tell you the exact missing set instead of a generic list.

## Assistant (final_answer)

`2026-03-26T21:40:28.122Z`

The original EAS error is fixed.

I changed [app.json](C:/Users/T/Desktop/PeeDom/app.json), [app.config.ts](C:/Users/T/Desktop/PeeDom/app.config.ts), and [eas.json](C:/Users/T/Desktop/PeeDom/eas.json) so that:
- `cli.appVersionSource` is now set to `local`
- the stale `peedom-mobile` EAS link is gone
- the project is now linked as `@stallpass/stallpass`
- the new EAS project ID is `9277c80b-8194-4229-8054-f5c6f70a8cbe`

I verified that with `eas project:info`, and then reran the build path. The next blocker is now the correct one:

`eas build -p ios --non-interactive --no-wait`
fails on:
`Missing required environment variable for production build: EXPO_PUBLIC_SUPABASE_URL`

I also checked EAS directly:
`eas env:list --environment production`
returned:
`No variables found for this environment.`

So the next thing I need from you is the production env set. For this repo, the release gate expects:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `ANDROID_GOOGLE_MAPS_API_KEY`
- `IOS_GOOGLE_MAPS_API_KEY`
- `ANDROID_ADMOB_APP_ID`
- `IOS_ADMOB_APP_ID`
- `EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID`

Once you give me those values, I can load them into EAS and rerun the iOS build until we hit the next real blocker, which will likely be Apple credentials rather than config identity.
