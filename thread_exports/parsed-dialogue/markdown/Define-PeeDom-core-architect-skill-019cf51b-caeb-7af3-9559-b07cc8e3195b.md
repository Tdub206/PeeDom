# Define PeeDom core architect skill

- Session ID: `019cf51b-caeb-7af3-9559-b07cc8e3195b`
- Source: `transcripts/sessions/2026/03/15/rollout-2026-03-15T22-26-06-019cf51b-caeb-7af3-9559-b07cc8e3195b.jsonl`
- Archived: `false`
- Message count: `164`

## User

`2026-03-16T05:27:32.484Z`

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

# AGENTS.md (PeeDom Root)

## Repository Expectations & Tech Stack
- **Framework:** React Native via Expo (Managed Workflow) using Expo Router for navigation.
- **Backend:** Supabase. All data fetching must respect Row Level Security (RLS) and use the Supabase generated types.
- **Styling:** Use NativeWind (Tailwind CSS) for all UI components. Maintain a central `theme.js` or `tailwind.config.js`.
- **State Management:** Use Zustand for global client-side state and React Query for server-side caching.

## Production Due Diligence
- **Android/iOS Parity:** Use `Platform.OS` and `SafeAreaView` to ensure UI consistency. Handle the Android back button and keyboard offsets explicitly.
- **Validation:** Use `Zod` for all form validations and API response parsing.
- **Launch Readiness:** - Ensure `app.json` is updated with correct versioning and permissions.
    - Every new feature must include a corresponding test in `__tests__`.
    - Use Fastlane patterns for automated deployment preparation.

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- gh-address-comments: Help address review/issue comments on the open GitHub PR for the current branch using gh CLI; verify gh auth first and prompt the user to authenticate if not logged in. (file: C:/Users/T/.codex/skills/gh-address-comments/SKILL.md)
- gh-fix-ci: Use when a user asks to debug or fix failing GitHub PR checks that run in GitHub Actions; use `gh` to inspect checks and logs, summarize failure context, draft a fix plan, and implement only after explicit approval. Treat external providers (for example Buildkite) as out of scope and report only the details URL. (file: C:/Users/T/.codex/skills/gh-fix-ci/SKILL.md)
- playwright: Use when the task requires automating a real browser from the terminal (navigation, form filling, snapshots, screenshots, data extraction, UI-flow debugging) via `playwright-cli` or the bundled wrapper script. (file: C:/Users/T/.codex/skills/playwright/SKILL.md)
- staff-mobile-engineer: Use when Codex must operate as a staff-level mobile engineer for production mobile work: feature delivery, architecture decisions, refactors, launch readiness, performance tuning, test hardening, or deployment automation in React Native/Expo or native Android codebases. Apply this skill when the task needs zero-placeholder implementation, strict typing, defensive async handling, Supabase-aware data access, or mobile-specific release discipline. (file: C:/Users/T/.codex/skills/staff-mobile-engineer/SKILL.md)
- openai-docs: Use when the user asks how to build with OpenAI products or APIs and needs up-to-date official documentation with citations, help choosing the latest model for a use case, or explicit GPT-5.4 upgrade and prompt-upgrade guidance; prioritize OpenAI docs MCP tools, use bundled references only as helper context, and restrict any fallback browsing to official OpenAI domains. (file: C:/Users/T/.codex/skills/.system/openai-docs/SKILL.md)
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: C:/Users/T/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: C:/Users/T/.codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
</INSTRUCTIONS>

<environment_context>
  <cwd>C:\Users\T\Desktop\PeeDom</cwd>
  <shell>powershell</shell>
  <current_date>2026-03-15</current_date>
  <timezone>America/Los_Angeles</timezone>
</environment_context>

## User

`2026-03-16T05:27:32.487Z`

[$skill-creator](C:\\Users\\T\\.codex\\skills\\.system\\skill-creator\\SKILL.md) Skill Definition: PeeDom Core Architect
The Objective: Act as the specialized Lead Engineer for the PeeDom Android application. This skill’s primary goal is to automate feature development, refactoring, and deployment while strictly adhering to the established PeeDom project patterns.
Core Workflow Requirements:
1. PeeDom Stack Verification: Before implementing any feature, this skill must verify the current state of the PeeDom build (specifically checking the `Pee-Dom Final` architecture). It must align with the existing DI (Hilt/Koin), Navigation component, and UI patterns (Compose/XML) used in the project.
2. Integrity First: The skill must review the existing "PeeDom" project stack to ensure new features do not create circular dependencies or break existing `PeeDom` modules (e.g., core, data, or feature modules).
3. Deployable Feature Coding: When a feature is requested (e.g., "Add a new tracking metric"), the skill must:
   * Logic: Code the logic using PeeDom’s specific State management (e.g., MVI or MVVM with StateFlow).
   * Review: Cross-reference the implementation with `AndroidManifest.xml` and `build.gradle` to ensure all hooks are present.
   * Implement: Provide the complete, copy-pasteable code with exact file paths (e.g., `com.peedom.app.ui.features...`).
4. Refactoring & Cleanup: The skill is authorized to suggest optimizations to existing PeeDom code if it detects technical debt during a feature request, ensuring the project remains "Production-Ready."
Strict Behavioral Constraints:
* PeeDom Style Only: Use the specific naming conventions found in the PeeDom codebase (e.g., prefixes, package structures).
* No Generic Boilerplate: Never provide a "generic" Android solution. If the skill doesn't know how PeeDom handles a specific utility (like Analytics or Networking), it must ask for that specific file first.
* Dependency Locking: Only use versions and libraries already verified in the PeeDom `libs.versions.toml` or `build.gradle`.

## Assistant (commentary)

`2026-03-16T05:27:37.028Z`

Using `$skill-creator` to turn your definition into an actual Codex skill. I’m reading that skill’s workflow first, then I’ll scaffold the new PeeDom-specific skill in your local skills directory and keep it aligned with the project’s existing instructions.

## Assistant (commentary)

`2026-03-16T05:29:07.422Z`

The creator skill file is taking longer than expected to load directly, so I’m switching to a narrower read and locating the surrounding skill structure before I write anything. After that I’ll create the PeeDom skill with the right metadata and usage guidance.

## Assistant (commentary)

`2026-03-16T05:29:45.518Z`

Home-directory reads are unusually slow in this environment. I’m increasing the timeout and using simpler filesystem commands so I can finish the skill setup instead of guessing the format.

## Assistant (commentary)

`2026-03-16T05:31:24.183Z`

I have enough of the creator skill to follow its structure now. Next I’m checking the existing skill layout and the PeeDom project shape so the new skill encodes the right stack constraints instead of generic Android guidance.

## Assistant (commentary)

`2026-03-16T05:33:17.788Z`

The repo does not match a pure native Android app. It’s an Expo/React Native app with an `android/` prebuild surface, so I’m encoding that into the skill: it will verify whether a request belongs in Expo TypeScript, the generated Android layer, or both before doing any work.

## Assistant (commentary)

`2026-03-16T05:35:38.937Z`

I’ve verified the relevant repo surface: Expo Router, TypeScript, NativeWind, Zustand, React Query, Supabase, `app.config.ts`, and the generated `android/` layer. I’m creating a new local skill folder that teaches Codex to verify that stack first, treat native Android files as secondary to Expo config, and only use dependencies already present in `package.json` or the Android Gradle files.

## Assistant (commentary)

`2026-03-16T05:36:51.294Z`

The skill files are in place. I’m doing a quick content check now to make sure the wording stays strict enough for PeeDom but doesn’t encode false assumptions like Hilt, Koin, or Compose when this repo is currently Expo-managed.

## Assistant (final_answer)

`2026-03-16T05:37:10.022Z`

Created the skill at [SKILL.md](C:/Users/T/.codex/skills/peedom-core-architect/SKILL.md) and [openai.yaml](C:/Users/T/.codex/skills/peedom-core-architect/agents/openai.yaml).

I adapted your draft to the architecture that actually exists in this repo: Expo Router + TypeScript + NativeWind + Zustand + React Query + Supabase, with `android/` treated as a generated secondary surface. The skill now forces stack verification before work, prefers `app.config.ts` as the Android source of truth, refuses to invent Hilt/Koin/Compose/XML patterns unless those files really exist, and keeps the strict PeeDom constraints around dependency locking, full implementations, testing, and exact file paths.

I did not run `npm run lint` or `npm test` because no app code changed. If you want, I can also produce a stricter native-Android-only variant of this skill, but that would not match the current PeeDom repository as checked in today.

## User

`2026-03-16T06:48:18.980Z`

**Role:** You are the "PeeDom Senior Systems Architect." Your task is to implement the "World-Class" roadmap for the PeeDom app (React Native, Supabase, PostGIS, Expo). 

**Context:** The app is a bathroom-finding platform. The stack uses TanStack Query v5, Supabase-js, and Expo Location. You must maintain 100% architectural integrity with the existing `src/lib/supabase.ts` and `src/types/database.ts`.

**Objective:** Implement all 15 feature categories outlined in the roadmap in exhaustive detail. Do not provide "placeholders." Provide production-ready, typed, and tested code.

**Operational Protocol:**
Execute the following phases for EVERY feature (1.1 through 15.5):

1. **Database Schema:** Generate the SQL Migrations for Supabase (including RLS policies and PostGIS functions).
2. **Type Definition:** Update `database.types.ts` to reflect new tables/columns.
3. **Business Logic:** Create the TypeScript Hooks (using TanStack Query) or Services to handle data.
4. **UI/UX Component:** Build the React Native component using the project's existing styling patterns.
5. **Self-Debug:** Run a mental "Build Check" for missing imports, circular dependencies, or breaking changes to existing features.

**Feature Checklist to Implement (Exhaustive):**
1. **The Trust Engine:** Live Confidence UI, Verification Loops, Stale Code Expiration (Edge Functions), and Photo Proof.
2. **Gamification:** Points economy, Leaderboards, Badges, and Streaks logic.
3. **Map Tab:** Clustering, Radar Pulse animation, Bottom Sheet detail cards, and Filter Drawers.
4. **Push Notifications:** Expo Notifications setup for verification alerts and favorite updates.
5. **Advanced Search:** PostGIS full-text search with proximity bias.
6. **Profile Dashboard:** Contribution stats, Level/Tier system, and Privacy toggles.
7. **Premium Tier:** Ad-free logic, Offline city packs, and Arrival alerts.
8. **Business B2B:** Claimed bathroom dashboard, Verified badges, and Featured placement.
9. **Accessibility:** Detailed ADA schema (grab bars, door width) and VoiceOver/TalkBack labels.
10. **Real-time:** Supabase Realtime listeners for occupancy and code updates.
11. **Navigation:** In-app compass and "On My Way" banner status.
12. **Social:** Dynamic OG image share cards and Community City Feeds.
13. **Data Intel:** Heatmaps, Rotation detection, and Vandalism/Spam detection logic.
14. **Infrastructure:** Sentry integration, NetInfo offline management, Zod validation, and Zustand state.
15. **Moonshots:** AI Vision code recognition and Apple Watch/CarPlay boilerplate.

**Instructions for Output:**
- Start with **Section 1: The Trust Engine.** - After providing the code for each section, ask me: "Confirming Section [X] is integrated and running. Ready for Section [Y]?"
- Do not stop until all 15.5 features are coded, tested, and ready for deployment.

**Current Task:** Begin with **Section 14: Infrastructure** (Sentry, NetInfo, Zod, Zustand) to ensure the foundation is strong before we build the features.


1. The Trust Engine — Your Actual Moat
Most apps in this space are graveyards of stale data. PeeDom's entire value proposition lives or dies on whether users trust the data. Your schema already has confidence_score, up_votes, down_votes, last_verified_at, and lifecycle_status on codes — but none of this is surfaced meaningfully yet.
1.1 — Live Code Confidence UI
Don't just show a code. Show how confident the community is in it. A visual trust meter (filled bar, color-coded green → yellow → red) based on confidence_score + recency of last_verified_at + ratio of up_votes to down_votes would be immediately differentiating. A user glancing at a code with 94% confidence and "verified 2 hours ago" feels completely different from one with no signal.
1.2 — "I Just Used This" Verification Flow
After showing a code, prompt: "Did this code work?" Two taps — Yes / No. A "Yes" bumps up_votes, triggers a last_verified_at update, and awards the verifying user points. A "No" triggers the report flow. This is a viral loop: every code use becomes a data improvement event. You already have the code_votes table and update_code_vote_counts() trigger for exactly this — it just needs a UI moment.
1.3 — Stale Code Expiration Intelligence
Your expires_at and lifecycle_status fields exist but nothing drives them intelligently. A background Edge Function that runs nightly: if a code hasn't been verified in 90 days AND has recent "didn't work" votes, auto-transition lifecycle_status to expired and visibility_status to needs_review. This keeps the corpus clean without admin intervention.
1.4 — Photo Proof
Add a bathroom_photos table (bathroom_id, uploaded_by, url, photo_type: 'exterior' | 'interior' | 'keypad' | 'sign', moderation_status). A photo of the actual keypad or door sign alongside the code is worth more than 100 upvotes. This also gives you rich content for previews and social sharing.

2. Gamification — Your Growth Engine
Your points_balance field on profiles is a dormant nuclear reactor. Points exist in the schema but nothing earns or redeems them. This is the single highest-ROI gap in the entire codebase.
2.1 — The Points Economy
Define a clear earning structure in a point_events table:
ActionPointsAdd a new bathroom50Submit a code that gets verified25Verify someone else's code (vote)5Upload a photo15Report that leads to correction20First time a code you submitted reaches 10 upvotes100
2.2 — Badges / Achievements
A user_badges table with badge types like: first_flush (added first bathroom), code_breaker (10 verified codes), night_owl (added bathroom between midnight-6am), accessibility_hero (5 accessible bathrooms verified), city_expert_{city_slug} (top contributor in a city). These show on profiles, drive retention, and create social currency.
2.3 — Leaderboards
Weekly and all-time leaderboards by city, state, and globally. "Top Contributors in Seattle This Week." This drives competitive contribution from power users — the 10% who will add 90% of your data. Your existing profiles table + point events give you everything needed.
2.4 — Points → Premium Conversion
Let users spend points to unlock Premium features for a month. This creates a non-monetary path to premium that rewards your best contributors (your most valuable users) while keeping the upgrade incentive intact for everyone else. Your is_premium field is already there.
2.5 — Streaks
Daily contribution streaks (add, verify, or report anything). 7-day streak unlocks a cosmetic badge. 30-day streak gives a points multiplier for that month. Streaks are the single most powerful retention mechanic in community apps — see Duolingo, GitHub. You'd store current_streak, longest_streak, last_contribution_date on profiles.

3. The Map Tab — The Heart of the App
The map tab is currently a Phase 1 scaffold that says "Phase 1 Scaffold." This is the primary product surface and the most important thing to build well.
3.1 — Clustered, Color-Coded Pins
Standard map with react-native-maps clusters. But color-encode the pins: green = open + unlocked, yellow = locked (code available), red = locked (no code), grey = unverified/unknown hours. At a glance, a user knows the state of every bathroom without tapping a single one. This is the kind of detail that separates "functional" from "delightful."
3.2 — The Live Radar Pulse
When a user's location is active, animate a subtle radar pulse ring from their position outward. When the nearest open bathroom is found, a path-line draws to it. This is a one-time animation but it makes the app feel alive and purpose-built rather than generic.
3.3 — Bottom Sheet Detail Cards
@gorhom/bottom-sheet is already in your pending packages list. When a user taps a pin, a bottom sheet slides up with the bathroom's full detail: confidence score, access code (gated if locked), photos, cleanliness rating, hours, quick-action buttons (Favorite, Report, Verify Code, Navigate). This is the pattern that every polished map app uses and it works because it keeps the map visible while showing detail.
3.4 — "Navigate Here" Deep Link
One-tap Apple Maps / Google Maps / Waze handoff. Linking.openURL('maps://...') or Linking.openURL('https://maps.google.com/...') with the bathroom's coordinates. This is a top-3 user action after "what's the code" and it's currently missing from the schema entirely (no navigation tracking).
3.5 — Map Filter Drawer
Filter by: Open Now, Accessible (ADA), No Code Required, Customer-Only, Cleanliness Rating ≥ X. Your schema supports every single one of these filters already. This feature costs maybe 3 hours of work and dramatically improves the core use case for accessibility-focused users.
3.6 — Offline Map Tiles
Cache map tiles for the user's current city on first open. When offline, the map still renders. Combine with your offline bathroom cache and a user can use PeeDom on an airplane, in a tunnel, or in an area with bad signal. This is technically possible with react-native-maps and your existing storage.ts infrastructure.

4. Push Notifications — Retention Engine
Currently zero push notification infrastructure. This is a significant retention gap.
4.1 — "Your Code Was Verified"
When a code you submitted gets 5 upvotes: "Your code for Pike Place Bathroom was just verified by 5 people! +25 points." This creates an emotional reward loop that brings users back.
4.2 — Favorite Bathroom Alerts
When a favorited bathroom's hours change, it gets flagged, or a new code is submitted: "Pike Place Bathroom now has a new access code!" You already have the favorites table. This is a single Supabase Realtime listener per user's favorite list.
4.3 — Nearby New Bathrooms
Weekly: "3 new bathrooms were added near your home location this week." This keeps users engaged even when they don't open the app.
4.4 — Code Expiration Warning
"The code you submitted for City Hall Bathroom expires in 3 days. Know the updated code?" Drives re-engagement with zero friction.
Implementation: expo-notifications + Supabase Edge Functions as the trigger layer. Store push_token on profiles.

5. Search — The Underrated Core Feature
The search tab is a scaffold. Search in a location app is usually the #2 most-used feature after the map.
5.1 — Smart Search with PostGIS Full-Text
PostgreSQL tsvector full-text search on place_name, address_line1, city combined with ST_DWithin proximity bias. A user searching "Starbucks" or "Pike Place" near their location should surface the closest matching bathroom instantly.
5.2 — Search History + Recents
Store the last 10 searches locally (AsyncStorage). Show them as chips when the search bar is focused. This is a $0 feature that makes the app feel polished and personal.
5.3 — City/Neighborhood Browse
Beyond the map, let users browse by city → neighborhood → list. A user planning a trip to NYC can browse "Manhattan" → "Midtown" → see all bathrooms before they arrive. Your PostGIS geom column makes geographic grouping trivial.
5.4 — Contextual Search Filters
"Open Now" toggle, "Accessible" toggle, distance radius slider (0.5km / 1km / 2km / 5km). Built into the search results header. Your schema handles all of these.

6. The Profile Tab — Identity & Contribution History
Currently shows email or "Not logged in." This is a missed opportunity for community identity.
6.1 — Contribution Dashboard
Total bathrooms added, codes submitted, codes verified, reports filed, photos uploaded, current points, current streak, longest streak, badges earned. This is the profile page of a power user's proudest achievements. It's also a growth mechanic: users who can see their contribution history are dramatically more likely to keep contributing.
6.2 — Level System
Tie points_balance to a visible level (1-50, named tiers: Beginner → Explorer → Navigator → Pathfinder → Legend). Show the current level and a progress bar to the next. This is the core retention mechanic from RPG games applied to community contribution.
6.3 — My Bathrooms
A tab showing every bathroom the user added, with edit capability. Users who add bathrooms want to maintain "their" bathrooms. Your created_by field on bathrooms makes this a simple filtered query.
6.4 — My Codes
Every code submitted, with live vote counts and confidence scores shown. Users can see which codes are trusted and which ones need replacement.
6.5 — Privacy Controls
Let users choose: show username on contributions publicly, or contribute anonymously. This is especially important for users who are frequent travelers (business users, parents) who don't want their location patterns inferred from their contribution history.

7. The Premium Tier — Sustainable Revenue
Your is_premium field exists but nothing sits behind it. Here's what premium should unlock:
7.1 — Instant Code Reveal (No Ad)
The core ad-wall mechanic (which we just built) is the free tier. Premium bypasses the wait entirely. This is the simplest, most compelling premium value prop: "Never watch an ad for a code again."
7.2 — Offline City Packs
Pre-download all bathrooms + map tiles for a city. Premium users traveling to Chicago can download the entire Chicago dataset the night before. Each city pack is ~2-5MB. Stored via your existing cacheManager.
7.3 — Code Alerts Before You Arrive
Premium users can set destination alerts: "I'm heading to the Chicago Convention Center area. Alert me to any bathroom code changes 30 minutes before I arrive." Requires push notifications + a simple destination-watching mechanism.
7.4 — Advanced Filters
Filter by cleanliness rating minimum, "recently verified codes only," baby changing station (new field), family restroom (new field). Free users get basic filters; premium gets granular.
7.5 — Ad-Free Everywhere
Obviously.
Pricing recommendation: $2.99/month or $19.99/year. The monthly feels like nothing and converts people who would balk at $20 upfront. The annual is your actual sustainable revenue.

8. Business Tier — B2B Revenue
Your business_claims table and business role in profiles are ready for a complete B2B product. This is potentially your highest-revenue segment.
8.1 — Claimed Bathroom Dashboard
A business that claims a bathroom gets a dashboard showing: weekly view count, favorite count, code verification rate, cleanliness rating trend, recent reports. This is analytics data that businesses would genuinely pay for.
8.2 — Verified Business Badge
A blue checkmark on claimed bathrooms. Increases trust, drives business owners to claim their locations (free marketing for PeeDom), and signals quality to users.
8.3 — Business-Managed Hours
Claimed businesses can update hours directly. Community reports of "incorrect hours" route to the business owner as a task, not just to your moderation queue. This scales your data accuracy without scaling your moderation cost.
8.4 — Featured Placement
Paid placement: businesses can pay to appear at the top of the nearest-bathroom list and in search results with a "Sponsored" tag. Coffee shops, restaurants, and hotels would absolutely pay for this because it drives foot traffic from users who are already nearby and in need.
8.5 — Multi-Location Management
For chains (Starbucks, McDonald's, etc.) — a bulk management API where a brand can manage all their locations at once. This is your enterprise tier at $199-999/month depending on location count.

9. Accessibility & Inclusion — The Killer Differentiator Nobody Else Has
9.1 — ADA Accessibility Data Model
Expand is_accessible (currently a boolean) into a structured accessibility_features JSONB column:

has_grab_bars
door_width_inches
is_automatic_door
has_changing_table
is_family_restroom
is_gender_neutral
has_audio_cue

No other bathroom app in the world has this level of detail. This makes PeeDom the app for wheelchair users, parents with infants, and trans/non-binary people. These communities are underserved, passionate, and vocal. They will evangelize an app that genuinely serves them.
9.2 — Accessibility-First Filter Mode
A dedicated "Accessible Mode" that re-orders the entire UX: nearest fully accessible bathroom first, always. Remembers the preference. Trans/non-binary users get "Gender-Neutral First" mode.
9.3 — VoiceOver / TalkBack First-Class Support
Every touchable element with accessibilityLabel, accessibilityHint, accessibilityRole. The distance and status read aloud when a bathroom is selected. Screen reader users currently cannot use any bathroom finder app adequately. Solving this wins a passionate community.

10. Real-Time Features — The "Alive" App
10.1 — Supabase Realtime Code Updates
When someone submits or verifies a code for a bathroom you're currently viewing, it updates live. "Someone just submitted a new code — tap to reveal." This is Supabase Realtime on bathroom_access_codes with a channel per bathroom_id. Implementation: ~50 lines of code for a feature that makes the app feel like it's breathing.
10.2 — Live Occupancy Reports
A new bathroom_status_events table: bathroom_id, reported_by, status: 'clean' | 'dirty' | 'closed' | 'out_of_order', expires_at (2 hours). Show a live status badge: "Reported dirty 45 minutes ago." Expires automatically. This is the equivalent of Waze's live traffic reports applied to bathrooms. The social, transient nature of it makes reporting feel impactful rather than permanent.
10.3 — "Someone Is Here Now"
Anonymized: "3 people used this bathroom in the last hour." A simple event log (bathroom_id, timestamp only — no user link for privacy). Creates a sense of community validation: a bathroom with recent activity feels safer and more reliable.

11. Navigation & Wayfinding — Closing the Loop
11.1 — In-App Compass Mode
When a user selects a destination bathroom, show an AR-style compass pointing toward it with distance. Uses device compass + location. This is the "last mile" feature — once you know which bathroom, how do you get there? The compass works even when the user doesn't want to open Maps.
11.2 — "On My Way" Mode
A persistent banner at the bottom: "2 minutes to Pike Place Bathroom · Open · Code: 4821." Shows the code prominently so the user doesn't have to navigate back to find it. Activates when you tap Navigate. Clears when you've been stationary at the location for 2+ minutes.
11.3 — Apple Maps / Google Maps Integration
Deep link handoff with a single tap. The bathroom address + name is pre-populated. Takes 1 hour to implement and dramatically completes the user journey.

12. Social Features — Organic Growth
12.1 — Share a Bathroom
Deep-link shareable cards: "Found a clean, unlocked bathroom at Pike Place Market → peedom.app/b/[id]" A dynamic OG image generated via Supabase Edge Functions showing the bathroom name, cleanliness rating, and a map pin. This is organic acquisition — every share is a install prompt.
12.2 — "My City" Community Tab
A feed of recent activity in the user's city: new bathrooms added, codes verified, high-rated cleanups reported. Creates a sense of local community. Shows contribution counts for the city this week. The engagement mechanics here mirror neighborhood apps like Nextdoor but for a specific, high-intent use case.
12.3 — Lists / Collections
Let users create and share curated lists: "Best Bathrooms Near the Chicago Riverwalk," "Clean Bathrooms at LAX." Other users can follow, fork, or save these lists. This is the Pinterest/Google Maps saved lists mechanic applied to PeeDom. Your favorites system is the foundation — extend it with a lists table.

13. Data Intelligence — Making PeeDom Smarter Over Time
13.1 — Hourly Cleanliness Heatmap
Aggregate cleanliness_ratings by hour-of-day and day-of-week per bathroom. Show a "Best time to visit" insight: "Usually cleanest between 8-10am on weekdays." This is pure SQL aggregation on data you're already collecting.
13.2 — Code Rotation Detection
If a bathroom receives a high volume of "code didn't work" reports in a short window, automatically flag it as needs_review, notify recent code submitters, and push a notification to users who have this bathroom favorited. This is a Supabase Edge Function triggered by a pattern in code_votes.
13.3 — Spam/Vandalism Detection
A new user submitting 20 codes in 10 minutes is suspicious. A user whose codes have a 90% downvote rate is submitting garbage. Edge Function analysis: rate-limit new users to 5 code submissions per day, auto-suspend accounts whose codes average <30% upvote rate. Your is_suspended field on profiles is already there waiting for this logic.
13.4 — Geographic Coverage Intelligence
A coverage map in the admin dashboard showing bathroom density by neighborhood. Identify deserts — areas of a city with no PeeDom bathrooms. Run targeted acquisition campaigns: "Help fill in downtown Austin! We have gaps here." Push notification to local users: "Your neighborhood has only 2 bathrooms mapped. Be the first to add more!"

14. The Missing Technical Infrastructure
These aren't features — they're the invisible layer that makes a world-class app vs. a good app.
14.1 — Sentry Error Tracking
@sentry/react-native is in your pending packages. Without it, you're flying blind in production. Every crash, every unhandled promise rejection, every performance degradation — invisible. This should be the very first package installed before Phase 4.
14.2 — NetInfo → Online Manager
@react-native-community/netinfo is pending. Wiring it to TanStack Query's onlineManager (you have a query-client.ts where this belongs) means queries automatically pause when offline and resume + refetch when connectivity returns. This is a 10-line implementation that makes your offline architecture complete.
14.3 — Zod Validation Everywhere
zod is pending. Every Supabase RPC response, every user-submitted form, every mutation payload should be validated at runtime. This prevents silent data corruption bugs that only surface as confused user reports months later. Your mutation registry pattern (planned in the TRD) is where Zod validators belong.
14.4 — Zustand for Client State
zustand is pending. AuthContext is documented as overloaded. Decompose: Zustand store for session state + AuthService class for auth operations + lean AuthProvider for React tree integration. This also gives you a clean place for map state (current region, active filters, selected bathroom) without prop drilling.
14.5 — GitHub Actions — Correct Workflow
Your current CI workflow is npm-publish — wrong type for a mobile app. Replace with: type-check → lint → EAS Preview build on PR → EAS Production build on main merge. This is the foundation of shipping with confidence.
14.6 — Analytics (Privacy-First)
analyticsEnabled: false in config. You need to know: what's the most-searched term? Which bathrooms are viewed most? Where do users drop off in the add-bathroom flow? PostHog (self-hosted on Supabase) or Mixpanel. The data you don't collect today is the product decision you can't make in 6 months.

15. The Moonshots
These are the features that would make PeeDom talked about.
15.1 — AI Code Recognition
Let users photograph the keypad/door code sign. Run it through OpenAI Vision (or on-device ML) to extract the code automatically. Code submission goes from "type 4 digits" to "take a photo." Accuracy + friction reduction in one move.
15.2 — Indoor Positioning (Malls, Airports)
Partner with airport/mall navigation SDKs (HERE, IndoorAtlas) to show bathroom locations within a building — not just "the airport" but "Terminal B, Gate 45, left of the Hudson News." This is a technical moonshot but would generate massive press coverage and is genuinely useful in the places people most desperately need it.
15.3 — Wearable Companion
An Apple Watch app that shows nearest bathroom distance and lets you mark "I used this, code worked" with a single tap. Wearable integration gets tech press coverage disproportionate to the development effort.
15.4 — iOS Widgets
"Nearest Bathroom" lock screen widget. Shows distance, status, and code if unlocked. Update every 30 minutes via background fetch. A widget visible without opening the app is the definition of utility-first design.
15.5 — CarPlay / Android Auto
Show nearby bathrooms while driving. Huge road trip use case. Tap to navigate. Apple provides CarPlay templates that make this achievable in a few days once the core app is mature.

Priority Order (Based on Your Codebase Readiness)
Given what's already built, here's the sequence that maximizes impact per engineering hour:
Immediate (Phase 4 pre-req): Sentry + NetInfo + Zod + Zustand. Zero user-visible, 100% essential.
Phase 4 core: Map tab (clustered pins, bottom sheet detail, filter drawer) + Search tab (full-text + filters) + Profile tab (contribution stats, points, level).
First major feature drop after launch: Points/gamification economy + badge system + verification loop ("Did this code work?"). This converts your data model from passive to active.
Second major feature drop: Push notifications + Supabase Realtime code updates + live occupancy status. This makes the app feel alive.
First revenue milestone: Premium tier (ad-free + offline packs + instant code reveal) + Business claimed bathroom badges.
The accessibility push: Expanded accessibility_features JSONB + VoiceOver/TalkBack audit + gender-neutral filter. This wins a community that will evangelize loudly.

The One Thing Nobody Else Will Tell You
Everything above is buildable. But the actual moat of PeeDom isn't the tech — it's the trust loop. The app where users believe the codes actually work, the cleanliness ratings are honest, and the data is current. Every feature above either contributes to that trust or leverages it. The moment a user gets into a building with a code they found on PeeDom, reliably, two or three times in a row — that's when PeeDom stops being an app they downloaded and starts being something they tell people about.
Your schema already knows this. The confidence_score was designed for exactly that moment. The work is making it visible, making it feel real, and making users feel like their verification action actually mattered.
That's the path to world-class.

## Assistant (commentary)

`2026-03-16T06:48:34.881Z`

Using `staff-mobile-engineer` for this turn because the request is production mobile architecture work on the live PeeDom repo. I’m verifying the current Section 14 surface first so I only implement the missing infrastructure, not duplicate what already exists or break the Expo-managed Android setup.

## Assistant (commentary)

`2026-03-16T06:48:57.022Z`

A lot of Section 14 already exists in partial form. I’m drilling into what is missing versus what just needs hardening: query online management, runtime validation boundaries, store decomposition around auth/map state, CI behavior, and analytics plumbing.

## Assistant (commentary)

`2026-03-16T06:49:43.576Z`

The repo already has a lot of the raw pieces, but they’re fragmented. I’m moving from audit to implementation now: query online management, auth store decomposition, runtime validators around Supabase responses, stronger Sentry user context, privacy-first analytics wiring, and CI alignment with EAS preview/production flows.

## Assistant (commentary)

`2026-03-16T06:52:34.988Z`

I have the implementation plan pinned down. The edits are going into the infrastructure layer only: new query lifecycle and analytics modules, a dedicated auth Zustand store, runtime Supabase parsers, Sentry hardening, targeted auth/offline instrumentation, and CI workflow corrections.

## Assistant (commentary)

`2026-03-16T06:55:45.580Z`

I’m in the auth layer now. This is the highest-risk part of Section 14 because it’s where Sentry identity, analytics identity, session bootstrap, and the new Zustand-backed session store all meet, so I’m keeping the public `useAuth()` contract stable while moving the state management underneath it.

## Assistant (commentary)

`2026-03-16T06:57:11.555Z`

The runtime and client changes are mostly in. I’m aligning CI next so the repo’s automation matches the architecture we’re enforcing in code: verification on every PR, preview EAS builds on non-fork PRs, and production EAS builds on `main` and tagged releases.

## Assistant (commentary)

`2026-03-16T06:58:46.646Z`

I’ve moved into verification hardening. I’m adding pure tests around the new runtime pieces so lint and Jest can catch regressions in the offline manager, analytics config, and Supabase response validation without needing a device runtime.

## Assistant (commentary)

`2026-03-16T06:59:37.148Z`

The code changes are in place. I’m running the repo checks now, starting with lint and type-check, then Jest, and I’ll fix anything those surface before I call Section 14 integrated.

## Assistant (commentary)

`2026-03-16T07:00:56.349Z`

Lint, type-check, and Jest are clean now. I’m doing one last pass over the changed surface and git status so I can summarize exactly what landed in Section 14 without mixing it with the unrelated user changes already in the worktree.

## Assistant (final_answer)

`2026-03-16T07:01:32.250Z`

Section 14 is now integrated without changing [src/lib/supabase.ts](C:/Users/T/Desktop/PeeDom/src/lib/supabase.ts) or [src/types/database.ts](C:/Users/T/Desktop/PeeDom/src/types/database.ts), because this foundation pass did not require schema changes. I added query lifecycle and offline awareness in [app/_layout.tsx](C:/Users/T/Desktop/PeeDom/app/_layout.tsx), [src/lib/query-lifecycle.ts](C:/Users/T/Desktop/PeeDom/src/lib/query-lifecycle.ts), and [src/lib/network-state.ts](C:/Users/T/Desktop/PeeDom/src/lib/network-state.ts); hardened Sentry plus React Query error capture in [src/lib/sentry.ts](C:/Users/T/Desktop/PeeDom/src/lib/sentry.ts) and [src/lib/query-client.ts](C:/Users/T/Desktop/PeeDom/src/lib/query-client.ts); and added privacy-first analytics with env-driven runtime config in [src/lib/analytics.ts](C:/Users/T/Desktop/PeeDom/src/lib/analytics.ts), [src/lib/analytics-config.ts](C:/Users/T/Desktop/PeeDom/src/lib/analytics-config.ts), [src/constants/config.ts](C:/Users/T/Desktop/PeeDom/src/constants/config.ts), [src/lib/storage.ts](C:/Users/T/Desktop/PeeDom/src/lib/storage.ts), and [.env.example](C:/Users/T/Desktop/PeeDom/.env.example).

I also moved auth session state onto Zustand in [src/store/useAuthStore.ts](C:/Users/T/Desktop/PeeDom/src/store/useAuthStore.ts) and wired it through [src/contexts/AuthContext.tsx](C:/Users/T/Desktop/PeeDom/src/contexts/AuthContext.tsx). Supabase response validation now runs through Zod parsers in [src/lib/supabase-parsers.ts](C:/Users/T/Desktop/PeeDom/src/lib/supabase-parsers.ts) across the core API layer: [src/api/auth.ts](C:/Users/T/Desktop/PeeDom/src/api/auth.ts), [src/api/bathrooms.ts](C:/Users/T/Desktop/PeeDom/src/api/bathrooms.ts), [src/api/access-codes.ts](C:/Users/T/Desktop/PeeDom/src/api/access-codes.ts), [src/api/favorites.ts](C:/Users/T/Desktop/PeeDom/src/api/favorites.ts), [src/api/reports.ts](C:/Users/T/Desktop/PeeDom/src/api/reports.ts), and [src/api/bathroom-submissions.ts](C:/Users/T/Desktop/PeeDom/src/api/bathroom-submissions.ts). Auth analytics hooks landed in [app/(auth)/login.tsx](C:/Users/T/Desktop/PeeDom/app/(auth)/login.tsx) and [app/(auth)/register.tsx](C:/Users/T/Desktop/PeeDom/app/(auth)/register.tsx), offline sync now shares the same network truth source in [src/hooks/useOfflineSync.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useOfflineSync.ts), and [eas-release.yml](C:/Users/T/Desktop/PeeDom/.github/workflows/eas-release.yml) now does preview EAS builds on non-fork PRs plus production builds on `main` and release tags.

Validation passed: `npm run lint`, `npm run type-check`, and `npm test -- --runInBand`.

Confirming Section 14 is integrated and running. Ready for Section 1?

## User

`2026-03-16T07:02:29.143Z`

<environment_context>
  <shell>powershell</shell>
  <current_date>2026-03-16</current_date>
  <timezone>America/Los_Angeles</timezone>
</environment_context>

## User

`2026-03-16T07:02:29.191Z`

yes

## Assistant (commentary)

`2026-03-16T07:02:47.298Z`

Proceeding to Section 1 now. I’m verifying the current Trust Engine surface across the Supabase schema, code-vote flow, bathroom detail UI, and any existing Edge Functions so I can implement only the missing pieces and keep the database/types aligned.

## Assistant (commentary)

`2026-03-16T07:03:11.307Z`

The trust-engine audit is showing most of the raw data model already exists: `bathroom_access_codes`, `code_votes`, and `bathroom_photos` are in the schema, but the actual user loop is still thin. I’m checking the bathroom detail screen and the current migrations next so I can wire confidence, voting, stale-state automation, and photo proof without duplicating tables you already have.

## Assistant (commentary)

`2026-03-16T07:03:37.699Z`

The schema audit matters here: photos already exist, but the trust loop itself is incomplete. `code_votes` currently changes vote counts only; it does not update `last_verified_at`, recompute confidence, or award verification points, and the bathroom detail UI still treats trust as plain text instead of a real system.

## Assistant (commentary)

`2026-03-16T07:04:23.059Z`

I’ve got the gap map now. To make Section 1 production-safe, I need to touch all four layers together: a trust-engine migration that replaces the fragile vote trigger with a real confidence pipeline and stale-code expiry function, an Edge Function to run that expiry, app-side vote/photo APIs and hooks, and a bathroom detail UI that actually surfaces confidence, verification, and photo proof as first-class states.

## Assistant (commentary)

`2026-03-16T07:06:49.875Z`

I’m editing the backend layer now. The migration is going to do three things in one pass: make photo proof richer, turn code votes into a real trust pipeline with auditable point awards, and expose a single stale-code expiry function that the Edge Function can run on a schedule.

## Assistant (commentary)

`2026-03-16T07:07:36.461Z`

The database side is in. I’m syncing the generated app types now so the Trust Engine changes stay strictly typed across the client before I wire the new hooks and UI.

## Assistant (commentary)

`2026-03-16T07:11:56.921Z`

Using `staff-mobile-engineer` for this section because the work is production mobile infrastructure plus feature delivery. I’m checking the current Trust Engine edits in the repo, then I’ll wire the remaining UI, offline sync, and tests before running the full verification pass.

## Assistant (commentary)

`2026-03-16T07:12:07.213Z`

The Trust Engine schema and helper layer are in place. I’m moving to the remaining surface work now: bathroom detail integration, report/deep-link plumbing, offline vote sync, and tests, then I’ll run lint, type-check, and Jest.

## Assistant (commentary)

`2026-03-16T07:12:54.317Z`

I’ve confirmed the remaining work is local to the React Native surface. Next I’m checking the upload/report/auth hooks and package surface so the bathroom detail screen can be wired without breaking existing navigation or dependency patterns.

## Assistant (commentary)

`2026-03-16T07:14:47.390Z`

I’ve got the integration points pinned down. I’m editing the trust flow now: preselected wrong-code reporting, queued vote replay, bathroom detail trust/photo UX, and the test coverage for trust scoring and proof-photo validation.

## Assistant (commentary)

`2026-03-16T07:16:41.372Z`

I’m patching the screen and hook layer now. The main change is consolidating the trust interactions into the bathroom detail flow so the data, report prompt, and photo-proof state all stay consistent under offline and auth edges.

## Assistant (commentary)

`2026-03-16T07:18:42.193Z`

I found one risk worth checking before validation: whether photo proof is actually protected at the storage layer or only in row metadata. I’m inspecting the existing Supabase storage policy now so keypad/sign images don’t become public by accident.

## Assistant (commentary)

`2026-03-16T07:20:20.314Z`

I found and fixed a real security gap in the original photo-proof path: the storage bucket was still public. I’m moving those URLs to signed access now and only generating protected keypad/sign URLs after the code is actually visible in the app.

## Assistant (commentary)

`2026-03-16T07:21:40.646Z`

The remaining gap is verification. I’m adding focused unit coverage for trust scoring and photo-proof validation now so the migration and UI work have executable guards before I run the repo checks.

## Assistant (commentary)

`2026-03-16T07:22:14.427Z`

The feature wiring is in place. I’m running the verification pass now: type-check first to catch any structural issues, then lint and Jest, and I’ll patch whatever fails before closing the section.

## Assistant (commentary)

`2026-03-16T07:22:44.767Z`

Type-check exposed two concrete issues: Expo Router `Href` objects being passed into an auth API that expects a plain string, and the Deno Edge Function being compiled by the app’s TypeScript config. I’m correcting both now so the app compile reflects the actual runtime surfaces.

## Assistant (commentary)

`2026-03-16T07:24:00.056Z`

Verification is clean. I’m doing one last pass over the changed file set and then I’ll close Section 1 with the concrete integration summary and the next prompt.

## Assistant (final_answer)

`2026-03-16T07:24:21.268Z`

Section 1 is integrated end to end.

The Trust Engine schema now lives in [supabase/migrations/005_trust_engine.sql](C:/Users/T/Desktop/PeeDom/supabase/migrations/005_trust_engine.sql) with `point_events`, confidence recalculation, vote-triggered verification rewards, stale-code expiration, richer `bathroom_photos` metadata, and a scheduled Edge Function at [supabase/functions/expire-stale-codes/index.ts](C:/Users/T/Desktop/PeeDom/supabase/functions/expire-stale-codes/index.ts). I also updated the generated app-side typing and validation surface in [src/types/database.ts](C:/Users/T/Desktop/PeeDom/src/types/database.ts), [src/types/index.ts](C:/Users/T/Desktop/PeeDom/src/types/index.ts), [src/lib/supabase-parsers.ts](C:/Users/T/Desktop/PeeDom/src/lib/supabase-parsers.ts), and [src/utils/validate.ts](C:/Users/T/Desktop/PeeDom/src/utils/validate.ts).

On the app side, the bathroom detail flow in [app/bathroom/[id].tsx](C:/Users/T/Desktop/PeeDom/app/bathroom/%5Bid%5D.tsx) now shows a live confidence meter, Yes/No verification loop, wrong-code report handoff, photo-proof gallery, and typed photo uploads. The supporting logic landed in [src/lib/code-trust.ts](C:/Users/T/Desktop/PeeDom/src/lib/code-trust.ts), [src/api/access-codes.ts](C:/Users/T/Desktop/PeeDom/src/api/access-codes.ts), [src/api/bathroom-photos.ts](C:/Users/T/Desktop/PeeDom/src/api/bathroom-photos.ts), [src/hooks/useBathroomCodeVerification.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useBathroomCodeVerification.ts), [src/hooks/useBathroomPhotos.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useBathroomPhotos.ts), [src/hooks/useOfflineSync.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useOfflineSync.ts), [app/modal/report.tsx](C:/Users/T/Desktop/PeeDom/app/modal/report.tsx), and [src/constants/routes.ts](C:/Users/T/Desktop/PeeDom/src/constants/routes.ts). Photo proof is now served through signed URLs rather than a public bucket, with keypad/sign assets only signed once the code is visible in the app.

Verification passed: `npm run type-check`, `npm run lint`, and `npm test -- --runInBand`. New tests are in [__tests__/code-trust.test.ts](C:/Users/T/Desktop/PeeDom/__tests__/code-trust.test.ts) and [__tests__/bathroom-photo-validation.test.ts](C:/Users/T/Desktop/PeeDom/__tests__/bathroom-photo-validation.test.ts). I also excluded [supabase/functions](C:/Users/T/Desktop/PeeDom/supabase/functions) from the Expo app TypeScript compile in [tsconfig.json](C:/Users/T/Desktop/PeeDom/tsconfig.json) because that surface is Deno, not React Native.

Confirming Section 1 is integrated and running. Ready for Section 2?

## User

`2026-03-16T07:24:22.381Z`

can you compare your code with the following for maybe help or checking against: Clean. No conflicts. Let's build.

---

# Section 14: Infrastructure Foundation

## Terminal Commands — Run in Order

```bash
# 1. Install production dependencies
npx expo install @sentry/react-native
npx expo install @react-native-community/netinfo
npm install zod zustand

# 2. Install dev/test dependencies
npm install --save-dev jest-expo @testing-library/react-native @testing-library/jest-native

# 3. Add EXPO_PUBLIC_SENTRY_DSN to .env.local (get DSN from sentry.io)
# EXPO_PUBLIC_SENTRY_DSN=https://xxxxxxxx@oXXXXXXX.ingest.sentry.io/XXXXXXX
```

---

## `jest.config.js` — NEW

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: [],
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?react-native' +
      '|@react-native(-community)?' +
      '|expo(nent)?' +
      '|@expo(nent)?/.*' +
      '|@expo-google-fonts/.*' +
      '|react-navigation' +
      '|@react-navigation/.*' +
      '|@unimodules/.*' +
      '|unimodules' +
      '|sentry-expo' +
      '|native-base' +
      '|react-native-svg' +
      '|zustand' +
      ')/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/dist/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
};
```

---

## `jest.setup.ts` — NEW

```typescript
import '@testing-library/jest-native/extend-expect';

// Silence specific React Native warnings in test output
jest.spyOn(console, 'warn').mockImplementation((msg: string) => {
  if (
    msg.includes('Sentry') ||
    msg.includes('NetInfo') ||
    msg.includes('AsyncStorage')
  ) {
    return;
  }
  console.warn(msg);
});

// Global test timeout
jest.setTimeout(10_000);
```

---

## `src/__mocks__/supabase.ts` — NEW

```typescript
/**
 * Manual mock for @/lib/supabase — used across all tests.
 * Import this in tests via: jest.mock('@/lib/supabase', () => require('src/__mocks__/supabase'));
 * Or configure in jest.config moduleNameMapper.
 */

const mockSupabaseAuth = {
  getSession: jest.fn().mockResolvedValue({
    data: { session: null },
    error: null,
  }),
  signInWithPassword: jest.fn().mockResolvedValue({
    data: { session: null, user: null },
    error: null,
  }),
  signUp: jest.fn().mockResolvedValue({
    data: { session: null, user: null },
    error: null,
  }),
  signOut: jest.fn().mockResolvedValue({ error: null }),
  onAuthStateChange: jest.fn().mockReturnValue({
    data: {
      subscription: { unsubscribe: jest.fn() },
    },
  }),
};

const mockFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  filter: jest.fn().mockReturnThis(),
});

const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });

export const supabase = {
  auth: mockSupabaseAuth,
  from: mockFrom,
  rpc: mockRpc,
};

// Utility to reset all mocks between tests
export const resetSupabaseMocks = () => {
  Object.values(mockSupabaseAuth).forEach((fn) => {
    if (typeof fn === 'function') (fn as jest.Mock).mockReset();
  });
  mockFrom.mockReset();
  mockRpc.mockReset();
  // Re-apply defaults
  mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabaseAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
  });
};
```

---

## `src/__mocks__/@react-native-community/netinfo.ts` — NEW

```typescript
const NetInfoMock = {
  addEventListener: jest.fn((callback: (state: object) => void) => {
    // Immediately call with connected state by default
    callback({ isConnected: true, isInternetReachable: true, type: 'wifi' });
    return jest.fn(); // returns unsubscribe
  }),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  configure: jest.fn(),
};

export default NetInfoMock;
```

---

## `src/__mocks__/@sentry/react-native.ts` — NEW

```typescript
const SentryMock = {
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback: (scope: object) => void) => {
    callback({ setExtras: jest.fn(), setTag: jest.fn() });
  }),
  setUser: jest.fn(),
  wrap: jest.fn((component: unknown) => component),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
};

export default SentryMock;
export const {
  init,
  captureException,
  captureMessage,
  withScope,
  setUser,
  wrap,
  ErrorBoundary,
} = SentryMock;
export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';
```

---

## `src/lib/sentry.ts` — NEW

```typescript
import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENV = process.env.EXPO_PUBLIC_ENV ?? 'local';

export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.warn('[PeeDom] Sentry DSN not configured — error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    // Only enable tracing in non-local environments
    tracesSampleRate: ENV === 'production' ? 0.15 : 0,
    // Never run Sentry instrumentation during local dev (avoids noise)
    enableInExpoDevelopment: false,
    debug: false,
    // Breadcrumb filtering — remove noisy RN internals
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      return breadcrumb;
    },
    // Strip PII before events leave the device
    beforeSend(event) {
      if (event.user) {
        // Keep only the user ID — never email or username
        event.user = { id: event.user.id };
      }
      // Remove request bodies that might contain credentials
      if (event.request?.data) {
        delete event.request.data;
      }
      return event;
    },
  });
}

/**
 * Set the authenticated user context on Sentry events.
 * Call this when the session transitions to AUTHENTICATED_*.
 */
export function setSentryUser(userId: string, role: string): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser({ id: userId, role });
}

/**
 * Clear user context on sign-out.
 */
export function clearSentryUser(): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

/**
 * Capture an exception with optional structured context.
 * Safe to call in any environment — no-ops when DSN is absent.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!SENTRY_DSN) {
    if (__DEV__) console.error('[PeeDom Error]', error, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

/**
 * Capture a non-fatal message (info, warning, etc.)
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
): void {
  if (!SENTRY_DSN) {
    if (__DEV__) console.info(`[PeeDom ${level}]`, message);
    return;
  }
  Sentry.captureMessage(message, level);
}

export { Sentry };
```

---

## `src/components/ErrorBoundary.tsx` — NEW

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { captureException } from '@/lib/sentry';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * PeeDom error boundary — catches render errors, reports to Sentry,
 * and renders a safe recovery UI.
 *
 * Usage: Wrap any subtree that could throw.
 * The root layout wraps the entire app.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureException(error, {
      componentStack: info.componentStack ?? '',
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>🚨</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            PeeDom hit an unexpected error. Our team has been notified.
          </Text>
          {__DEV__ && (
            <Text style={styles.devError}>{this.state.errorMessage}</Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  devError: {
    fontSize: 11,
    color: '#ef4444',
    fontFamily: 'monospace',
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    textAlign: 'left',
    width: '100%',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
```

---

## `src/lib/query-client.ts` — NEW

```typescript
import { QueryClient, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

/**
 * Wire React Native's NetInfo into TanStack Query's online manager.
 * This must execute before the QueryClientProvider mounts.
 * Queries will automatically:
 *  - Pause when the device goes offline
 *  - Retry automatically when connectivity is restored
 */
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    const isOnline =
      state.isConnected === true && state.isInternetReachable !== false;
    setOnline(isOnline);
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Don't retry on authentication errors (4xx).
       * Retry network errors up to 2 times.
       */
      retry: (failureCount, error: unknown) => {
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          // Never retry auth, permission, or not-found errors
          if (
            msg.includes('jwt') ||
            msg.includes('unauthorized') ||
            msg.includes('forbidden') ||
            msg.includes('not found') ||
            msg.includes('pgrst116') // Supabase "single row expected"
          ) {
            return false;
          }
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000,       // 5 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes
      refetchOnWindowFocus: false,     // RN: no window focus events
      refetchOnReconnect: true,        // Auto-refetch when back online
      refetchOnMount: true,
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('jwt') || msg.includes('unauthorized')) return false;
        }
        return failureCount < 1;
      },
    },
  },
});
```

---

## `src/lib/analytics.ts` — NEW

```typescript
/**
 * PeeDom Analytics Abstraction Layer
 *
 * Privacy-first design:
 * - No PII (email, name, phone) ever enters an event
 * - No location coordinates in events (use region strings instead)
 * - All events are opt-in; users can disable in settings
 * - Ready for PostHog drop-in when native build is configured
 *
 * To connect a real provider:
 *   1. Install posthog-react-native (after expo prebuild)
 *   2. Replace the provider implementation below
 *   3. All call sites remain unchanged
 */

type EventProperties = Record<string, string | number | boolean | null>;

interface AnalyticsProvider {
  track(event: string, properties?: EventProperties): void;
  screen(name: string, properties?: EventProperties): void;
  identify(userId: string, traits?: EventProperties): void;
  reset(): void;
}

class ConsoleProvider implements AnalyticsProvider {
  track(event: string, properties?: EventProperties): void {
    if (__DEV__) {
      console.log(`[Analytics] track: ${event}`, properties ?? {});
    }
  }
  screen(name: string, properties?: EventProperties): void {
    if (__DEV__) {
      console.log(`[Analytics] screen: ${name}`, properties ?? {});
    }
  }
  identify(userId: string, traits?: EventProperties): void {
    if (__DEV__) {
      console.log(`[Analytics] identify: ${userId}`, traits ?? {});
    }
  }
  reset(): void {
    if (__DEV__) console.log('[Analytics] reset');
  }
}

class NoopProvider implements AnalyticsProvider {
  track(): void {}
  screen(): void {}
  identify(): void {}
  reset(): void {}
}

// ─── Provider selection ───────────────────────────────────────────────────────
// In production without a configured DSN, use noop. In dev, log to console.
// When PostHog is integrated, swap ConsoleProvider for PostHogProvider here.

function createProvider(): AnalyticsProvider {
  const analyticsEnabled =
    process.env.EXPO_PUBLIC_ENV === 'production' &&
    process.env.EXPO_PUBLIC_ANALYTICS_KEY != null;

  if (analyticsEnabled) {
    // TODO: return new PostHogProvider(process.env.EXPO_PUBLIC_ANALYTICS_KEY!);
    return new NoopProvider();
  }

  return __DEV__ ? new ConsoleProvider() : new NoopProvider();
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _analyticsEnabled = true;
const _provider = createProvider();

export const analytics = {
  /**
   * Track a user action. Properties must never contain PII.
   */
  track(event: AnalyticsEvent, properties?: EventProperties): void {
    if (!_analyticsEnabled) return;
    _provider.track(event, properties);
  },

  /**
   * Track a screen view.
   */
  screen(name: ScreenName, properties?: EventProperties): void {
    if (!_analyticsEnabled) return;
    _provider.screen(name, properties);
  },

  /**
   * Associate subsequent events with a user ID (non-PII).
   */
  identify(userId: string, traits?: EventProperties): void {
    if (!_analyticsEnabled) return;
    _provider.identify(userId, traits);
  },

  /**
   * Clear user identity (call on sign-out).
   */
  reset(): void {
    _provider.reset();
  },

  /**
   * Disable all analytics (respects user preference).
   */
  disable(): void {
    _analyticsEnabled = false;
  },

  enable(): void {
    _analyticsEnabled = true;
  },
};

// ─── Typed event catalog ──────────────────────────────────────────────────────
// Add events here as you build features. Never add PII to event names.

export type AnalyticsEvent =
  // Auth
  | 'auth_sign_in_attempt'
  | 'auth_sign_in_success'
  | 'auth_sign_in_failure'
  | 'auth_sign_up_attempt'
  | 'auth_sign_up_success'
  | 'auth_sign_out'
  // Map
  | 'map_bathroom_tapped'
  | 'map_filter_applied'
  | 'map_navigate_tapped'
  // Bathrooms
  | 'bathroom_code_revealed'
  | 'bathroom_code_verified_yes'
  | 'bathroom_code_verified_no'
  | 'bathroom_favorited'
  | 'bathroom_unfavorited'
  | 'bathroom_reported'
  | 'bathroom_rated'
  | 'bathroom_added'
  // Codes
  | 'code_submitted'
  | 'code_voted'
  // Adwall
  | 'adwall_shown'
  | 'adwall_completed'
  | 'adwall_skipped'
  // Search
  | 'search_query'
  | 'search_result_tapped'
  // Profile
  | 'profile_viewed'
  // Onboarding
  | 'onboarding_location_granted'
  | 'onboarding_location_denied'
  | 'onboarding_notifications_granted'
  | 'onboarding_notifications_denied';

export type ScreenName =
  | 'Map'
  | 'Search'
  | 'Favorites'
  | 'Profile'
  | 'BathroomDetail'
  | 'Login'
  | 'Register'
  | 'AddBathroom'
  | 'SubmitCode'
  | 'Report'
  | 'Business';
```

---

## `src/lib/validators/auth.ts` — NEW

```typescript
import { z } from 'zod';

export const SignInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export const SignUpSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address')
      .max(255),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and a number',
      ),
    confirmPassword: z.string(),
    displayName: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(50, 'Display name is too long')
      .regex(/^[a-zA-Z0-9_\- ]+$/, 'Display name contains invalid characters')
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
```

---

## `src/lib/validators/bathroom.ts` — NEW

```typescript
import { z } from 'zod';

const UUIDSchema = z.string().uuid('Invalid bathroom ID');

export const AddBathroomSchema = z.object({
  place_name: z
    .string()
    .min(2, 'Place name must be at least 2 characters')
    .max(200, 'Place name is too long'),
  address_line1: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  latitude: z
    .number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  longitude: z
    .number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
  is_locked: z.boolean().optional(),
  is_accessible: z.boolean().optional(),
  is_customer_only: z.boolean().default(false),
  initial_code: z
    .string()
    .min(1, 'Code cannot be empty')
    .max(50, 'Code is too long')
    .optional(),
});

export const BathroomReportSchema = z.object({
  bathroom_id: UUIDSchema,
  report_type: z.enum([
    'wrong_code',
    'closed',
    'unsafe',
    'duplicate',
    'incorrect_hours',
    'no_restroom',
    'other',
  ]),
  notes: z.string().max(500, 'Notes are too long').optional(),
});

export const CleanlinessRatingSchema = z.object({
  bathroom_id: UUIDSchema,
  rating: z
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  notes: z.string().max(500).optional(),
});

export const FavoriteToggleSchema = z.object({
  bathroom_id: UUIDSchema,
});

// Schema for validating API response rows (catches schema drift)
export const BathroomRowSchema = z.object({
  id: UUIDSchema,
  place_name: z.string(),
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  country_code: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  is_locked: z.boolean().nullable(),
  is_accessible: z.boolean().nullable(),
  is_customer_only: z.boolean(),
  hours_json: z.record(z.unknown()).nullable(),
  moderation_status: z.enum(['active', 'flagged', 'hidden', 'deleted']),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AddBathroomInput = z.infer<typeof AddBathroomSchema>;
export type BathroomReportInput = z.infer<typeof BathroomReportSchema>;
export type CleanlinessRatingInput = z.infer<typeof CleanlinessRatingSchema>;
export type FavoriteToggleInput = z.infer<typeof FavoriteToggleSchema>;
```

---

## `src/lib/validators/code.ts` — NEW

```typescript
import { z } from 'zod';

const UUIDSchema = z.string().uuid('Invalid ID');

export const SubmitCodeSchema = z.object({
  bathroom_id: UUIDSchema,
  code_value: z
    .string()
    .min(1, 'Code cannot be empty')
    .max(50, 'Code is too long')
    .trim()
    .transform((val) => val.toUpperCase()),
});

export const VoteCodeSchema = z.object({
  code_id: UUIDSchema,
  vote: z.union([z.literal(-1), z.literal(1)], {
    errorMap: () => ({ message: 'Vote must be 1 (up) or -1 (down)' }),
  }),
});

export const CodeVerificationSchema = z.object({
  code_id: UUIDSchema,
  worked: z.boolean(),
  bathroom_id: UUIDSchema,
});

export type SubmitCodeInput = z.infer<typeof SubmitCodeSchema>;
export type VoteCodeInput = z.infer<typeof VoteCodeSchema>;
export type CodeVerificationInput = z.infer<typeof CodeVerificationSchema>;
```

---

## `src/lib/validators/mutation.ts` — NEW

```typescript
import { z } from 'zod';

/**
 * Runtime validators for every mutation type in the offline queue.
 * These run on enqueue AND on load from AsyncStorage to reject corrupt data.
 */

const UUIDSchema = z.string().uuid();

export const MutationPayloadSchemas = {
  favorite_add: z.object({ bathroom_id: UUIDSchema }),
  favorite_remove: z.object({ bathroom_id: UUIDSchema }),
  code_vote: z.object({
    code_id: UUIDSchema,
    vote: z.union([z.literal(-1), z.literal(1)]),
  }),
  report_create: z.object({
    bathroom_id: UUIDSchema,
    report_type: z.enum([
      'wrong_code',
      'closed',
      'unsafe',
      'duplicate',
      'incorrect_hours',
      'no_restroom',
      'other',
    ]),
    notes: z.string().max(500).optional(),
  }),
  rating_create: z.object({
    bathroom_id: UUIDSchema,
    rating: z.number().int().min(1).max(5),
    notes: z.string().max(500).optional(),
  }),
} as const;

export const QueuedMutationSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'favorite_add',
    'favorite_remove',
    'code_vote',
    'report_create',
    'rating_create',
  ]),
  payload: z.unknown(),
  created_at: z.string().datetime({ offset: true }).or(z.string().min(1)),
  retry_count: z.number().int().min(0).max(10),
  last_attempt_at: z.string().nullable(),
  user_id: UUIDSchema,
});

/**
 * Validates a mutation payload against its type's schema.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateMutationPayload(
  type: keyof typeof MutationPayloadSchemas,
  payload: unknown,
) {
  const schema = MutationPayloadSchemas[type];
  return schema.safeParse(payload);
}

/**
 * Validates an array of queued mutations loaded from AsyncStorage.
 * Filters out any invalid items to prevent corrupt data from breaking the queue.
 */
export function validateQueuedMutations(raw: unknown[]): {
  valid: z.infer<typeof QueuedMutationSchema>[];
  invalid: unknown[];
} {
  const valid: z.infer<typeof QueuedMutationSchema>[] = [];
  const invalid: unknown[] = [];

  for (const item of raw) {
    const result = QueuedMutationSchema.safeParse(item);
    if (result.success) {
      // Also validate the payload against its specific type schema
      const type = result.data.type;
      const payloadResult = validateMutationPayload(type, result.data.payload);
      if (payloadResult.success) {
        valid.push(result.data);
      } else {
        invalid.push(item);
      }
    } else {
      invalid.push(item);
    }
  }

  return { valid, invalid };
}
```

---

## `src/lib/validators/index.ts` — NEW

```typescript
export * from './auth';
export * from './bathroom';
export * from './code';
export * from './mutation';
```

---

## `src/stores/session.store.ts` — NEW

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile, SessionStatus, SessionState, UserRole } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveSessionStatus(
  session: Session | null,
  profile: UserProfile | null,
): SessionStatus {
  if (!session || !profile) return 'GUEST';
  switch (profile.role as UserRole) {
    case 'admin':    return 'AUTHENTICATED_ADMIN';
    case 'business': return 'AUTHENTICATED_BUSINESS';
    default:         return 'AUTHENTICATED_USER';
  }
}

function buildSessionState(
  sessionStatus: SessionStatus,
  session: Session | null,
  profile: UserProfile | null,
): SessionState {
  return {
    status: sessionStatus,
    session: session
      ? { user_id: session.user.id, email: session.user.email ?? '' }
      : null,
    profile: profile
      ? {
          role: profile.role,
          display_name: profile.display_name,
          points_balance: profile.points_balance,
          is_premium: profile.is_premium,
        }
      : null,
  };
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface SessionStoreState {
  // Raw state
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  sessionStatus: SessionStatus;
  loading: boolean;
  // Derived (kept in sync via _setStatus)
  isGuest: boolean;
  isAuthenticated: boolean;
  canAccessProtectedRoute: boolean;
  sessionState: SessionState;
}

interface SessionStoreActions {
  /**
   * Set session + user atomically.
   * Internal use only (AuthService).
   */
  _setSessionUser: (session: Session | null, user: User | null) => void;
  /**
   * Set profile. After setting, re-derives session status from current session.
   */
  _setProfile: (profile: UserProfile | null) => void;
  /**
   * Explicitly set session status (e.g. SESSION_RECOVERY, SESSION_INVALID).
   * Updates all derived booleans atomically.
   */
  _setStatus: (status: SessionStatus) => void;
  /** Set loading state. */
  _setLoading: (loading: boolean) => void;
  /**
   * Full authenticated login — sets session, user, profile, derives status.
   * Single atomic update prevents intermediate renders.
   */
  _setAuthenticated: (
    session: Session,
    user: User,
    profile: UserProfile,
  ) => void;
  /**
   * Reset to unauthenticated / guest state.
   * Used on sign-out or session invalidity.
   */
  _reset: () => void;
}

export type SessionStore = SessionStoreState & SessionStoreActions;

// ─── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_STATE: SessionStoreState = {
  session: null,
  user: null,
  profile: null,
  sessionStatus: 'BOOTSTRAPPING',
  loading: true,
  isGuest: false,
  isAuthenticated: false,
  canAccessProtectedRoute: false,
  sessionState: {
    status: 'BOOTSTRAPPING',
    session: null,
    profile: null,
  },
};

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>()(
  devtools(
    (set, get) => ({
      ...INITIAL_STATE,

      _setSessionUser: (session, user) =>
        set({ session, user }, false, 'session/setSessionUser'),

      _setProfile: (profile) => {
        const { session } = get();
        const status = deriveSessionStatus(session, profile);
        set(
          {
            profile,
            sessionStatus: status,
            isGuest: status === 'GUEST',
            isAuthenticated: status.startsWith('AUTHENTICATED_'),
            canAccessProtectedRoute:
              status.startsWith('AUTHENTICATED_') &&
              status !== 'SESSION_INVALID',
            sessionState: buildSessionState(status, session, profile),
          },
          false,
          'session/setProfile',
        );
      },

      _setStatus: (status) => {
        const { session, profile } = get();
        set(
          {
            sessionStatus: status,
            isGuest: status === 'GUEST',
            isAuthenticated: status.startsWith('AUTHENTICATED_'),
            canAccessProtectedRoute:
              status.startsWith('AUTHENTICATED_') &&
              status !== 'SESSION_INVALID',
            sessionState: buildSessionState(status, session, profile),
          },
          false,
          `session/setStatus:${status}`,
        );
      },

      _setLoading: (loading) =>
        set({ loading }, false, 'session/setLoading'),

      _setAuthenticated: (session, user, profile) => {
        const status = deriveSessionStatus(session, profile);
        set(
          {
            session,
            user,
            profile,
            sessionStatus: status,
            loading: false,
            isGuest: false,
            isAuthenticated: true,
            canAccessProtectedRoute: true,
            sessionState: buildSessionState(status, session, profile),
          },
          false,
          `session/setAuthenticated:${status}`,
        );
      },

      _reset: () =>
        set(
          {
            session: null,
            user: null,
            profile: null,
            sessionStatus: 'GUEST',
            loading: false,
            isGuest: true,
            isAuthenticated: false,
            canAccessProtectedRoute: false,
            sessionState: {
              status: 'GUEST',
              session: null,
              profile: null,
            },
          },
          false,
          'session/reset',
        ),
    }),
    { name: 'PeeDom:SessionStore' },
  ),
);
```

---

## `src/stores/map.store.ts` — NEW

```typescript
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MapFilters {
  openNow: boolean;
  accessibleOnly: boolean;
  noCodeRequired: boolean;
  minCleanlinessRating: 0 | 1 | 2 | 3 | 4 | 5; // 0 = no filter
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapStoreState {
  region: MapRegion;
  selectedBathroomId: string | null;
  filters: MapFilters;
  isFilterSheetOpen: boolean;
}

interface MapStoreActions {
  setRegion: (region: Partial<MapRegion>) => void;
  setSelectedBathroom: (id: string | null) => void;
  setFilter: <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => void;
  resetFilters: () => void;
  setFilterSheetOpen: (open: boolean) => void;
  hasActiveFilters: () => boolean;
}

export type MapStore = MapStoreState & MapStoreActions;

const DEFAULT_FILTERS: MapFilters = {
  openNow: false,
  accessibleOnly: false,
  noCodeRequired: false,
  minCleanlinessRating: 0,
};

// Default region: Seattle (from config.ts)
const DEFAULT_REGION: MapRegion = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export const useMapStore = create<MapStore>()(
  devtools(
    persist(
      (set, get) => ({
        region: DEFAULT_REGION,
        selectedBathroomId: null,
        filters: DEFAULT_FILTERS,
        isFilterSheetOpen: false,

        setRegion: (region) =>
          set(
            (state) => ({ region: { ...state.region, ...region } }),
            false,
            'map/setRegion',
          ),

        setSelectedBathroom: (id) =>
          set({ selectedBathroomId: id }, false, 'map/selectBathroom'),

        setFilter: (key, value) =>
          set(
            (state) => ({
              filters: { ...state.filters, [key]: value },
            }),
            false,
            `map/setFilter:${key}`,
          ),

        resetFilters: () =>
          set({ filters: DEFAULT_FILTERS }, false, 'map/resetFilters'),

        setFilterSheetOpen: (open) =>
          set({ isFilterSheetOpen: open }, false, 'map/setFilterSheet'),

        hasActiveFilters: () => {
          const { filters } = get();
          return (
            filters.openNow ||
            filters.accessibleOnly ||
            filters.noCodeRequired ||
            filters.minCleanlinessRating > 0
          );
        },
      }),
      {
        name: '@peedom/map-preferences',
        storage: createJSONStorage(() => AsyncStorage),
        // Only persist filters, not transient state
        partialize: (state) => ({ filters: state.filters }),
      },
    ),
    { name: 'PeeDom:MapStore' },
  ),
);
```

---

## `src/stores/ui.store.ts` — NEW

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface UIStoreState {
  isDetailSheetOpen: boolean;
  isAddBathroomSheetOpen: boolean;
  isSubmitCodeSheetOpen: boolean;
  isReportSheetOpen: boolean;
  toasts: Toast[];
}

interface UIStoreActions {
  openDetailSheet: () => void;
  closeDetailSheet: () => void;
  openAddBathroomSheet: () => void;
  closeAddBathroomSheet: () => void;
  openSubmitCodeSheet: () => void;
  closeSubmitCodeSheet: () => void;
  openReportSheet: () => void;
  closeReportSheet: () => void;
  closeAllSheets: () => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
}

export type UIStore = UIStoreState & UIStoreActions;

export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      isDetailSheetOpen: false,
      isAddBathroomSheetOpen: false,
      isSubmitCodeSheetOpen: false,
      isReportSheetOpen: false,
      toasts: [],

      openDetailSheet: () =>
        set({ isDetailSheetOpen: true }, false, 'ui/openDetailSheet'),
      closeDetailSheet: () =>
        set({ isDetailSheetOpen: false }, false, 'ui/closeDetailSheet'),

      openAddBathroomSheet: () =>
        set({ isAddBathroomSheetOpen: true }, false, 'ui/openAddBathroom'),
      closeAddBathroomSheet: () =>
        set({ isAddBathroomSheetOpen: false }, false, 'ui/closeAddBathroom'),

      openSubmitCodeSheet: () =>
        set({ isSubmitCodeSheetOpen: true }, false, 'ui/openSubmitCode'),
      closeSubmitCodeSheet: () =>
        set({ isSubmitCodeSheetOpen: false }, false, 'ui/closeSubmitCode'),

      openReportSheet: () =>
        set({ isReportSheetOpen: true }, false, 'ui/openReport'),
      closeReportSheet: () =>
        set({ isReportSheetOpen: false }, false, 'ui/closeReport'),

      closeAllSheets: () =>
        set(
          {
            isDetailSheetOpen: false,
            isAddBathroomSheetOpen: false,
            isSubmitCodeSheetOpen: false,
            isReportSheetOpen: false,
          },
          false,
          'ui/closeAll',
        ),

      showToast: (message, type = 'info', duration = 3000) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        set(
          (state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }),
          false,
          'ui/showToast',
        );
        // Auto-dismiss
        setTimeout(() => get().dismissToast(id), duration);
      },

      dismissToast: (id) =>
        set(
          (state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }),
          false,
          'ui/dismissToast',
        ),
    }),
    { name: 'PeeDom:UIStore' },
  ),
);
```

---

## `src/services/auth.service.ts` — NEW

```typescript
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/stores/session.store';
import { storage } from '@/lib/storage';
import { setSentryUser, clearSentryUser, captureException } from '@/lib/sentry';
import { analytics } from '@/lib/analytics';
import type { UserProfile, UserRole, SessionStatus } from '@/types';

/**
 * AuthService — all Supabase auth operations.
 *
 * Reads/writes the Zustand session store directly (not via hooks).
 * The AuthProvider calls setupListener() once on mount.
 */
class AuthService {
  // ─── Private helpers ────────────────────────────────────────────────────────

  private getStore() {
    return useSessionStore.getState();
  }

  private async fetchProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        captureException(error, { context: 'fetchProfile', userId });
        return null;
      }
      return data as UserProfile;
    } catch (error) {
      captureException(error, { context: 'fetchProfile', userId });
      return null;
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Bootstrap session state on app cold start.
   * Call once from AuthProvider on mount.
   */
  async initialize(): Promise<void> {
    const { _setStatus, _setLoading, _reset, _setAuthenticated, _setSessionUser } =
      this.getStore();

    try {
      _setStatus('BOOTSTRAPPING');

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        captureException(error, { context: 'auth/initialize' });
        _reset();
        return;
      }

      if (!session) {
        _reset();
        return;
      }

      // Session exists — fetch profile
      _setStatus('SESSION_RECOVERY');
      _setSessionUser(session, session.user);

      const profile = await this.fetchProfile(session.user.id);

      if (!profile) {
        // Profile missing → session invalid, demote to guest
        _setStatus('SESSION_INVALID');
        _setLoading(false);
        return;
      }

      _setAuthenticated(session, session.user, profile);

      setSentryUser(session.user.id, profile.role);
      analytics.identify(session.user.id, { role: profile.role });
    } catch (error) {
      captureException(error, { context: 'auth/initialize' });
      _reset();
    }
  }

  /**
   * Subscribe to Supabase auth state changes.
   * Returns the unsubscribe function — call it in useEffect cleanup.
   */
  setupListener(): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const store = this.getStore();

        if (event === 'SIGNED_OUT') {
          store._reset();
          clearSentryUser();
          analytics.reset();
          await Promise.all([
            storage.remove(storage.keys.OFFLINE_QUEUE),
            storage.remove(storage.keys.RETURN_INTENT),
          ]);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (!session) return;

          store._setStatus('SESSION_RECOVERY');
          store._setSessionUser(session, session.user);

          const profile = await this.fetchProfile(session.user.id);

          if (profile) {
            store._setAuthenticated(session, session.user, profile);
            setSentryUser(session.user.id, profile.role);
            analytics.identify(session.user.id, { role: profile.role });
          } else {
            store._setStatus('SESSION_INVALID');
            store._setLoading(false);
          }
          return;
        }

        if (event === 'USER_UPDATED' && session) {
          store._setSessionUser(session, session.user);
          const profile = await this.fetchProfile(session.user.id);
          if (profile) store._setProfile(profile);
        }
      },
    );

    return () => subscription.unsubscribe();
  }

  // ─── Auth mutations ──────────────────────────────────────────────────────────

  async signIn(
    email: string,
    password: string,
  ): Promise<{ error: AuthError | null }> {
    analytics.track('auth_sign_in_attempt');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        analytics.track('auth_sign_in_failure', { error_code: error.status ?? 0 });
      } else {
        analytics.track('auth_sign_in_success');
      }

      return { error };
    } catch (error) {
      captureException(error, { context: 'auth/signIn' });
      return { error: error as AuthError };
    }
  }

  async signUp(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<{ error: AuthError | null }> {
    analytics.track('auth_sign_up_attempt');
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: displayName ?? email.split('@')[0],
          },
        },
      });

      if (!error) analytics.track('auth_sign_up_success');
      return { error };
    } catch (error) {
      captureException(error, { context: 'auth/signUp' });
      return { error: error as AuthError };
    }
  }

  async signOut(): Promise<void> {
    analytics.track('auth_sign_out');
    try {
      await supabase.auth.signOut();
      // onAuthStateChange SIGNED_OUT handler does the store reset
    } catch (error) {
      captureException(error, { context: 'auth/signOut' });
      // Force reset even if Supabase call fails
      this.getStore()._reset();
    }
  }

  async refreshProfile(): Promise<void> {
    const { user } = this.getStore();
    if (!user) return;

    const profile = await this.fetchProfile(user.id);
    if (profile) {
      this.getStore()._setProfile(profile);
    }
  }
}

// Singleton — import this directly where auth operations are needed
export const authService = new AuthService();
```

---

## `src/contexts/AuthContext.tsx` — MODIFIED (lean bridge)

```typescript
import React, { useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { useSessionStore } from '@/stores/session.store';
import type { AuthError } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile, SessionState } from '@/types';

/**
 * AuthProvider — side-effect container only.
 *
 * Responsibilities:
 *  1. Initialize session on mount
 *  2. Set up Supabase auth listener
 *  3. Clean up listener on unmount
 *
 * All state lives in Zustand (useSessionStore).
 * This provider does NOT hold any state itself.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Bootstrap existing session
    authService.initialize();

    // 2. Listen for auth changes (sign in/out/token refresh)
    const unsubscribe = authService.setupListener();

    // 3. Cleanup
    return () => {
      unsubscribe();
    };
  }, []); // Empty deps: runs once on mount

  return <>{children}</>;
}

/**
 * useAuth — primary auth hook for all components.
 *
 * Interface is IDENTICAL to the previous version — no call sites need updating.
 * Now reads from Zustand instead of React Context.
 */
export function useAuth(): {
  sessionState: SessionState;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  canAccessProtectedRoute: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
} {
  const {
    session,
    user,
    profile,
    sessionState,
    loading,
    isGuest,
    isAuthenticated,
    canAccessProtectedRoute,
  } = useSessionStore();

  return {
    session,
    user,
    profile,
    sessionState,
    loading,
    isGuest,
    isAuthenticated,
    canAccessProtectedRoute,
    signIn: authService.signIn.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService),
    refreshProfile: authService.refreshProfile.bind(authService),
  };
}
```

---

## `app/_layout.tsx` — MODIFIED

```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/lib/query-client';   // ← new: includes NetInfo wiring
import { initSentry } from '@/lib/sentry';           // ← new

// Initialize Sentry before anything renders
initSentry();

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="(auth)"
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                  name="bathroom/[id]"
                  options={{
                    presentation: 'card',
                    headerShown: true,
                    headerTitle: 'Bathroom Details',
                  }}
                />
              </Stack>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
```

---

## `app.config.ts` — MODIFIED

```typescript
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Pee-Dom',
  slug: 'peedom-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'peedom',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.peedom.mobile',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Pee-Dom uses your location to show nearby bathrooms when you tap "Use My Location".',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.peedom.mobile',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    config: {
      googleMaps: {
        apiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Pee-Dom uses your location to show nearby bathrooms.',
      },
    ],
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY ?? '',
      },
    ],
    // Sentry — only active when DSN is present
    ...(process.env.EXPO_PUBLIC_SENTRY_DSN
      ? [
          [
            '@sentry/react-native/expo',
            {
              organization: process.env.SENTRY_ORG ?? '',
              project: process.env.SENTRY_PROJECT ?? '',
              authToken: process.env.SENTRY_AUTH_TOKEN ?? '',
            },
          ],
        ]
      : []),
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: { origin: false },
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '' },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV ?? 'local',
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  },
});
```

---

## `.github/workflows/ci.yml` — REPLACED

```yaml
name: PeeDom CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ─── Quality Gate ──────────────────────────────────────────────────────────
  quality:
    name: Type Check + Lint + Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: TypeScript — check strict
        run: npm run type-check

      - name: ESLint
        run: npm run lint

      - name: Jest — unit + integration tests
        run: npx jest --coverage --ci
        env:
          CI: true

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false

  # ─── EAS Preview Build (PRs only) ─────────────────────────────────────────
  eas-preview:
    name: EAS Preview Build
    runs-on: ubuntu-latest
    needs: quality
    if: github.event_name == 'pull_request'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: EAS Preview Build (Android APK)
        run: eas build --profile preview --platform android --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

  # ─── EAS Production Build (main only) ────────────────────────────────────
  eas-production:
    name: EAS Production Build
    runs-on: ubuntu-latest
    needs: quality
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: EAS Production Build
        run: eas build --profile production --platform all --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          EXPO_PUBLIC_SENTRY_DSN: ${{ secrets.EXPO_PUBLIC_SENTRY_DSN }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

---

# Validation Block — SDET

## `src/lib/__tests__/sentry.test.ts`

```typescript
jest.mock('@sentry/react-native', () => require('src/__mocks__/@sentry/react-native'));

import {
  initSentry,
  captureException,
  captureMessage,
  setSentryUser,
  clearSentryUser,
} from '@/lib/sentry';
import * as Sentry from '@sentry/react-native';

const mockInit = Sentry.init as jest.Mock;
const mockCapture = Sentry.captureException as jest.Mock;
const mockMessage = Sentry.captureMessage as jest.Mock;
const mockSetUser = Sentry.setUser as jest.Mock;
const mockWithScope = Sentry.withScope as jest.Mock;

describe('sentry.ts', () => {
  const originalDSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

  afterEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_SENTRY_DSN = originalDSN;
  });

  // ─── initSentry ──────────────────────────────────────────────────────────

  describe('initSentry()', () => {
    it('does NOT call Sentry.init when DSN is absent', () => {
      delete process.env.EXPO_PUBLIC_SENTRY_DSN;
      initSentry();
      expect(mockInit).not.toHaveBeenCalled();
    });

    it('calls Sentry.init with correct options when DSN is present', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@o0.ingest.sentry.io/0';
      initSentry();
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@o0.ingest.sentry.io/0',
          enableInExpoDevelopment: false,
          debug: false,
        }),
      );
    });

    it('strips email from user data in beforeSend', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@o0.ingest.sentry.io/0';
      initSentry();
      const { beforeSend } = mockInit.mock.calls[0][0];

      const event = { user: { id: 'abc', email: 'test@test.com' } };
      const result = beforeSend(event);

      expect(result.user).not.toHaveProperty('email');
      expect(result.user).toHaveProperty('id', 'abc');
    });

    it('removes request body in beforeSend', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@o0.ingest.sentry.io/0';
      initSentry();
      const { beforeSend } = mockInit.mock.calls[0][0];

      const event = {
        request: { url: '/auth/login', data: { password: 'secret' } },
      };
      const result = beforeSend(event);
      expect(result.request).not.toHaveProperty('data');
    });
  });

  // ─── captureException ────────────────────────────────────────────────────

  describe('captureException()', () => {
    it('is a no-op when DSN is absent', () => {
      delete process.env.EXPO_PUBLIC_SENTRY_DSN;
      captureException(new Error('test'));
      expect(mockWithScope).not.toHaveBeenCalled();
    });

    it('calls withScope when DSN is present', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@o0.ingest.sentry.io/0';
      captureException(new Error('test error'), { context: 'auth' });
      expect(mockWithScope).toHaveBeenCalled();
    });
  });

  // ─── captureMessage ──────────────────────────────────────────────────────

  describe('captureMessage()', () => {
    it('is a no-op when DSN is absent', () => {
      delete process.env.EXPO_PUBLIC_SENTRY_DSN;
      captureMessage('test message');
      expect(mockMessage).not.toHaveBeenCalled();
    });
  });

  // ─── user context ─────────────────────────────────────────────────────────

  describe('setSentryUser() / clearSentryUser()', () => {
    it('does not call Sentry.setUser when DSN is absent', () => {
      delete process.env.EXPO_PUBLIC_SENTRY_DSN;
      setSentryUser('user-123', 'user');
      clearSentryUser();
      expect(mockSetUser).not.toHaveBeenCalled();
    });
  });
});
```

---

## `src/lib/__tests__/query-client.test.ts`

```typescript
jest.mock('@react-native-community/netinfo', () =>
  require('src/__mocks__/@react-native-community/netinfo'),
);
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    onlineManager: {
      setEventListener: jest.fn(),
      setOnline: jest.fn(),
    },
  };
});

import { queryClient } from '@/lib/query-client';
import { onlineManager } from '@tanstack/react-query';

describe('query-client.ts', () => {
  it('creates a QueryClient instance', () => {
    expect(queryClient).toBeDefined();
    expect(typeof queryClient.invalidateQueries).toBe('function');
  });

  it('wires NetInfo to onlineManager on module load', () => {
    expect(onlineManager.setEventListener).toHaveBeenCalled();
  });

  it('does not retry on JWT/auth errors', () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;

    const jwtError = new Error('JWT expired');
    expect(retryFn(0, jwtError)).toBe(false);

    const forbiddenError = new Error('Forbidden access');
    expect(retryFn(0, forbiddenError)).toBe(false);

    const notFoundError = new Error('not found');
    expect(retryFn(0, notFoundError)).toBe(false);
  });

  it('retries network errors up to 2 times', () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
    const networkError = new Error('Network request failed');

    expect(retryFn(0, networkError)).toBe(true);
    expect(retryFn(1, networkError)).toBe(true);
    expect(retryFn(2, networkError)).toBe(false);
  });
});
```

---

## `src/lib/validators/__tests__/auth.test.ts`

```typescript
import { SignInSchema, SignUpSchema } from '@/lib/validators/auth';

describe('auth validators', () => {
  describe('SignInSchema', () => {
    it('accepts valid credentials', () => {
      const result = SignInSchema.safeParse({
        email: 'user@example.com',
        password: 'SecurePass1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = SignInSchema.safeParse({ email: 'not-an-email', password: 'pass1234' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('email');
    });

    it('rejects password shorter than 8 characters', () => {
      const result = SignInSchema.safeParse({ email: 'a@b.com', password: 'short' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('password');
    });

    it('rejects missing fields', () => {
      expect(SignInSchema.safeParse({}).success).toBe(false);
      expect(SignInSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
    });
  });

  describe('SignUpSchema', () => {
    const valid = {
      email: 'new@user.com',
      password: 'StrongPass1',
      confirmPassword: 'StrongPass1',
      displayName: 'New User',
    };

    it('accepts valid sign-up data', () => {
      expect(SignUpSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const result = SignUpSchema.safeParse({
        ...valid,
        confirmPassword: 'different',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('confirmPassword');
    });

    it('rejects password without uppercase', () => {
      const result = SignUpSchema.safeParse({
        ...valid,
        password: 'allowercase1',
        confirmPassword: 'allowercase1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without a number', () => {
      const result = SignUpSchema.safeParse({
        ...valid,
        password: 'NoNumbers!',
        confirmPassword: 'NoNumbers!',
      });
      expect(result.success).toBe(false);
    });

    it('allows optional displayName', () => {
      const { displayName: _, ...withoutName } = valid;
      expect(SignUpSchema.safeParse(withoutName).success).toBe(true);
    });
  });
});
```

---

## `src/lib/validators/__tests__/mutation.test.ts`

```typescript
import { validateMutationPayload, validateQueuedMutations } from '@/lib/validators/mutation';

describe('mutation validators', () => {
  describe('validateMutationPayload()', () => {
    it('validates favorite_add with valid UUID', () => {
      const result = validateMutationPayload('favorite_add', {
        bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects favorite_add with invalid UUID', () => {
      const result = validateMutationPayload('favorite_add', {
        bathroom_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('validates code_vote with vote=1', () => {
      const result = validateMutationPayload('code_vote', {
        code_id: '550e8400-e29b-41d4-a716-446655440000',
        vote: 1,
      });
      expect(result.success).toBe(true);
    });

    it('rejects code_vote with vote=0 (invalid)', () => {
      const result = validateMutationPayload('code_vote', {
        code_id: '550e8400-e29b-41d4-a716-446655440000',
        vote: 0, // only -1 or 1 allowed
      });
      expect(result.success).toBe(false);
    });

    it('validates rating_create with rating in 1-5', () => {
      expect(
        validateMutationPayload('rating_create', {
          bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
          rating: 3,
        }).success,
      ).toBe(true);
    });

    it('rejects rating_create with rating=6', () => {
      expect(
        validateMutationPayload('rating_create', {
          bathroom_id: '550e8400-e29b-41d4-a716-446655440000',
          rating: 6,
        }).success,
      ).toBe(false);
    });
  });

  describe('validateQueuedMutations()', () => {
    const validMutation = {
      id: 'mutation_1',
      type: 'favorite_add',
      payload: { bathroom_id: '550e8400-e29b-41d4-a716-446655440000' },
      created_at: new Date().toISOString(),
      retry_count: 0,
      last_attempt_at: null,
      user_id: '550e8400-e29b-41d4-a716-446655440001',
    };

    it('passes all valid mutations through', () => {
      const { valid, invalid } = validateQueuedMutations([validMutation]);
      expect(valid).toHaveLength(1);
      expect(invalid).toHaveLength(0);
    });

    it('filters out corrupt entries (e.g. missing user_id)', () => {
      const corrupt = { ...validMutation, user_id: 'not-a-uuid' };
      const { valid, invalid } = validateQueuedMutations([corrupt]);
      expect(valid).toHaveLength(0);
      expect(invalid).toHaveLength(1);
    });

    it('filters entries where payload does not match type', () => {
      const mismatch = {
        ...validMutation,
        type: 'code_vote',
        payload: { wrong_field: true }, // missing code_id and vote
      };
      const { valid, invalid } = validateQueuedMutations([mismatch]);
      expect(valid).toHaveLength(0);
      expect(invalid).toHaveLength(1);
    });

    it('handles empty array', () => {
      const { valid, invalid } = validateQueuedMutations([]);
      expect(valid).toHaveLength(0);
      expect(invalid).toHaveLength(0);
    });

    it('handles mixed valid and invalid', () => {
      const corrupt = { ...validMutation, id: undefined };
      const { valid, invalid } = validateQueuedMutations([validMutation, corrupt]);
      expect(valid).toHaveLength(1);
      expect(invalid).toHaveLength(1);
    });
  });
});
```

---

## `src/stores/__tests__/session.store.test.ts`

```typescript
import { useSessionStore } from '@/stores/session.store';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';

const mockSession = { user: { id: 'user-123', email: 'test@test.com' } } as Session;
const mockUser = { id: 'user-123', email: 'test@test.com' } as User;
const mockProfile: UserProfile = {
  id: 'user-123',
  email: 'test@test.com',
  display_name: 'Test User',
  role: 'user',
  points_balance: 100,
  is_premium: false,
  is_suspended: false,
  created_at: new Date().toISOString(),
};

describe('session.store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSessionStore.getState()._reset();
  });

  it('starts in BOOTSTRAPPING state with loading=true', () => {
    // After _reset(), store is GUEST — reinitialize to test initial state
    const store = useSessionStore.getState();
    store._setStatus('BOOTSTRAPPING');
    store._setLoading(true);

    expect(store.sessionStatus).toBe('BOOTSTRAPPING');
    expect(store.loading).toBe(true);
    expect(store.isAuthenticated).toBe(false);
  });

  it('_reset() sets GUEST state correctly', () => {
    const store = useSessionStore.getState();
    store._reset();

    expect(store.sessionStatus).toBe('GUEST');
    expect(store.isGuest).toBe(true);
    expect(store.isAuthenticated).toBe(false);
    expect(store.canAccessProtectedRoute).toBe(false);
    expect(store.session).toBeNull();
    expect(store.user).toBeNull();
    expect(store.profile).toBeNull();
    expect(store.loading).toBe(false);
  });

  it('_setAuthenticated() transitions to AUTHENTICATED_USER for role=user', () => {
    useSessionStore.getState()._setAuthenticated(mockSession, mockUser, mockProfile);
    const store = useSessionStore.getState();

    expect(store.sessionStatus).toBe('AUTHENTICATED_USER');
    expect(store.isAuthenticated).toBe(true);
    expect(store.isGuest).toBe(false);
    expect(store.canAccessProtectedRoute).toBe(true);
    expect(store.session).toBe(mockSession);
    expect(store.profile).toBe(mockProfile);
    expect(store.loading).toBe(false);
  });

  it('_setAuthenticated() transitions to AUTHENTICATED_ADMIN for role=admin', () => {
    const adminProfile = { ...mockProfile, role: 'admin' as const };
    useSessionStore.getState()._setAuthenticated(mockSession, mockUser, adminProfile);

    expect(useSessionStore.getState().sessionStatus).toBe('AUTHENTICATED_ADMIN');
  });

  it('_setAuthenticated() transitions to AUTHENTICATED_BUSINESS for role=business', () => {
    const bizProfile = { ...mockProfile, role: 'business' as const };
    useSessionStore.getState()._setAuthenticated(mockSession, mockUser, bizProfile);

    expect(useSessionStore.getState().sessionStatus).toBe('AUTHENTICATED_BUSINESS');
  });

  it('_setStatus(SESSION_INVALID) sets canAccessProtectedRoute=false', () => {
    // Even if we had set authenticated before
    useSessionStore.getState()._setAuthenticated(mockSession, mockUser, mockProfile);
    useSessionStore.getState()._setStatus('SESSION_INVALID');

    const store = useSessionStore.getState();
    expect(store.canAccessProtectedRoute).toBe(false);
    expect(store.isAuthenticated).toBe(false);
  });

  it('sessionState reflects current state correctly after transition', () => {
    useSessionStore.getState()._setAuthenticated(mockSession, mockUser, mockProfile);
    const { sessionState } = useSessionStore.getState();

    expect(sessionState.status).toBe('AUTHENTICATED_USER');
    expect(sessionState.session?.user_id).toBe('user-123');
    expect(sessionState.profile?.role).toBe('user');
    expect(sessionState.profile?.points_balance).toBe(100);
  });

  it('_setProfile() re-derives sessionStatus from current session', () => {
    // Start with session but no profile
    useSessionStore.getState()._setSessionUser(mockSession, mockUser);
    useSessionStore.getState()._setStatus('SESSION_RECOVERY');

    // Now set profile — should auto-derive AUTHENTICATED_USER
    useSessionStore.getState()._setProfile(mockProfile);

    expect(useSessionStore.getState().sessionStatus).toBe('AUTHENTICATED_USER');
    expect(useSessionStore.getState().isAuthenticated).toBe(true);
  });

  it('_setProfile() with null session stays GUEST', () => {
    useSessionStore.getState()._reset(); // session=null
    useSessionStore.getState()._setProfile(mockProfile); // profile set but no session

    expect(useSessionStore.getState().sessionStatus).toBe('GUEST');
  });
});
```

---

## `src/stores/__tests__/map.store.test.ts`

```typescript
import { useMapStore } from '@/stores/map.store';

// Mock AsyncStorage for persist middleware
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('map.store', () => {
  beforeEach(() => {
    useMapStore.getState().resetFilters();
    useMapStore.getState().setSelectedBathroom(null);
  });

  it('starts with default filters (all off)', () => {
    const { filters } = useMapStore.getState();
    expect(filters.openNow).toBe(false);
    expect(filters.accessibleOnly).toBe(false);
    expect(filters.noCodeRequired).toBe(false);
    expect(filters.minCleanlinessRating).toBe(0);
  });

  it('hasActiveFilters() returns false by default', () => {
    expect(useMapStore.getState().hasActiveFilters()).toBe(false);
  });

  it('hasActiveFilters() returns true after setting openNow', () => {
    useMapStore.getState().setFilter('openNow', true);
    expect(useMapStore.getState().hasActiveFilters()).toBe(true);
  });

  it('hasActiveFilters() returns true when minCleanlinessRating > 0', () => {
    useMapStore.getState().setFilter('minCleanlinessRating', 3);
    expect(useMapStore.getState().hasActiveFilters()).toBe(true);
  });

  it('resetFilters() clears all active filters', () => {
    useMapStore.getState().setFilter('openNow', true);
    useMapStore.getState().setFilter('accessibleOnly', true);
    useMapStore.getState().resetFilters();

    expect(useMapStore.getState().hasActiveFilters()).toBe(false);
  });

  it('setSelectedBathroom() updates selectedBathroomId', () => {
    useMapStore.getState().setSelectedBathroom('bathroom-abc');
    expect(useMapStore.getState().selectedBathroomId).toBe('bathroom-abc');

    useMapStore.getState().setSelectedBathroom(null);
    expect(useMapStore.getState().selectedBathroomId).toBeNull();
  });

  it('setRegion() merges partial region updates', () => {
    useMapStore.getState().setRegion({ latitude: 47.6062, longitude: -122.3321 });
    const { region } = useMapStore.getState();

    expect(region.latitude).toBe(47.6062);
    expect(region.longitude).toBe(-122.3321);
    // Deltas should be unchanged from default
    expect(region.latitudeDelta).toBeDefined();
  });
});
```

---

## `src/services/__tests__/auth.service.test.ts`

```typescript
jest.mock('@/lib/supabase', () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry', () => ({
  setSentryUser: jest.fn(),
  clearSentryUser: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { track: jest.fn(), identify: jest.fn(), reset: jest.fn() },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { authService } from '@/services/auth.service';
import { useSessionStore } from '@/stores/session.store';
import { supabase, resetSupabaseMocks } from 'src/__mocks__/supabase';

const mockProfile = {
  id: 'user-123',
  email: 'test@test.com',
  display_name: 'Test User',
  role: 'user',
  points_balance: 0,
  is_premium: false,
  is_suspended: false,
  created_at: new Date().toISOString(),
};

const mockSession = {
  user: { id: 'user-123', email: 'test@test.com' },
  access_token: 'token-abc',
};

describe('AuthService', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    useSessionStore.getState()._reset();
  });

  // ─── initialize() ──────────────────────────────────────────────────────────

  describe('initialize()', () => {
    it('sets GUEST state when no session exists', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await authService.initialize();

      const store = useSessionStore.getState();
      expect(store.sessionStatus).toBe('GUEST');
      expect(store.isGuest).toBe(true);
      expect(store.loading).toBe(false);
    });

    it('transitions to AUTHENTICATED_USER when session + profile found', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
      });

      await authService.initialize();

      const store = useSessionStore.getState();
      expect(store.sessionStatus).toBe('AUTHENTICATED_USER');
      expect(store.isAuthenticated).toBe(true);
      expect(store.loading).toBe(false);
    });

    it('sets SESSION_INVALID when profile fetch fails', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
      });

      await authService.initialize();

      const store = useSessionStore.getState();
      expect(store.sessionStatus).toBe('SESSION_INVALID');
      expect(store.canAccessProtectedRoute).toBe(false);
    });

    it('resets to GUEST when getSession returns an error', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Network error', status: 500 },
      });

      await authService.initialize();

      expect(useSessionStore.getState().sessionStatus).toBe('GUEST');
    });

    it('handles unexpected thrown errors gracefully', async () => {
      supabase.auth.getSession.mockRejectedValueOnce(new Error('Unexpected crash'));

      await expect(authService.initialize()).resolves.not.toThrow();
      expect(useSessionStore.getState().sessionStatus).toBe('GUEST');
    });
  });

  // ─── signIn() ──────────────────────────────────────────────────────────────

  describe('signIn()', () => {
    it('returns null error on success', async () => {
      supabase.auth.signInWithPassword.mockResolvedValueOnce({ error: null });
      const { error } = await authService.signIn('test@test.com', 'Password1');
      expect(error).toBeNull();
    });

    it('returns error on failure', async () => {
      const mockError = { message: 'Invalid credentials', status: 400 };
      supabase.auth.signInWithPassword.mockResolvedValueOnce({ error: mockError });
      const { error } = await authService.signIn('test@test.com', 'wrong');
      expect(error).toEqual(mockError);
    });
  });

  // ─── signOut() ─────────────────────────────────────────────────────────────

  describe('signOut()', () => {
    it('calls supabase.auth.signOut', async () => {
      supabase.auth.signOut.mockResolvedValueOnce({ error: null });
      await authService.signOut();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('force-resets store even if signOut API call throws', async () => {
      supabase.auth.signOut.mockRejectedValueOnce(new Error('Network error'));
      useSessionStore.getState()._setAuthenticated(
        mockSession as any,
        mockSession.user as any,
        mockProfile as any,
      );

      await authService.signOut();

      expect(useSessionStore.getState().sessionStatus).toBe('GUEST');
    });
  });
});
```

---

## Security Validation SQL

Run these in Supabase SQL Editor to validate RLS is correct:

```sql
-- ============================================================================
-- PeeDom Section 14: Security Validation Scripts
-- Run as individual statements; each should produce the expected result.
-- ============================================================================

-- 1. Verify profiles are only readable by the owning user
-- Expected: 0 rows (anon cannot read any profiles)
select count(*) from public.profiles;
-- Run as: anon role via Supabase dashboard "Run as anonymous"

-- 2. Verify bathrooms are publicly readable (active only)
-- Expected: rows with moderation_status = 'active' only
select distinct moderation_status from public.bathrooms;

-- 3. Verify favorites are not cross-readable
-- Expected: only the authenticated user's favorites visible
-- (Run as a signed-in user, check user_id matches auth.uid())
select user_id, count(*)
from public.favorites
group by user_id;

-- 4. Verify offline queue key is user-scoped in storage
-- (Validation: check that the queue key pattern '@peedom/offline_queue:<user_id>'
-- is correct in src/lib/offline-queue.ts — no cross-user data leakage)
-- This is enforced in code, not DB — see offline-queue.ts initialize()

-- 5. Verify bathroom_reports are only visible to reporter
-- Expected: each user can only see their own reports
select reported_by, count(*)
from public.bathroom_reports
group by reported_by;
-- Should only return 1 row for the currently authenticated user
```

---

## Performance Notes

- **`src/stores/map.store.ts`** — `persist` middleware writes to AsyncStorage on every filter change. Acceptable for filter preferences; do NOT add `region` to the persisted slice (would write on every map pan).
- **`src/stores/session.store.ts`** — All derived booleans (`isGuest`, `isAuthenticated`, `canAccessProtectedRoute`) update atomically with `sessionStatus`. Zero extra renders vs. computing in selectors.
- **`src/lib/query-client.ts`** — `onlineManager.setEventListener` executes at module load (not component mount), meaning the NetInfo subscription is active before any component renders. This is intentional and correct per TanStack Query v5 React Native guidance.
- **Memory leak check** — `authService.setupListener()` returns the unsubscribe function. `AuthProvider` stores it in a `useEffect` cleanup. The Supabase subscription is always cleaned up on unmount. ✅

---

## Section 14 Checklist

| Task | Status |
|------|--------|
| `@sentry/react-native` installed + initialized | ✅ Code complete |
| `@react-native-community/netinfo` installed + wired to `onlineManager` | ✅ Code complete |
| `zod` installed + 4 validator modules with all mutation types covered | ✅ Code complete |
| `zustand` installed + 3 stores (session, map, ui) | ✅ Code complete |
| `AuthContext` decomposed — backward-compat `useAuth()` preserved | ✅ Code complete |
| `AuthService` singleton with full lifecycle | ✅ Code complete |
| `ErrorBoundary` with Sentry integration | ✅ Code complete |
| `app/_layout.tsx` updated | ✅ Code complete |
| GitHub Actions CI (type-check → lint → test → EAS builds) | ✅ Code complete |
| Analytics abstraction (privacy-first, pluggable) | ✅ Code complete |
| Jest setup + all module mocks | ✅ Code complete |
| Tests for every module above | ✅ Code complete |
| Security validation SQL | ✅ Code complete |

**Section 14 is complete. Say "Next" to proceed to Section 1: The Trust Engine, or "Integrated" if you need to verify first.**

## User

`2026-03-16T07:24:22.384Z`

as well as this: *[Pre-flight simulation: Section 1]*Clean. No conflicts. Beginning output.

---

# Section 1: The Trust Engine

## Terminal Commands

```bash
npx expo install expo-image-picker expo-image-manipulator
```

---

## 1. Database — `supabase/migrations/003_trust_engine.sql`

```sql
-- ============================================================================
-- PeeDom Trust Engine Migration
-- 003_trust_engine.sql
-- ============================================================================

-- ─── Storage bucket for bathroom photos ─────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bathroom-photos',
  'bathroom-photos',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

-- Storage RLS
create policy "bathroom_photos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'bathroom-photos');

create policy "bathroom_photos_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'bathroom-photos');

create policy "bathroom_photos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'bathroom-photos' and owner = auth.uid()::text);

-- ─── Bathroom photos table ───────────────────────────────────────────────────

create table if not exists public.bathroom_photos (
  id               uuid primary key default gen_random_uuid(),
  bathroom_id      uuid not null references public.bathrooms(id) on delete cascade,
  uploaded_by      uuid not null references public.profiles(id) on delete cascade,
  storage_path     text not null,
  photo_type       text not null default 'interior' check (
    photo_type in ('exterior', 'interior', 'keypad', 'sign')
  ),
  width            integer,
  height           integer,
  moderation_status text not null default 'approved' check (
    moderation_status in ('pending', 'approved', 'rejected')
  ),
  created_at       timestamptz not null default now()
);

create index if not exists idx_bathroom_photos_bathroom
  on public.bathroom_photos(bathroom_id);
create index if not exists idx_bathroom_photos_uploaded_by
  on public.bathroom_photos(uploaded_by);
create index if not exists idx_bathroom_photos_status
  on public.bathroom_photos(moderation_status);

alter table public.bathroom_photos enable row level security;

create policy "bathroom_photos_select_approved"
  on public.bathroom_photos for select
  using (moderation_status = 'approved');

create policy "bathroom_photos_insert_authenticated"
  on public.bathroom_photos for insert
  with check (auth.uid() = uploaded_by);

create policy "bathroom_photos_delete_own"
  on public.bathroom_photos for delete
  using (auth.uid() = uploaded_by);

-- ─── Confidence score computation ────────────────────────────────────────────
-- Formula:
--   vote_ratio  = up_votes / (up_votes + down_votes)
--   recency     = time-decay factor based on last_verified_at
--   score       = vote_ratio × 100 × recency   [0–100]

create or replace function public.compute_confidence_score(
  p_up_votes        integer,
  p_down_votes      integer,
  p_last_verified   timestamptz
)
returns numeric(5,2)
language plpgsql
stable
set search_path = public
as $$
declare
  v_total   integer;
  v_ratio   numeric;
  v_recency numeric;
begin
  v_total := coalesce(p_up_votes, 0) + coalesce(p_down_votes, 0);

  if v_total = 0 then
    return 0.00;
  end if;

  v_ratio := coalesce(p_up_votes, 0)::numeric / v_total::numeric;

  v_recency := case
    when p_last_verified is null                              then 0.50
    when (now() - p_last_verified) < interval '24 hours'     then 1.00
    when (now() - p_last_verified) < interval '7 days'       then 0.85
    when (now() - p_last_verified) < interval '30 days'      then 0.65
    when (now() - p_last_verified) < interval '90 days'      then 0.45
    else                                                           0.25
  end;

  return greatest(0.00, least(100.00, round(v_ratio * 100.0 * v_recency, 2)));
end;
$$;

-- ─── Override update_code_vote_counts to also recompute confidence_score ─────
-- Replaces the version from migration 001_foundation_schema.sql

create or replace function public.update_code_vote_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_code_id uuid;
begin
  v_code_id := case when TG_OP = 'DELETE' then old.code_id else new.code_id end;

  -- Step 1: update raw vote counts
  if TG_OP = 'INSERT' then
    update public.bathroom_access_codes
    set
      up_votes   = up_votes   + case when new.vote =  1 then 1 else 0 end,
      down_votes = down_votes + case when new.vote = -1 then 1 else 0 end,
      updated_at = now()
    where id = v_code_id;

  elsif TG_OP = 'UPDATE' then
    update public.bathroom_access_codes
    set
      up_votes   = up_votes
                   + case when new.vote =  1 then 1 else 0 end
                   - case when old.vote =  1 then 1 else 0 end,
      down_votes = down_votes
                   + case when new.vote = -1 then 1 else 0 end
                   - case when old.vote = -1 then 1 else 0 end,
      updated_at = now()
    where id = v_code_id;

  elsif TG_OP = 'DELETE' then
    update public.bathroom_access_codes
    set
      up_votes   = greatest(0, up_votes   - case when old.vote =  1 then 1 else 0 end),
      down_votes = greatest(0, down_votes - case when old.vote = -1 then 1 else 0 end),
      updated_at = now()
    where id = v_code_id;
  end if;

  -- Step 2: recompute confidence_score from current values
  update public.bathroom_access_codes bac
  set confidence_score = public.compute_confidence_score(
    bac.up_votes,
    bac.down_votes,
    bac.last_verified_at
  )
  where bac.id = v_code_id;

  return case when TG_OP = 'DELETE' then old else new end;
end;
$$;

-- ─── RPC: get_bathroom_codes ─────────────────────────────────────────────────
-- Returns all active visible codes for a bathroom,
-- with the authenticated user's existing vote (if any).

create or replace function public.get_bathroom_codes(
  p_bathroom_id uuid
)
returns table (
  id               uuid,
  bathroom_id      uuid,
  submitted_by     uuid,
  code_value       text,
  confidence_score numeric,
  up_votes         integer,
  down_votes       integer,
  last_verified_at timestamptz,
  expires_at       timestamptz,
  visibility_status text,
  lifecycle_status  text,
  created_at        timestamptz,
  updated_at        timestamptz,
  user_vote         smallint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    bac.id,
    bac.bathroom_id,
    bac.submitted_by,
    bac.code_value,
    bac.confidence_score,
    bac.up_votes,
    bac.down_votes,
    bac.last_verified_at,
    bac.expires_at,
    bac.visibility_status,
    bac.lifecycle_status,
    bac.created_at,
    bac.updated_at,
    cv.vote as user_vote
  from public.bathroom_access_codes bac
  left join public.code_votes cv
    on  cv.code_id  = bac.id
    and cv.user_id  = auth.uid()
  where bac.bathroom_id      = p_bathroom_id
    and bac.visibility_status = 'visible'
    and bac.lifecycle_status  = 'active'
  order by bac.confidence_score desc, bac.last_verified_at desc nulls last;
$$;

-- ─── RPC: verify_code ────────────────────────────────────────────────────────
-- "Did this code work?" action.
-- Upserts a vote AND, if worked=true, updates last_verified_at.
-- Prevents self-verification.

create or replace function public.verify_code(
  p_code_id uuid,
  p_worked  boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vote         smallint := case when p_worked then 1 else -1 end;
  v_submitter_id uuid;
  v_code_active  boolean;
begin
  -- Auth check
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  -- Verify code exists, is active, and retrieve submitter
  select
    (visibility_status = 'visible' and lifecycle_status = 'active'),
    submitted_by
  into v_code_active, v_submitter_id
  from public.bathroom_access_codes
  where id = p_code_id;

  if not found or not v_code_active then
    return jsonb_build_object('success', false, 'error', 'code_not_found');
  end if;

  -- Prevent self-gaming
  if v_submitter_id = auth.uid() then
    return jsonb_build_object('success', false, 'error', 'cannot_verify_own_code');
  end if;

  -- Upsert vote → triggers update_code_vote_counts → recomputes confidence_score
  insert into public.code_votes (code_id, user_id, vote)
  values (p_code_id, auth.uid(), v_vote)
  on conflict (code_id, user_id)
  do update set vote = excluded.vote, updated_at = now();

  -- If worked, refresh last_verified_at and recompute score with updated timestamp
  if p_worked then
    update public.bathroom_access_codes
    set
      last_verified_at = now(),
      updated_at       = now(),
      confidence_score = public.compute_confidence_score(up_votes, down_votes, now())
    where id = p_code_id;
  end if;

  return jsonb_build_object('success', true, 'vote', v_vote);
end;
$$;

-- ─── RPC: submit_bathroom_code ───────────────────────────────────────────────
-- Submits a new access code. Rate-limited to 10 per user per day
-- (enforced here; the confidence_score starts at 0 until verified).

create or replace function public.submit_bathroom_code(
  p_bathroom_id uuid,
  p_code_value  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_daily_count integer;
  v_new_id      uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  -- Rate limit: max 10 code submissions per user per day
  select count(*) into v_daily_count
  from public.bathroom_access_codes
  where submitted_by = auth.uid()
    and created_at  >= now() - interval '24 hours';

  if v_daily_count >= 10 then
    return jsonb_build_object('success', false, 'error', 'rate_limit_exceeded');
  end if;

  -- Verify bathroom exists and is active
  if not exists (
    select 1 from public.bathrooms
    where id = p_bathroom_id and moderation_status = 'active'
  ) then
    return jsonb_build_object('success', false, 'error', 'bathroom_not_found');
  end if;

  -- Insert new code (supersede any existing active codes from same user for same bathroom)
  update public.bathroom_access_codes
  set lifecycle_status = 'superseded', updated_at = now()
  where bathroom_id   = p_bathroom_id
    and submitted_by  = auth.uid()
    and lifecycle_status = 'active';

  insert into public.bathroom_access_codes
    (bathroom_id, submitted_by, code_value, confidence_score)
  values
    (p_bathroom_id, auth.uid(), upper(trim(p_code_value)), 0)
  returning id into v_new_id;

  return jsonb_build_object('success', true, 'code_id', v_new_id);
end;
$$;

-- ─── Stale code expiration function (called by Edge Function / pg_cron) ──────

create or replace function public.expire_stale_codes()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_unverified  integer;
  v_expired_low_trust   integer;
begin
  -- 1. Codes never verified and 180+ days old → expire
  with expired as (
    update public.bathroom_access_codes
    set lifecycle_status = 'expired', updated_at = now()
    where lifecycle_status  = 'active'
      and last_verified_at is null
      and created_at       < now() - interval '180 days'
    returning id
  )
  select count(*) into v_expired_unverified from expired;

  -- 2. Codes with low confidence (< 20) and not verified in 90 days → expire
  with expired as (
    update public.bathroom_access_codes
    set lifecycle_status = 'expired', updated_at = now()
    where lifecycle_status  = 'active'
      and confidence_score  < 20
      and last_verified_at is not null
      and last_verified_at  < now() - interval '90 days'
      and (up_votes + down_votes) >= 3  -- only expire if there are actual votes
    returning id
  )
  select count(*) into v_expired_low_trust from expired;

  return jsonb_build_object(
    'expired_unverified', v_expired_unverified,
    'expired_low_trust',  v_expired_low_trust,
    'total',              v_expired_unverified + v_expired_low_trust
  );
end;
$$;

-- ─── pg_cron schedule (enable pg_cron extension first via Supabase dashboard) ─
-- Uncomment after enabling pg_cron in Supabase → Extensions

-- select cron.schedule(
--   'expire-stale-codes-nightly',
--   '0 3 * * *',  -- 3am UTC daily
--   $$ select public.expire_stale_codes() $$
-- );

-- ─── GIST index verification ──────────────────────────────────────────────────
-- The idx_bathrooms_geom index from migration 001 covers all PostGIS queries.
-- Verify it exists:
-- select indexname from pg_indexes where tablename = 'bathrooms' and indexname = 'idx_bathrooms_geom';
```

---

## 2. Edge Function — `supabase/functions/stale-code-cleanup/index.ts`

```typescript
// Deploy with: supabase functions deploy stale-code-cleanup
// Invoke manually or via external cron: POST /functions/v1/stale-code-cleanup
// Headers: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Require service role authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { data, error } = await supabase.rpc('expire_stale_codes');

    if (error) {
      console.error('[stale-code-cleanup] RPC error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[stale-code-cleanup] Result:', data);

    return new Response(
      JSON.stringify({ success: true, result: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[stale-code-cleanup] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
```

---

## 3. Types — `src/types/database.ts` additions

Add to the `Tables` object inside `Database['public']['Tables']`:

```typescript
// ─── Add to Tables ────────────────────────────────────────────────────────────
bathroom_photos: {
  Row: {
    id: string;
    bathroom_id: string;
    uploaded_by: string;
    storage_path: string;
    photo_type: 'exterior' | 'interior' | 'keypad' | 'sign';
    width: number | null;
    height: number | null;
    moderation_status: 'pending' | 'approved' | 'rejected';
    created_at: string;
  };
  Insert: {
    id?: string;
    bathroom_id: string;
    uploaded_by: string;
    storage_path: string;
    photo_type?: 'exterior' | 'interior' | 'keypad' | 'sign';
    width?: number | null;
    height?: number | null;
    moderation_status?: 'pending' | 'approved' | 'rejected';
    created_at?: string;
  };
  Update: {
    id?: string;
    bathroom_id?: string;
    uploaded_by?: string;
    storage_path?: string;
    photo_type?: 'exterior' | 'interior' | 'keypad' | 'sign';
    width?: number | null;
    height?: number | null;
    moderation_status?: 'pending' | 'approved' | 'rejected';
    created_at?: string;
  };
};
```

Also add these type exports at the bottom of `database.ts`:

```typescript
// Add at the bottom
export type DbBathroomPhoto = Database['public']['Tables']['bathroom_photos']['Row'];
```

---

## 4. Types — `src/types/index.ts` additions

Add these to the existing file (after the existing CODE SUBMISSION TYPES section):

```typescript
// ============================================================================
// TRUST ENGINE TYPES
// ============================================================================

export type PhotoType = 'exterior' | 'interior' | 'keypad' | 'sign';
export type PhotoModerationStatus = 'pending' | 'approved' | 'rejected';

export interface BathroomPhoto {
  id: string;
  bathroom_id: string;
  uploaded_by: string;
  storage_path: string;
  public_url: string; // derived from storage_path
  photo_type: PhotoType;
  width: number | null;
  height: number | null;
  moderation_status: PhotoModerationStatus;
  created_at: string;
}

export interface PhotoUploadParams {
  bathroom_id: string;
  photo_type: PhotoType;
  uri: string;
  width?: number;
  height?: number;
}

export interface BathroomCodeWithVote {
  id: string;
  bathroom_id: string;
  submitted_by: string;
  code_value: string;
  confidence_score: number;
  up_votes: number;
  down_votes: number;
  last_verified_at: string | null;
  expires_at: string | null;
  visibility_status: 'visible' | 'needs_review' | 'removed';
  lifecycle_status: 'active' | 'expired' | 'superseded';
  created_at: string;
  updated_at: string;
  user_vote: -1 | 1 | null;
}

export interface VerifyCodeParams {
  code_id: string;
  bathroom_id: string; // for query invalidation
  worked: boolean;
}

export interface VerifyCodeResult {
  success: boolean;
  vote?: -1 | 1;
  error?: string;
}

export interface SubmitCodeParams {
  bathroom_id: string;
  code_value: string;
}

export interface SubmitCodeResult {
  success: boolean;
  code_id?: string;
  error?: string;
}

export type ConfidenceLevel = 'none' | 'low' | 'moderate' | 'high' | 'verified';

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score === 0)   return 'none';
  if (score < 30)    return 'low';
  if (score < 60)    return 'moderate';
  if (score < 85)    return 'high';
  return 'verified';
}

export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'none':     return '#9ca3af';
    case 'low':      return '#ef4444';
    case 'moderate': return '#f59e0b';
    case 'high':     return '#22c55e';
    case 'verified': return '#16a34a';
  }
}

export function getConfidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'none':     return 'Unverified';
    case 'low':      return 'Low Confidence';
    case 'moderate': return 'Moderate Confidence';
    case 'high':     return 'High Confidence';
    case 'verified': return 'Highly Trusted';
  }
}
```

Also add this export at the bottom:
```typescript
export type DbBathroomPhoto = import('./database').DbBathroomPhoto;
```

---

## 5. Validators — `src/lib/validators/photo.ts`

```typescript
import { z } from 'zod';

const UUIDSchema = z.string().uuid('Invalid ID');

export const PhotoUploadSchema = z.object({
  bathroom_id: UUIDSchema,
  photo_type: z.enum(['exterior', 'interior', 'keypad', 'sign'], {
    errorMap: () => ({ message: 'Invalid photo type' }),
  }),
  uri: z.string().min(1, 'Photo URI is required'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type PhotoUploadInput = z.infer<typeof PhotoUploadSchema>;
```

Update `src/lib/validators/index.ts` to add:

```typescript
export * from './photo';
```

---

## 6. `app.config.ts` — add image-picker plugin

Add to the `plugins` array:

```typescript
[
  'expo-image-picker',
  {
    photosPermission:
      'Pee-Dom needs access to your photos to upload bathroom images.',
    cameraPermission:
      'Pee-Dom needs camera access to photograph bathroom keypads and signs.',
  },
],
```

Add to `ios.infoPlist`:
```typescript
NSPhotoLibraryUsageDescription:
  'Pee-Dom needs access to your photos to upload bathroom images.',
NSCameraUsageDescription:
  'Pee-Dom needs camera access to photograph bathroom keypads and signs.',
```

Add to `android.permissions`:
```typescript
'CAMERA',
'READ_EXTERNAL_STORAGE',
```

---

## 7. Hook — `src/hooks/useCodeOperations.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { analytics } from '@/lib/analytics';
import { SubmitCodeSchema, VoteCodeSchema } from '@/lib/validators';
import type {
  BathroomCodeWithVote,
  VerifyCodeParams,
  VerifyCodeResult,
  SubmitCodeParams,
  SubmitCodeResult,
} from '@/types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const codeQueryKeys = {
  all: ['codes'] as const,
  bathroom: (bathroomId: string) => ['codes', 'bathroom', bathroomId] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetches all active visible codes for a bathroom,
 * including the authenticated user's existing vote.
 */
export function useBathroomCodes(bathroomId: string) {
  return useQuery<BathroomCodeWithVote[], Error>({
    queryKey: codeQueryKeys.bathroom(bathroomId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bathroom_codes', {
        p_bathroom_id: bathroomId,
      });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row: BathroomCodeWithVote) => ({
        ...row,
        user_vote: row.user_vote ?? null,
      }));
    },
    enabled: Boolean(bathroomId),
    staleTime: 2 * 60 * 1000, // 2 minutes — trust data changes frequently
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * "Did this code work?" — verification mutation.
 * Optimistically updates the code's vote count and user_vote in the cache.
 */
export function useVerifyCode() {
  const queryClient = useQueryClient();

  return useMutation<VerifyCodeResult, Error, VerifyCodeParams>({
    mutationFn: async ({ code_id, worked }) => {
      const { data, error } = await supabase.rpc('verify_code', {
        p_code_id: code_id,
        p_worked:  worked,
      });

      if (error) throw new Error(error.message);

      return data as VerifyCodeResult;
    },

    // ── Optimistic update ─────────────────────────────────────────────────
    onMutate: async ({ code_id, bathroom_id, worked }) => {
      const queryKey = codeQueryKeys.bathroom(bathroom_id);
      await queryClient.cancelQueries({ queryKey });

      const previousCodes = queryClient.getQueryData<BathroomCodeWithVote[]>(queryKey);

      queryClient.setQueryData<BathroomCodeWithVote[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((code) => {
          if (code.id !== code_id) return code;
          const vote = worked ? 1 : -1 as -1 | 1;
          const prevVote = code.user_vote ?? 0;
          return {
            ...code,
            user_vote:  vote,
            up_votes:   code.up_votes   + (vote === 1 ? 1 : 0) - (prevVote === 1 ? 1 : 0),
            down_votes: code.down_votes + (vote === -1 ? 1 : 0) - (prevVote === -1 ? 1 : 0),
            last_verified_at: worked ? new Date().toISOString() : code.last_verified_at,
          };
        });
      });

      return { previousCodes, queryKey };
    },

    onError: (error, _vars, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousCodes);
      }
      captureException(error, { context: 'useVerifyCode' });
    },

    onSuccess: (result, { bathroom_id, worked }) => {
      if (result.success) {
        analytics.track(worked ? 'bathroom_code_verified_yes' : 'bathroom_code_verified_no');
      }
    },

    onSettled: (_data, _error, { bathroom_id }) => {
      // Always refetch for fresh confidence_score from server
      queryClient.invalidateQueries({ queryKey: codeQueryKeys.bathroom(bathroom_id) });
    },
  });
}

/**
 * Submit a new access code for a bathroom.
 */
export function useSubmitCode() {
  const queryClient = useQueryClient();

  return useMutation<SubmitCodeResult, Error, SubmitCodeParams>({
    mutationFn: async (params) => {
      // Client-side validation before hitting the DB
      const validated = SubmitCodeSchema.safeParse(params);
      if (!validated.success) {
        throw new Error(validated.error.issues[0]?.message ?? 'Invalid code');
      }

      const { data, error } = await supabase.rpc('submit_bathroom_code', {
        p_bathroom_id: validated.data.bathroom_id,
        p_code_value:  validated.data.code_value,
      });

      if (error) throw new Error(error.message);

      return data as SubmitCodeResult;
    },

    onSuccess: (result, { bathroom_id }) => {
      if (result.success) {
        analytics.track('code_submitted');
        queryClient.invalidateQueries({ queryKey: codeQueryKeys.bathroom(bathroom_id) });
      }
    },

    onError: (error) => {
      captureException(error, { context: 'useSubmitCode' });
    },
  });
}

/**
 * Direct vote mutation (up or down) — used outside the "Did it work?" flow.
 * Optimistically updates cache.
 */
export function useVoteCode() {
  const queryClient = useQueryClient();

  return useMutation
    { success: boolean },
    Error,
    { code_id: string; bathroom_id: string; vote: -1 | 1 }
  >({
    mutationFn: async ({ code_id, vote }) => {
      const validated = VoteCodeSchema.safeParse({ code_id, vote });
      if (!validated.success) {
        throw new Error(validated.error.issues[0]?.message ?? 'Invalid vote');
      }

      const { error } = await supabase
        .from('code_votes')
        .upsert(
          { code_id, vote, user_id: (await supabase.auth.getUser()).data.user?.id ?? '' },
          { onConflict: 'code_id,user_id' },
        );

      if (error) throw new Error(error.message);
      return { success: true };
    },

    onMutate: async ({ code_id, bathroom_id, vote }) => {
      const queryKey = codeQueryKeys.bathroom(bathroom_id);
      await queryClient.cancelQueries({ queryKey });
      const previousCodes = queryClient.getQueryData<BathroomCodeWithVote[]>(queryKey);

      queryClient.setQueryData<BathroomCodeWithVote[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((code) => {
          if (code.id !== code_id) return code;
          const prevVote = code.user_vote ?? 0;
          return {
            ...code,
            user_vote:  vote,
            up_votes:   code.up_votes   + (vote === 1 ? 1 : 0) - (prevVote === 1 ? 1 : 0),
            down_votes: code.down_votes + (vote === -1 ? 1 : 0) - (prevVote === -1 ? 1 : 0),
          };
        });
      });

      return { previousCodes, queryKey };
    },

    onError: (error, _vars, context) => {
      if (context) queryClient.setQueryData(context.queryKey, context.previousCodes);
      captureException(error, { context: 'useVoteCode' });
    },

    onSuccess: (_data, { vote }) => {
      analytics.track('code_voted', { vote });
    },

    onSettled: (_data, _error, { bathroom_id }) => {
      queryClient.invalidateQueries({ queryKey: codeQueryKeys.bathroom(bathroom_id) });
    },
  });
}
```

---

## 8. Hook — `src/hooks/useBathroomPhotos.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { analytics } from '@/lib/analytics';
import { PhotoUploadSchema } from '@/lib/validators';
import type { BathroomPhoto, PhotoUploadParams, PhotoType } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PHOTO_BUCKET = 'bathroom-photos';
const MAX_DIMENSION = 1200;
const JPEG_QUALITY  = 0.82;
const MAX_PHOTOS_PER_BATHROOM = 10;

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const photoQueryKeys = {
  bathroom: (bathroomId: string) => ['photos', 'bathroom', bathroomId] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function compressImage(uri: string): Promise<{ uri: string; width: number; height: number }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    {
      compress: JPEG_QUALITY,
      format:   ImageManipulator.SaveFormat.JPEG,
    },
  );
  return { uri: result.uri, width: result.width, height: result.height };
}

async function uploadToStorage(
  bathroomId: string,
  compressedUri: string,
): Promise<string> {
  // Fetch as blob (works in React Native)
  const response = await fetch(compressedUri);
  const blob     = await response.blob();

  const timestamp = Date.now();
  const random    = Math.random().toString(36).slice(2, 8);
  const path      = `${bathroomId}/${timestamp}_${random}.jpg`;

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert:      false,
      cacheControl: '31536000', // 1 year CDN cache
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return data.path;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export function useBathroomPhotos(bathroomId: string) {
  return useQuery<BathroomPhoto[], Error>({
    queryKey: photoQueryKeys.bathroom(bathroomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bathroom_photos')
        .select('*')
        .eq('bathroom_id', bathroomId)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(MAX_PHOTOS_PER_BATHROOM);

      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        ...row,
        public_url: getPublicUrl(row.storage_path),
      })) as BathroomPhoto[];
    },
    enabled: Boolean(bathroomId),
    staleTime: 10 * 60 * 1000, // Photos change rarely
  });
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

export interface UploadPhotoParams {
  bathroom_id: string;
  photo_type:  PhotoType;
  source:      'camera' | 'library';
}

export interface UploadPhotoResult {
  photo: BathroomPhoto;
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation<UploadPhotoResult, Error, UploadPhotoParams>({
    mutationFn: async ({ bathroom_id, photo_type, source }) => {
      // Validate params
      const validated = PhotoUploadSchema.safeParse({
        bathroom_id,
        photo_type,
        uri: 'placeholder', // We validate the actual URI after picking
      });
      if (!validated.success) {
        throw new Error(validated.error.issues[0]?.message ?? 'Invalid params');
      }

      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') throw new Error('CAMERA_PERMISSION_DENIED');
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') throw new Error('LIBRARY_PERMISSION_DENIED');
      }

      // Launch picker
      const pickerResult =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 1,
              allowsEditing: true,
              aspect: [4, 3],
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 1,
              allowsEditing: true,
              aspect: [4, 3],
            });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) {
        throw new Error('PICKER_CANCELLED');
      }

      const asset = pickerResult.assets[0];

      // Compress
      const compressed = await compressImage(asset.uri);

      // Upload to Supabase Storage
      const storagePath = await uploadToStorage(bathroom_id, compressed.uri);

      // Get authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      // Insert DB record
      const { data: photoRow, error: insertError } = await supabase
        .from('bathroom_photos')
        .insert({
          bathroom_id,
          uploaded_by:      user.id,
          storage_path:     storagePath,
          photo_type,
          width:            compressed.width,
          height:           compressed.height,
          moderation_status: 'approved',
        })
        .select()
        .single();

      if (insertError) {
        // Clean up orphaned storage file
        await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
        throw new Error(insertError.message);
      }

      return {
        photo: {
          ...(photoRow as BathroomPhoto),
          public_url: getPublicUrl(storagePath),
        },
      };
    },

    onSuccess: (result, { bathroom_id }) => {
      analytics.track('bathroom_code_revealed'); // reuse event bucket for now
      // Prepend the new photo to the cache
      queryClient.setQueryData<BathroomPhoto[]>(
        photoQueryKeys.bathroom(bathroom_id),
        (old) => [result.photo, ...(old ?? [])],
      );
    },

    onError: (error, _vars) => {
      const msg = error.message;
      if (msg !== 'PICKER_CANCELLED' && msg !== 'CAMERA_PERMISSION_DENIED' && msg !== 'LIBRARY_PERMISSION_DENIED') {
        captureException(error, { context: 'useUploadPhoto' });
      }
    },
  });
}
```

---

## 9. Component — `src/components/trust/CodeConfidenceMeter.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  getConfidenceLevel,
  getConfidenceColor,
  getConfidenceLabel,
} from '@/types';

interface CodeConfidenceMeterProps {
  score:           number;
  upVotes:         number;
  downVotes:       number;
  lastVerifiedAt:  string | null;
  compact?:        boolean;
  testID?:         string;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never verified';

  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);

  if (minutes < 2)   return 'Just verified';
  if (minutes < 60)  return `${minutes}m ago`;
  if (hours < 24)    return `${hours}h ago`;
  if (days < 7)      return `${days}d ago`;
  if (days < 30)     return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function CodeConfidenceMeter({
  score,
  upVotes,
  downVotes,
  lastVerifiedAt,
  compact = false,
  testID,
}: CodeConfidenceMeterProps) {
  const level     = getConfidenceLevel(score);
  const color     = getConfidenceColor(level);
  const label     = getConfidenceLabel(level);
  const total     = upVotes + downVotes;
  const fillWidth = `${Math.max(0, Math.min(100, score))}%`;

  return (
    <View style={compact ? styles.containerCompact : styles.container} testID={testID}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {!compact && (
          <Text style={styles.scoreText} testID="confidence-score">
            {score.toFixed(0)}%
          </Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack} testID="confidence-bar-track">
        <View
          style={[styles.barFill, { width: fillWidth as any, backgroundColor: color }]}
          testID="confidence-bar-fill"
        />
      </View>

      {/* Stats row */}
      {!compact && (
        <View style={styles.statsRow}>
          <Text style={styles.statItem} testID="verified-count">
            <Text style={styles.statGreen}>✓ {upVotes}</Text>
            {' verified'}
          </Text>
          {downVotes > 0 && (
            <Text style={styles.statItem} testID="disputed-count">
              {'  ·  '}
              <Text style={styles.statRed}>✗ {downVotes}</Text>
              {' disputed'}
            </Text>
          )}
          {total === 0 && (
            <Text style={styles.statItem} testID="no-votes">
              No votes yet
            </Text>
          )}
          <Text style={styles.statTime} testID="last-verified">
            {total > 0 ? '  ·  ' : ''}{formatRelativeTime(lastVerifiedAt)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  containerCompact: {
    paddingVertical: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    alignItems: 'center',
  },
  statItem: {
    fontSize: 12,
    color: '#6b7280',
  },
  statTime: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  statGreen: {
    color: '#16a34a',
    fontWeight: '600',
  },
  statRed: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
```

---

## 10. Component — `src/components/trust/CodeRevealCard.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { CodeConfidenceMeter } from './CodeConfidenceMeter';
import { CodeVerificationPrompt } from './CodeVerificationPrompt';
import { useVerifyCode, useVoteCode } from '@/hooks/useCodeOperations';
import { useAuth } from '@/contexts/AuthContext';
import type { BathroomCodeWithVote } from '@/types';

interface CodeRevealCardProps {
  code:       BathroomCodeWithVote;
  bathroomId: string;
  testID?:    string;
}

export function CodeRevealCard({ code, bathroomId, testID }: CodeRevealCardProps) {
  const { isAuthenticated } = useAuth();
  const [isVerifyPromptVisible, setVerifyPromptVisible] = useState(false);
  const [hasShownPrompt, setHasShownPrompt] = useState(false);

  const verifyMutation = useVerifyCode();
  const voteMutation   = useVoteCode();

  const handleRevealCode = () => {
    // Show verification prompt once per session after code reveal
    if (!hasShownPrompt && isAuthenticated) {
      setHasShownPrompt(true);
      // Small delay so user can read the code first
      setTimeout(() => setVerifyPromptVisible(true), 3000);
    }
  };

  const handleVote = (vote: -1 | 1) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to vote on codes.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (code.user_vote === vote) return; // already voted this way

    voteMutation.mutate({ code_id: code.id, bathroom_id: bathroomId, vote });
  };

  const handleVerify = async (worked: boolean) => {
    setVerifyPromptVisible(false);
    await verifyMutation.mutateAsync({
      code_id:     code.id,
      bathroom_id: bathroomId,
      worked,
    });
  };

  const total = code.up_votes + code.down_votes;

  return (
    <View style={styles.card} testID={testID}>
      {/* Code display */}
      <TouchableOpacity
        style={styles.codeContainer}
        onPress={handleRevealCode}
        activeOpacity={0.9}
        testID="code-display"
      >
        <Text style={styles.codeLabel}>Access Code</Text>
        <Text style={styles.codeValue} testID="code-value">
          {code.code_value}
        </Text>
      </TouchableOpacity>

      {/* Confidence meter */}
      <View style={styles.meterContainer}>
        <CodeConfidenceMeter
          score={code.confidence_score}
          upVotes={code.up_votes}
          downVotes={code.down_votes}
          lastVerifiedAt={code.last_verified_at}
          testID="confidence-meter"
        />
      </View>

      {/* Action row */}
      <View style={styles.actionRow}>
        {/* Vote buttons */}
        <View style={styles.voteGroup}>
          <TouchableOpacity
            style={[
              styles.voteButton,
              code.user_vote === 1 && styles.voteButtonActiveUp,
            ]}
            onPress={() => handleVote(1)}
            disabled={voteMutation.isPending}
            testID="vote-up-button"
          >
            <Text style={[
              styles.voteIcon,
              code.user_vote === 1 && styles.voteIconActiveUp,
            ]}>
              👍
            </Text>
            <Text style={[
              styles.voteCount,
              code.user_vote === 1 && styles.voteCountActiveUp,
            ]}>
              {code.up_votes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.voteButton,
              code.user_vote === -1 && styles.voteButtonActiveDown,
            ]}
            onPress={() => handleVote(-1)}
            disabled={voteMutation.isPending}
            testID="vote-down-button"
          >
            <Text style={[
              styles.voteIcon,
              code.user_vote === -1 && styles.voteIconActiveDown,
            ]}>
              👎
            </Text>
            <Text style={[
              styles.voteCount,
              code.user_vote === -1 && styles.voteCountActiveDown,
            ]}>
              {code.down_votes}
            </Text>
          </TouchableOpacity>
        </View>

        {/* "Did it work?" CTA */}
        {isAuthenticated && code.user_vote === null && (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => setVerifyPromptVisible(true)}
            testID="verify-button"
          >
            <Text style={styles.verifyButtonText}>Did this work?</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Verification prompt modal */}
      <CodeVerificationPrompt
        visible={isVerifyPromptVisible}
        codeValue={code.code_value}
        isLoading={verifyMutation.isPending}
        onConfirm={handleVerify}
        onDismiss={() => setVerifyPromptVisible(false)}
        testID="verify-prompt"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  // ── Code display ──
  codeContainer: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 38,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 10,
    fontVariant: ['tabular-nums'],
  },
  // ── Confidence meter ──
  meterContainer: {
    marginBottom: 12,
  },
  // ── Action row ──
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  voteButtonActiveUp: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  voteButtonActiveDown: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  voteIcon: {
    fontSize: 16,
  },
  voteIconActiveUp:   {},
  voteIconActiveDown: {},
  voteCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  voteCountActiveUp: {
    color: '#16a34a',
  },
  voteCountActiveDown: {
    color: '#dc2626',
  },
  // ── Verify CTA ──
  verifyButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
```

---

## 11. Component — `src/components/trust/CodeVerificationPrompt.tsx`

```typescript
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from 'react-native';

interface CodeVerificationPromptProps {
  visible:     boolean;
  codeValue:   string;
  isLoading:   boolean;
  onConfirm:   (worked: boolean) => void;
  onDismiss:   () => void;
  testID?:     string;
}

export function CodeVerificationPrompt({
  visible,
  codeValue,
  isLoading,
  onConfirm,
  onDismiss,
  testID,
}: CodeVerificationPromptProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      testID={testID}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Header */}
          <Text style={styles.emoji}>🚽</Text>
          <Text style={styles.title}>Did it work?</Text>
          <Text style={styles.subtitle}>
            Code:{' '}
            <Text style={styles.codeInline}>{codeValue}</Text>
          </Text>
          <Text style={styles.body}>
            Your answer helps the community know if this code is still valid.
          </Text>

          {/* Buttons */}
          {isLoading ? (
            <ActivityIndicator
              size="large"
              color="#2563eb"
              style={styles.loader}
              testID="verify-loading"
            />
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonYes]}
                onPress={() => onConfirm(true)}
                testID="verify-yes"
              >
                <Text style={styles.buttonIconYes}>🎉</Text>
                <Text style={styles.buttonTextYes}>Yes, it worked!</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonNo]}
                onPress={() => onConfirm(false)}
                testID="verify-no"
              >
                <Text style={styles.buttonIconNo}>😕</Text>
                <Text style={styles.buttonTextNo}>No, it didn't</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Skip */}
          {!isLoading && (
            <TouchableOpacity onPress={onDismiss} testID="verify-skip">
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  emoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  codeInline: {
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 2,
  },
  body: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 4,
  },
  buttonYes: {
    backgroundColor: '#dcfce7',
    borderWidth: 1.5,
    borderColor: '#22c55e',
  },
  buttonNo: {
    backgroundColor: '#fee2e2',
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  buttonIconYes: { fontSize: 24 },
  buttonIconNo:  { fontSize: 24 },
  buttonTextYes: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  buttonTextNo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  loader: {
    marginVertical: 24,
  },
  skipText: {
    fontSize: 13,
    color: '#9ca3af',
    textDecorationLine: 'underline',
  },
});
```

---

## 12. Component — `src/components/trust/PhotoGallery.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useBathroomPhotos } from '@/hooks/useBathroomPhotos';
import type { BathroomPhoto, PhotoType } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = (SCREEN_WIDTH - 32 - 8 * 2) / 3;

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  exterior:  'Outside',
  interior:  'Inside',
  keypad:    'Keypad',
  sign:      'Sign',
};

interface PhotoGalleryProps {
  bathroomId: string;
  testID?:    string;
}

export function PhotoGallery({ bathroomId, testID }: PhotoGalleryProps) {
  const { data: photos, isLoading } = useBathroomPhotos(bathroomId);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer} testID={testID}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <View style={styles.emptyContainer} testID={testID}>
        <Text style={styles.emptyText}>No photos yet — be the first to add one.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.thumb}
            onPress={() => setLightboxUri(item.public_url)}
            activeOpacity={0.85}
            testID={`photo-thumb-${item.id}`}
          >
            <Image
              source={{ uri: item.public_url }}
              style={styles.thumbImage}
              resizeMode="cover"
            />
            <View style={styles.thumbBadge}>
              <Text style={styles.thumbBadgeText}>
                {PHOTO_TYPE_LABELS[item.photo_type]}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Lightbox */}
      <Modal
        visible={lightboxUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
        testID="photo-lightbox"
      >
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightboxUri(null)}>
          {lightboxUri && (
            <Image
              source={{ uri: lightboxUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
              testID="lightbox-image"
            />
          )}
          <Text style={styles.lightboxClose}>✕ Close</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  row: {
    gap: 4,
    marginBottom: 4,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  thumbBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  // ── Lightbox ──
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.85,
  },
  lightboxClose: {
    marginTop: 20,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
});
```

---

## 13. Component — `src/components/trust/PhotoUploadButton.tsx`

```typescript
import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useUploadPhoto } from '@/hooks/useBathroomPhotos';
import { useAuth } from '@/contexts/AuthContext';
import type { PhotoType } from '@/types';

const PHOTO_TYPE_OPTIONS: { type: PhotoType; label: string; emoji: string }[] = [
  { type: 'exterior', label: 'Outside view',  emoji: '🏢' },
  { type: 'interior', label: 'Inside view',   emoji: '🚽' },
  { type: 'keypad',   label: 'Keypad / code', emoji: '🔢' },
  { type: 'sign',     label: 'Door sign',     emoji: '🚪' },
];

interface PhotoUploadButtonProps {
  bathroomId: string;
  testID?:    string;
}

export function PhotoUploadButton({ bathroomId, testID }: PhotoUploadButtonProps) {
  const { isAuthenticated } = useAuth();
  const [isTypeSheetOpen, setTypeSheetOpen] = useState(false);
  const [isSourceSheetOpen, setSourceSheetOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PhotoType | null>(null);

  const { mutateAsync: uploadPhoto, isPending } = useUploadPhoto();

  const handleAddPhoto = () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'You need to sign in to upload photos.', [{ text: 'OK' }]);
      return;
    }
    setTypeSheetOpen(true);
  };

  const handleTypeSelect = (type: PhotoType) => {
    setSelectedType(type);
    setTypeSheetOpen(false);
    setSourceSheetOpen(true);
  };

  const handleSourceSelect = async (source: 'camera' | 'library') => {
    setSourceSheetOpen(false);
    if (!selectedType) return;

    try {
      await uploadPhoto({ bathroom_id: bathroomId, photo_type: selectedType, source });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'PICKER_CANCELLED') return;
      if (msg === 'CAMERA_PERMISSION_DENIED') {
        Alert.alert('Permission Denied', 'Camera access was denied. Please update your settings.');
        return;
      }
      if (msg === 'LIBRARY_PERMISSION_DENIED') {
        Alert.alert('Permission Denied', 'Photo library access was denied. Please update your settings.');
        return;
      }
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={handleAddPhoto}
        disabled={isPending}
        testID={testID}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : (
          <>
            <Text style={styles.buttonIcon}>📷</Text>
            <Text style={styles.buttonText}>Add Photo</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Photo type selection */}
      <Modal
        visible={isTypeSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeSheetOpen(false)}
        testID="photo-type-modal"
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setTypeSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>What are you photographing?</Text>

            {PHOTO_TYPE_OPTIONS.map(({ type, label, emoji }) => (
              <TouchableOpacity
                key={type}
                style={styles.sheetOption}
                onPress={() => handleTypeSelect(type)}
                testID={`photo-type-${type}`}
              >
                <Text style={styles.sheetOptionEmoji}>{emoji}</Text>
                <Text style={styles.sheetOptionLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Source selection */}
      <Modal
        visible={isSourceSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSourceSheetOpen(false)}
        testID="photo-source-modal"
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSourceSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose source</Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => handleSourceSelect('camera')}
              testID="source-camera"
            >
              <Text style={styles.sheetOptionEmoji}>📸</Text>
              <Text style={styles.sheetOptionLabel}>Take a photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => handleSourceSelect('library')}
              testID="source-library"
            >
              <Text style={styles.sheetOptionEmoji}>🖼</Text>
              <Text style={styles.sheetOptionLabel}>Choose from library</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    minWidth: 44,
    justifyContent: 'center',
  },
  buttonIcon: { fontSize: 16 },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  // ── Sheet ──
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 14,
  },
  sheetOptionEmoji: { fontSize: 24 },
  sheetOptionLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
});
```

---

## 14. Barrel — `src/components/trust/index.ts`

```typescript
export { CodeConfidenceMeter } from './CodeConfidenceMeter';
export { CodeRevealCard }       from './CodeRevealCard';
export { CodeVerificationPrompt } from './CodeVerificationPrompt';
export { PhotoGallery }         from './PhotoGallery';
export { PhotoUploadButton }    from './PhotoUploadButton';
```

---

# Validation Block — SDET

## `src/hooks/__tests__/useCodeOperations.test.ts`

```typescript
jest.mock('@/lib/supabase', () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',   () => ({ captureException: jest.fn() }));
jest.mock('@/lib/analytics',() => ({ analytics: { track: jest.fn() } }));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useBathroomCodes,
  useVerifyCode,
  useSubmitCode,
  useVoteCode,
  codeQueryKeys,
} from '@/hooks/useCodeOperations';
import { supabase, resetSupabaseMocks } from 'src/__mocks__/supabase';

// ─── Test wrapper ─────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

const BATHROOM_ID = '550e8400-e29b-41d4-a716-446655440000';
const CODE_ID     = '660e8400-e29b-41d4-a716-446655440001';

const mockCode = {
  id:               CODE_ID,
  bathroom_id:      BATHROOM_ID,
  submitted_by:     'user-999',
  code_value:       '1234',
  confidence_score: 75.5,
  up_votes:         12,
  down_votes:       2,
  last_verified_at: new Date(Date.now() - 3_600_000).toISOString(),
  expires_at:       null,
  visibility_status: 'visible',
  lifecycle_status:  'active',
  created_at:        new Date().toISOString(),
  updated_at:        new Date().toISOString(),
  user_vote:         null,
};

describe('useBathroomCodes', () => {
  beforeEach(() => resetSupabaseMocks());

  it('returns codes on success', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [mockCode], error: null });

    const { result } = renderHook(
      () => useBathroomCodes(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].code_value).toBe('1234');
  });

  it('returns empty array when no codes', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(
      () => useBathroomCodes(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('throws on Supabase error', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC error' },
    });

    const { result } = renderHook(
      () => useBathroomCodes(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('RPC error');
  });

  it('does not fetch when bathroomId is empty', () => {
    const { result } = renderHook(
      () => useBathroomCodes(''),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useVerifyCode', () => {
  beforeEach(() => resetSupabaseMocks());

  it('calls verify_code RPC with correct params', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { success: true, vote: 1 },
      error: null,
    });

    const { result } = renderHook(() => useVerifyCode(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        code_id:     CODE_ID,
        bathroom_id: BATHROOM_ID,
        worked:      true,
      });
    });

    expect(supabase.rpc).toHaveBeenCalledWith('verify_code', {
      p_code_id: CODE_ID,
      p_worked:  true,
    });
  });

  it('throws on RPC error', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Verification failed' },
    });

    const { result } = renderHook(() => useVerifyCode(), { wrapper: makeWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          code_id:     CODE_ID,
          bathroom_id: BATHROOM_ID,
          worked:      false,
        });
      }),
    ).rejects.toThrow('Verification failed');
  });
});

describe('useSubmitCode', () => {
  beforeEach(() => resetSupabaseMocks());

  it('calls submit_bathroom_code RPC and normalizes to uppercase', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { success: true, code_id: 'new-code-id' },
      error: null,
    });

    const { result } = renderHook(() => useSubmitCode(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        bathroom_id: BATHROOM_ID,
        code_value:  'abcd', // lowercase — should be uppercased by Zod transform
      });
    });

    expect(supabase.rpc).toHaveBeenCalledWith('submit_bathroom_code', {
      p_bathroom_id: BATHROOM_ID,
      p_code_value:  'ABCD', // Zod schema uppercases on transform
    });
  });

  it('rejects empty code_value', async () => {
    const { result } = renderHook(() => useSubmitCode(), { wrapper: makeWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ bathroom_id: BATHROOM_ID, code_value: '' });
      }),
    ).rejects.toThrow();
  });
});
```

---

## `src/hooks/__tests__/useBathroomPhotos.test.ts`

```typescript
jest.mock('@/lib/supabase', () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',   () => ({ captureException: jest.fn() }));
jest.mock('@/lib/analytics',() => ({ analytics: { track: jest.fn() } }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync:        jest.fn().mockResolvedValue({ status: 'granted' }),
  requestMediaLibraryPermissionsAsync:  jest.fn().mockResolvedValue({ status: 'granted' }),
  launchCameraAsync:                    jest.fn(),
  launchImageLibraryAsync:              jest.fn(),
  MediaTypeOptions: { Images: 'images' },
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({
    uri:    'file://compressed.jpg',
    width:  800,
    height: 600,
  }),
  SaveFormat: { JPEG: 'jpeg' },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBathroomPhotos, useUploadPhoto } from '@/hooks/useBathroomPhotos';
import { supabase, resetSupabaseMocks } from 'src/__mocks__/supabase';
import * as ImagePicker from 'expo-image-picker';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const BATHROOM_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('useBathroomPhotos', () => {
  beforeEach(() => resetSupabaseMocks());

  it('returns approved photos', async () => {
    const mockPhotos = [
      {
        id:               'photo-1',
        bathroom_id:      BATHROOM_ID,
        uploaded_by:      'user-1',
        storage_path:     `${BATHROOM_ID}/1234_abc.jpg`,
        photo_type:       'keypad',
        width:            800,
        height:           600,
        moderation_status: 'approved',
        created_at:       new Date().toISOString(),
      },
    ];

    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      order:  jest.fn().mockReturnThis(),
      limit:  jest.fn().mockResolvedValueOnce({ data: mockPhotos, error: null }),
    });
    supabase.storage = {
      from: jest.fn().mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://cdn.example.com/photo-1.jpg' },
        }),
      }),
    };

    const { result } = renderHook(
      () => useBathroomPhotos(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].public_url).toBe('https://cdn.example.com/photo-1.jpg');
  });

  it('returns empty array when no photos', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      order:  jest.fn().mockReturnThis(),
      limit:  jest.fn().mockResolvedValueOnce({ data: [], error: null }),
    });
    supabase.storage = {
      from: jest.fn().mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
      }),
    };

    const { result } = renderHook(
      () => useBathroomPhotos(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });
});

describe('useUploadPhoto — permission handling', () => {
  beforeEach(() => resetSupabaseMocks());

  it('throws CAMERA_PERMISSION_DENIED when camera access denied', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });

    const { result } = renderHook(() => useUploadPhoto(), { wrapper: makeWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          bathroom_id: BATHROOM_ID,
          photo_type:  'keypad',
          source:      'camera',
        });
      }),
    ).rejects.toThrow('CAMERA_PERMISSION_DENIED');
  });

  it('throws LIBRARY_PERMISSION_DENIED when library access denied', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });

    const { result } = renderHook(() => useUploadPhoto(), { wrapper: makeWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          bathroom_id: BATHROOM_ID,
          photo_type:  'exterior',
          source:      'library',
        });
      }),
    ).rejects.toThrow('LIBRARY_PERMISSION_DENIED');
  });

  it('throws PICKER_CANCELLED when user cancels', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets:   [],
    });

    const { result } = renderHook(() => useUploadPhoto(), { wrapper: makeWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          bathroom_id: BATHROOM_ID,
          photo_type:  'sign',
          source:      'library',
        });
      }),
    ).rejects.toThrow('PICKER_CANCELLED');
  });
});
```

---

## `src/components/trust/__tests__/CodeConfidenceMeter.test.tsx`

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CodeConfidenceMeter } from '../CodeConfidenceMeter';

describe('CodeConfidenceMeter', () => {
  it('renders score=0 as "Unverified"', () => {
    render(
      <CodeConfidenceMeter
        score={0}
        upVotes={0}
        downVotes={0}
        lastVerifiedAt={null}
        testID="meter"
      />,
    );
    expect(screen.getByText('Unverified')).toBeTruthy();
    expect(screen.getByTestId('confidence-score')).toHaveTextContent('0%');
    expect(screen.getByTestId('no-votes')).toBeTruthy();
  });

  it('renders score=85 as "High Confidence"', () => {
    render(
      <CodeConfidenceMeter
        score={85}
        upVotes={20}
        downVotes={2}
        lastVerifiedAt={new Date().toISOString()}
        testID="meter"
      />,
    );
    expect(screen.getByText('High Confidence')).toBeTruthy();
    expect(screen.getByTestId('verified-count')).toHaveTextContent('20');
    expect(screen.getByTestId('disputed-count')).toHaveTextContent('2');
    expect(screen.getByTestId('last-verified')).toHaveTextContent('Just verified');
  });

  it('renders score=100 as "Highly Trusted"', () => {
    render(
      <CodeConfidenceMeter
        score={100}
        upVotes={50}
        downVotes={0}
        lastVerifiedAt={new Date(Date.now() - 30_000).toISOString()}
        testID="meter"
      />,
    );
    expect(screen.getByText('Highly Trusted')).toBeTruthy();
  });

  it('hides disputed count when downVotes=0', () => {
    render(
      <CodeConfidenceMeter
        score={90}
        upVotes={15}
        downVotes={0}
        lastVerifiedAt={null}
        testID="meter"
      />,
    );
    expect(screen.queryByTestId('disputed-count')).toBeNull();
  });

  it('renders "Never verified" when lastVerifiedAt=null and has votes', () => {
    render(
      <CodeConfidenceMeter
        score={45}
        upVotes={5}
        downVotes={5}
        lastVerifiedAt={null}
        testID="meter"
      />,
    );
    expect(screen.getByTestId('last-verified')).toHaveTextContent('Never verified');
  });

  it('bar fill width reflects score (tested via testID)', () => {
    render(
      <CodeConfidenceMeter
        score={60}
        upVotes={6}
        downVotes={4}
        lastVerifiedAt={null}
        testID="meter"
      />,
    );
    // Verify the bar track and fill render without crashing
    expect(screen.getByTestId('confidence-bar-track')).toBeTruthy();
    expect(screen.getByTestId('confidence-bar-fill')).toBeTruthy();
  });

  it('compact mode hides stats and score text', () => {
    render(
      <CodeConfidenceMeter
        score={70}
        upVotes={7}
        downVotes={1}
        lastVerifiedAt={null}
        compact
        testID="meter"
      />,
    );
    expect(screen.queryByTestId('confidence-score')).toBeNull();
    expect(screen.queryByTestId('verified-count')).toBeNull();
  });
});
```

---

## `src/components/trust/__tests__/CodeVerificationPrompt.test.tsx`

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CodeVerificationPrompt } from '../CodeVerificationPrompt';

describe('CodeVerificationPrompt', () => {
  const defaultProps = {
    visible:   true,
    codeValue: '4821',
    isLoading: false,
    onConfirm: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders with code value visible', () => {
    render(<CodeVerificationPrompt {...defaultProps} />);
    expect(screen.getByText('4821')).toBeTruthy();
    expect(screen.getByText('Did it work?')).toBeTruthy();
  });

  it('calls onConfirm(true) on Yes press', () => {
    render(<CodeVerificationPrompt {...defaultProps} />);
    fireEvent.press(screen.getByTestId('verify-yes'));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(true);
  });

  it('calls onConfirm(false) on No press', () => {
    render(<CodeVerificationPrompt {...defaultProps} />);
    fireEvent.press(screen.getByTestId('verify-no'));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(false);
  });

  it('calls onDismiss on Skip press', () => {
    render(<CodeVerificationPrompt {...defaultProps} />);
    fireEvent.press(screen.getByTestId('verify-skip'));
    expect(defaultProps.onDismiss).toHaveBeenCalled();
  });

  it('shows loading indicator instead of buttons when isLoading=true', () => {
    render(<CodeVerificationPrompt {...defaultProps} isLoading />);
    expect(screen.getByTestId('verify-loading')).toBeTruthy();
    expect(screen.queryByTestId('verify-yes')).toBeNull();
    expect(screen.queryByTestId('verify-no')).toBeNull();
    expect(screen.queryByTestId('verify-skip')).toBeNull();
  });

  it('does not render when visible=false', () => {
    render(<CodeVerificationPrompt {...defaultProps} visible={false} />);
    expect(screen.queryByText('Did it work?')).toBeNull();
  });
});
```

---

## Security Validation SQL

```sql
-- ============================================================================
-- Trust Engine RLS + Security Tests
-- ============================================================================

-- 1. verify_code: user cannot verify their own code
-- Expected: returns error 'cannot_verify_own_code'
select public.verify_code(
  'your-own-code-id-here'::uuid,
  true
);
-- Should return: {"success": false, "error": "cannot_verify_own_code"}

-- 2. verify_code: unauthenticated user gets rejected
-- Run as: anon role
select public.verify_code(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  true
);
-- Expected: {"success": false, "error": "not_authenticated"}

-- 3. submit_bathroom_code: rate limiting at 10/day
-- Simulate by checking count
select count(*) from public.bathroom_access_codes
where submitted_by = auth.uid()
  and created_at >= now() - interval '24 hours';

-- 4. Photo storage RLS: anon can read, cannot write
-- Run as anon: should return rows
select * from public.bathroom_photos limit 5;

-- 5. Confidence score computation correctness
select
  public.compute_confidence_score(10, 0, now())              as "100% recent",
  public.compute_confidence_score(10, 0, now() - '7 days'::interval)  as "100% week old",
  public.compute_confidence_score(5, 5, now())               as "50% recent",
  public.compute_confidence_score(0, 0, null)                as "no votes",
  public.compute_confidence_score(1, 9, now())               as "10% recent";
-- Expected: ~100, ~85, ~50, ~0, ~10

-- 6. Verify trigger updates confidence_score after vote
-- Step 1: Get a code with 0 votes
-- Step 2: Insert an upvote
-- Step 3: Check confidence_score changed
select id, up_votes, down_votes, confidence_score
from public.bathroom_access_codes
where id = 'your-code-id';
-- After inserting a vote, confidence_score should be > 0
```

---

## Performance Notes

- **`get_bathroom_codes` RPC** uses `idx_bathrooms_geom` is for spatial; the code query hits `idx_codes_bathroom` (on `bathroom_id`). Both are indexed. The left join on `code_votes` hits `idx_code_votes_code` + `idx_code_votes_user`. ✅
- **`compute_confidence_score`** is marked `stable` and called inline inside the trigger — PostgreSQL will not re-evaluate it across rows within the same statement. ✅
- **Optimistic updates** in `useVerifyCode` and `useVoteCode` update the cache atomically before the network call, giving instant UI feedback. On error, the previous state is restored. ✅
- **Photo compression** runs on the device thread via `expo-image-manipulator` before upload. A 4MB camera shot becomes ~200–400KB at 1200px/82% quality. ✅
- **Memory leak check**: `CodeVerificationPrompt` uses `Modal` (no cleanup needed). `CodeRevealCard`'s `setTimeout` is not cleared — this is intentional (3s is short) but it's flagged for awareness. A production hardening would store the `setTimeout` ID in a ref and clear it in a `useEffect` cleanup.

---

## Section 1 Checklist

| Feature | Database | Types | Hook | UI | Tests |
|---------|----------|-------|------|----|-------|
| Confidence score formula + trigger | ✅ | ✅ | ✅ | ✅ | ✅ |
| "Did this work?" verify flow | ✅ | ✅ | ✅ | ✅ | ✅ |
| Optimistic vote updates | — | — | ✅ | ✅ | ✅ |
| Stale code expiration (SQL + Edge Fn) | ✅ | — | — | — | ✅ SQL |
| Photo upload + Supabase Storage | ✅ | ✅ | ✅ | ✅ | ✅ |
| Photo gallery + lightbox | — | — | ✅ | ✅ | ✅ |
| Rate limiting (10 codes/day) | ✅ | — | — | — | ✅ SQL |
| Self-verification prevention | ✅ | — | — | — | ✅ SQL |

**Section 1: The Trust Engine is complete. Say "Next" for Section 2: The Gamification/Points Engine, or "Integrated" to verify first.**

## Assistant (commentary)

`2026-03-16T07:24:39.725Z`

I’m comparing the suggested Section 14 and Section 1 against what’s already integrated, with a review bar rather than a diff dump. I’m checking for places where their proposal is stronger, and places where adopting it would actually regress security, type integrity, or repo fit.

## Assistant (commentary)

`2026-03-16T07:25:12.841Z`

I’m checking whether the suggested snippets expose any real gaps on our side, not just stylistic differences. The main things worth verifying are permissions/runtime config, test harness fit, and whether their RPC/storage model conflicts with the current Supabase surface.

## Assistant (commentary)

`2026-03-16T07:26:10.568Z`

The biggest architectural question turned out not to be in the UI at all: it’s whether code reveal is enforced in the database or only in the client. I’m pulling the current RLS lines now because that materially changes how much of the proposed RPC approach is actually safe.

## Assistant (commentary)

`2026-03-16T07:26:38.974Z`

The comparison did turn up one real defect in our current Section 1 implementation: self-verification is still allowed server-side, so a submitter can currently upvote their own code and receive verification points. I’m pulling the exact lines so I can call that out cleanly.

## Assistant (final_answer)

`2026-03-16T07:27:52.659Z`

**Findings**
- `[P1]` Code reveal is still only enforced in the client, not in Supabase. [001_foundation_schema.sql](C:/Users/T/Desktop/PeeDom/supabase/migrations/001_foundation_schema.sql#L348) gives public `select` access to visible codes, while [access-codes.ts](C:/Users/T/Desktop/PeeDom/src/api/access-codes.ts#L22) and [app/bathroom/[id].tsx](C:/Users/T/Desktop/PeeDom/app/bathroom/%5Bid%5D.tsx#L138) only gate fetches in UI state. The proposed `get_bathroom_codes` RPC does not solve that; it still returns plaintext codes. If we want real ad/premium gating, we need to remove public code reads and move reveal behind a server-enforced RPC or Edge Function.

- `[P1]` Protected keypad/sign photos are also only hidden in the app, not protected by storage policy. [005_trust_engine.sql](C:/Users/T/Desktop/PeeDom/supabase/migrations/005_trust_engine.sql#L61) exposes approved photo rows, and [005_trust_engine.sql](C:/Users/T/Desktop/PeeDom/supabase/migrations/005_trust_engine.sql#L93) allows storage reads for any approved photo. [bathroom-photos.ts](C:/Users/T/Desktop/PeeDom/src/api/bathroom-photos.ts#L110) simply declines to sign protected types unless the UI says the code is visible. That means a direct client can still fetch metadata and request the object. The sample’s fully public bucket would make this worse, not better.

- `[P1]` Self-verification is currently possible and positive self-votes can earn points. [access-codes.ts](C:/Users/T/Desktop/PeeDom/src/api/access-codes.ts#L119) upserts directly into `code_votes`, [useBathroomCodeVerification.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useBathroomCodeVerification.ts#L48) does not block own-code votes, and [005_trust_engine.sql](C:/Users/T/Desktop/PeeDom/supabase/migrations/005_trust_engine.sql#L237) awards `code_verification` points for positive votes. The proposed `verify_code` RPC correctly spots this case. I would not copy that implementation verbatim, but I would add the same rule server-side immediately.

- `[P2]` The offline queue validation is weaker than the sample and would benefit from type-specific payload schemas. [validate.ts](C:/Users/T/Desktop/PeeDom/src/utils/validate.ts#L41) only checks that queued payloads are generic records and `user_id` is a non-empty string, and [offline-queue.ts](C:/Users/T/Desktop/PeeDom/src/lib/offline-queue.ts#L18) persists them as-is. The suggested per-mutation validators are worth borrowing so corrupt queue entries get rejected at enqueue/load time instead of failing later during replay.

- `[P2]` The proposed Section 14 auth rewrite is not drop-in compatible with the current app. Our hooks depend on `requireAuth`, return-intent replay, cached profile recovery, and richer failure handling in [AuthContext.tsx](C:/Users/T/Desktop/PeeDom/src/contexts/AuthContext.tsx#L25), [AuthContext.tsx](C:/Users/T/Desktop/PeeDom/src/contexts/AuthContext.tsx#L190), and [AuthContext.tsx](C:/Users/T/Desktop/PeeDom/src/contexts/AuthContext.tsx#L550). Replacing it with the sample’s lean bridge would break the Trust Engine auth flows in [useBathroomCodeVerification.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useBathroomCodeVerification.ts#L56) and [useBathroomPhotos.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useBathroomPhotos.ts#L46).

**Worth Borrowing**
- The `expo-image-manipulator` idea is good. Our current upload path still sends the picked asset buffer more or less as-is in [app/bathroom/[id].tsx](C:/Users/T/Desktop/PeeDom/app/bathroom/%5Bid%5D.tsx#L316) and [bathroom-photos.ts](C:/Users/T/Desktop/PeeDom/src/api/bathroom-photos.ts#L267). Adding deterministic resize/compression would reduce bandwidth and upload failures.
- The richer Jest setup is useful if we want to run React Native component tests. Right now [jest.config.js](C:/Users/T/Desktop/PeeDom/jest.config.js#L1) is intentionally minimal and node-only, which is fine for the current suite but not enough for their proposed UI tests.
- Their camera upload flow is only worth adding if we also expand [app.config.ts](C:/Users/T/Desktop/PeeDom/app.config.ts#L67) and [app.config.ts](C:/Users/T/Desktop/PeeDom/app.config.ts#L79) with camera permissions. Right now our implementation is library-only, and the config matches that.

I would treat the snippets as a checklist, not as code to merge directly. The three real follow-up fixes I’d prioritize are: server-enforced code reveal, server-enforced protected photo access, and a DB-level self-verification block. If you want, I can patch those next.

## User

`2026-03-16T07:29:51.026Z`

sure go aherad and patch those next then move on the section 2

## Assistant (commentary)

`2026-03-16T07:30:03.429Z`

I’m patching the three trust/security defects first: DB-level self-verification protection, server-enforced code reveal, and real protection for keypad/sign assets at the storage boundary. Once those are verified, I’ll move straight into Section 2 on top of the corrected trust surface.

## Assistant (commentary)

`2026-03-16T07:30:19.953Z`

The current rewarded unlock is only a local device grant. I’m tracing that path now because the server-side reveal fix needs to replace or augment it rather than fighting it.

## Assistant (commentary)

`2026-03-16T07:31:22.389Z`

I need one more schema check before patching: whether the public bathroom detail view already bypasses code-table RLS. That determines whether I can safely lock down raw code rows without breaking the trust summary on the detail screen.

## Assistant (commentary)

`2026-03-16T07:31:58.450Z`

I’ve confirmed the reveal path needs to move off the old local-storage unlock entirely. Next I’m tracing the return-intent/auth replay flow so the new server-backed reveal doesn’t strand users at login when they try to unlock a code.

## Assistant (commentary)

`2026-03-16T07:33:17.484Z`

I have the schema design pinned down now. I’m editing the migration and API layer together so the new policies, RPCs, and client behavior line up in one pass instead of leaving the app in a half-locked state.

## Assistant (commentary)

`2026-03-16T07:34:54.679Z`

I’m at the file edit stage now. This pass touches the migration, the access-code API, the rewarded unlock hook, and the reveal card copy together so the DB rules and the app behavior stay aligned.

## Assistant (commentary)

`2026-03-16T07:37:53.305Z`

Using `staff-mobile-engineer` to finish the trust/security hardening before starting Section 2. I’m checking the in-progress edits against the current code paths so I can patch the remaining gaps without breaking the existing reveal flow.

## Assistant (commentary)

`2026-03-16T07:38:04.953Z`

The remaining work is in the reveal/auth boundary: the hook is already moved to server-backed grants, but the screen, error mapping, and tests still need alignment. I’m checking the exact call sites now so I can patch once and then revalidate.

## Assistant (commentary)

`2026-03-16T07:38:20.520Z`

I’ve confirmed the database-facing pieces are in place; now I’m checking the verification flow and intent handling so the new DB rules don’t turn into regressions on the screen. After that I’ll patch the user-facing error mapping and add the missing tests before validation.

## Assistant (commentary)

`2026-03-16T07:38:32.479Z`

There’s one more compatibility check before I edit: the old rewarded-unlock tests still reference local-device unlock behavior. I’m reviewing those now because they’re likely to fail once the grant flow is fully server-backed.

## Assistant (commentary)

`2026-03-16T07:38:42.788Z`

The app-side changes are straightforward. The riskier part is the SQL: I’m doing one pass over the new policies/functions before validation so I can catch any obvious syntax or RLS mistakes locally instead of discovering them later through broken app tests.

## Assistant (commentary)

`2026-03-16T07:39:16.050Z`

One subtle area showed up while reviewing the SQL: the public detail view may lose `code_id` and confidence if the tightened RLS ends up hiding all code rows from anonymous users. I’m checking the public bathroom query path now, because that determines whether I need to expose summary metadata through a dedicated view or function before validation.

## Assistant (commentary)

`2026-03-16T07:39:52.911Z`

I found one actual security bug in the new migration while reading it: the stale-code cleanup function is currently executable by any authenticated user. I’m correcting that alongside the app-side error handling so the trust patch is secure before I validate.

## Assistant (commentary)

`2026-03-16T07:40:08.420Z`

I’ve got the patch surface narrowed down: one migration privilege fix, one shared error mapping update, and tests to cover the new trust-boundary behavior. After that I’ll run type-check, lint, and Jest, then I can start Section 2 from a clean baseline.

## Assistant (commentary)

`2026-03-16T07:40:23.494Z`

I’m editing the migration and shared error handling now. After that I’ll add tests around the new custom codes and parser schemas so the trust patch is actually enforced by CI, not just by review.

## Assistant (commentary)

`2026-03-16T07:40:48.322Z`

The app-side patch is in. I’m running type-check first to catch any fallout from the new database function typings before lint and Jest.

## Assistant (commentary)

`2026-03-16T07:41:13.141Z`

Lint found one real issue in the bathroom detail screen: a redundant `Boolean(...)` cast introduced while wiring the auth-required reveal state. I’m fixing that now, then rerunning lint and Jest.

## Assistant (commentary)

`2026-03-16T07:41:48.512Z`

The trust/security patch is clean now: type-check, lint, and Jest all passed. I’m moving into Section 2 by inspecting the current profile and points surfaces so I can add the gamification schema and app flows on top of what’s already live instead of duplicating it.

## Assistant (commentary)

`2026-03-16T07:46:18.325Z`

Section 2 is large enough that I’m laying its foundation in the database first: streak-safe profile fields, auditable badge state, point-award triggers, leaderboards, and points-to-premium redemption. Once that lands, the app-side profile/dashboard work is much cleaner and can stay fully typed.

## Assistant (commentary)

`2026-03-16T07:47:41.521Z`

The gamification migration is in. I’m updating the generated app-side type surface next so the new profile fields, badges, leaderboards, and redemption RPCs stay aligned with Supabase before I wire the dashboard UI.

## Assistant (commentary)

`2026-03-16T07:49:55.503Z`

I’m aligning premium gating with the new redemption model now. The database will store an expiry timestamp, so the app needs to treat “premium until X” as the source of truth rather than the old raw boolean everywhere it matters.

## Assistant (commentary)

`2026-03-16T07:50:43.044Z`

I’m wiring the profile tab now. The backend can award and compute the gamification state, so the UI work is mainly presenting it cleanly: level progress, streaks, badges, leaderboards, recent point events, and a real premium redemption action.

## Assistant (commentary)

`2026-03-16T07:52:02.723Z`

The profile dashboard is wired. I’m updating the pure tests now so the expanded profile shape and the new level/premium logic are covered before I run the full suite again.

## Assistant (commentary)

`2026-03-16T07:53:10.883Z`

The gamification types, helpers, API surface, and profile UI are all in place. I’m running type-check again now because this is the point where missing profile fields, stale test fixtures, or unused imports usually show up.

## Assistant (commentary)

`2026-03-16T07:54:25.634Z`

I found one backend issue while reviewing the finished Section 2 flow: premium redemptions were still writing to `point_events` with a fixed `(user_id, event_type, reference_table, reference_id)` key, which would make the second redemption conflict forever. I’m fixing that now before I close out the section.

## Assistant (final_answer)

`2026-03-16T07:55:03.616Z`

Patched the trust/security gaps first. Code reveal is now server-granted, keypad/sign photo access is enforced by RLS, self-code voting is blocked at the database layer, and the stale-code cleanup function is no longer callable by regular authenticated users. The main changes are in [005_trust_engine.sql](C:/Users/T/Desktop/PeeDom/supabase/migrations/005_trust_engine.sql), [access-codes.ts](C:/Users/T/Desktop/PeeDom/src/api/access-codes.ts), [useRewardedCodeUnlock.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useRewardedCodeUnlock.ts), [profile error mapping](C:/Users/T/Desktop/PeeDom/src/utils/errorMap.ts), [bathroom detail](C:/Users/T/Desktop/PeeDom/app/bathroom/%5Bid%5D.tsx), and [CodeRevealCard.tsx](C:/Users/T/Desktop/PeeDom/src/components/CodeRevealCard.tsx).

Section 2 is now implemented in code. I added the gamification backend in [006_gamification.sql](C:/Users/T/Desktop/PeeDom/supabase/migrations/006_gamification.sql): streak fields on `profiles`, `user_badges`, point-award triggers for bathrooms/codes/photos/report resolutions, code milestone bonuses, contributor leaderboards, and points-to-premium redemption. The app side is wired through [database types](C:/Users/T/Desktop/PeeDom/src/types/database.ts), [domain types](C:/Users/T/Desktop/PeeDom/src/types/index.ts), [parsers](C:/Users/T/Desktop/PeeDom/src/lib/supabase-parsers.ts), [gamification API](C:/Users/T/Desktop/PeeDom/src/api/gamification.ts), [gamification hook](C:/Users/T/Desktop/PeeDom/src/hooks/useGamificationDashboard.ts), [premium/level helpers](C:/Users/T/Desktop/PeeDom/src/lib/gamification.ts), and the rebuilt [profile tab](C:/Users/T/Desktop/PeeDom/app/%28tabs%29/profile.tsx), which now shows level/tier progress, streak state, badges, weekly leaderboards, recent point events, and a real `1000 points -> 1 month premium` redemption flow.

Validation passed: `npm run type-check`, `npm run lint`, and `npm test -- --runInBand`. I also added coverage in [gamification.test.ts](C:/Users/T/Desktop/PeeDom/__tests__/gamification.test.ts), [error-map.test.ts](C:/Users/T/Desktop/PeeDom/__tests__/error-map.test.ts), and [supabase-parsers.test.ts](C:/Users/T/Desktop/PeeDom/__tests__/supabase-parsers.test.ts). I did not execute the Supabase migrations against a live project from this environment, so `005` and `006` still need to be applied before the new RPCs and triggers are live.

Confirming Section 2 is integrated in code and locally validated. Ready for Section 3?

## User

`2026-03-16T08:11:31.684Z`

yup ready for section 3

## Assistant (commentary)

`2026-03-16T08:11:44.232Z`

Using `staff-mobile-engineer` again for the map surface. I’m inspecting the current map tab, filters, and nearby bathroom query path first so I can add clustering, radar, detail sheet behavior, and map filters without fighting the existing Expo Router and React Query setup.

## Assistant (commentary)

`2026-03-16T08:12:26.206Z`

I’ve got the current map scaffold. To make Section 3 real, I need one backend adjustment before UI polish: the nearby bathroom surface has to expose cleanliness averages so the map/search filters can do more than just lock/access/customer flags. After that, the rest is client-side map work.

## Assistant (commentary)

`2026-03-16T08:13:31.734Z`

Before I touch the map UI, I’m adding a small view/function migration so the client can filter and display cleanliness without denormalized hacks. That keeps the map logic in sync with Supabase instead of teaching the UI to guess at data it doesn’t have.

## Assistant (commentary)

`2026-03-16T08:14:00.416Z`

I’m in the shared bathroom utility layer now. That’s the right place for “open now”, “no code required”, cleanliness thresholds, and pin status, because both the map and search surfaces depend on the same logic and it needs test coverage rather than screen-specific branching.

## Assistant (commentary)

`2026-03-16T08:14:57.317Z`

I’m replacing the old generic pin map now. The new map component will own the color-coded markers, radar pulse, route hint line, filter entry point, and legend so the screen logic can stay focused on data loading and sheet actions.

## Assistant (commentary)

`2026-03-16T08:16:42.840Z`

Using `staff-mobile-engineer` for the map feature pass. I’m checking the current Section 3 file state and the in-progress diffs first so I can finish the implementation against what’s actually in the workspace.

## Assistant (commentary)

`2026-03-16T08:16:53.575Z`

I’ve confirmed the map surface is partially patched already, but the tab screen hasn’t been wired to the new map API yet. I’m reading the screen and existing shared components now so I can finish Section 3 without breaking the established bottom-sheet and filter flows.

## Assistant (commentary)

`2026-03-16T08:17:05.023Z`

The map screen still needs state wiring and a richer detail surface. I’m pulling in the existing stores and favorites/location hooks now so I can reuse them instead of creating parallel state for Section 3.

## Assistant (commentary)

`2026-03-16T08:17:15.149Z`

I’ve got the reusable pieces now. Next I’m wiring the map screen itself: filter drawer state, navigation handoff, and a denser bottom-sheet card that uses the current favorites and auth/report paths instead of inventing new flows.

## User

`2026-03-16T08:18:26.983Z`

Clean. No conflicts. Beginning output.

---

# Section 2: The Gamification & Points Engine

## Terminal Commands

```bash
# No new packages needed — all dependencies satisfied by Sections 14 + 1
```

---

## 1. Database — `supabase/migrations/004_gamification.sql`

```sql
-- ============================================================================
-- PeeDom Gamification Migration
-- 004_gamification.sql
-- ============================================================================

-- ─── Point event types ───────────────────────────────────────────────────────

create type public.point_event_type as enum (
  'add_bathroom',
  'code_submitted',
  'code_verified_by_others',
  'code_vote_cast',
  'photo_uploaded',
  'report_submitted',
  'cleanliness_rated',
  'favorite_added',
  'streak_bonus',
  'badge_bonus',
  'premium_purchase',
  'admin_adjustment'
);

-- ─── Point events ledger ──────────────────────────────────────────────────────
-- Append-only — never update or delete rows here.

create table if not exists public.point_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  event_type     public.point_event_type not null,
  points         integer not null,           -- can be negative (admin_adjustment)
  reference_id   uuid,                       -- bathroom_id, code_id, etc.
  reference_type text,                       -- 'bathroom', 'code', 'vote', etc.
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists idx_point_events_user
  on public.point_events(user_id, created_at desc);
create index if not exists idx_point_events_type
  on public.point_events(event_type);

alter table public.point_events enable row level security;

create policy "point_events_select_own"
  on public.point_events for select
  using (auth.uid() = user_id);

-- Only security definer functions can insert
create policy "point_events_no_direct_insert"
  on public.point_events for insert
  with check (false);

-- ─── Badge definitions catalog ────────────────────────────────────────────────

create table if not exists public.badge_definitions (
  id           text primary key,            -- e.g. 'first_flush', 'code_breaker'
  name         text not null,
  description  text not null,
  emoji        text not null,
  category     text not null default 'general' check (
    category in ('contribution', 'trust', 'streak', 'social', 'special')
  ),
  bonus_points integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.badge_definitions enable row level security;
create policy "badge_definitions_public_read"
  on public.badge_definitions for select using (is_active = true);

-- ─── User earned badges ───────────────────────────────────────────────────────

create table if not exists public.user_badges (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  badge_id           text not null references public.badge_definitions(id),
  earned_at          timestamptz not null default now(),
  notified_at        timestamptz,
  unique (user_id, badge_id)
);

create index if not exists idx_user_badges_user
  on public.user_badges(user_id, earned_at desc);

alter table public.user_badges enable row level security;

create policy "user_badges_select_own"
  on public.user_badges for select
  using (auth.uid() = user_id);

create policy "user_badges_select_public"
  on public.user_badges for select
  using (true);  -- badges are public achievements

create policy "user_badges_no_direct_insert"
  on public.user_badges for insert
  with check (false);

-- ─── User streaks ────────────────────────────────────────────────────────────

create table if not exists public.user_streaks (
  user_id                uuid primary key references public.profiles(id) on delete cascade,
  current_streak         integer not null default 0,
  longest_streak         integer not null default 0,
  last_contribution_date date,
  total_contributions    integer not null default 0,
  updated_at             timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

create policy "user_streaks_select_own"
  on public.user_streaks for select
  using (auth.uid() = user_id);

create policy "user_streaks_select_public"
  on public.user_streaks for select
  using (true);

-- ─── Leaderboard cache ───────────────────────────────────────────────────────
-- Refreshed by Edge Function / pg_cron weekly.
-- Reading live from point_events would be too slow at scale.

create table if not exists public.leaderboard_cache (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  display_name   text,
  scope          text not null check (scope in ('global', 'city')),
  period         text not null check (period in ('weekly', 'alltime')),
  city_slug      text,                       -- null for global
  total_points   integer not null default 0,
  rank           integer not null default 0,
  refreshed_at   timestamptz not null default now(),
  unique (user_id, scope, period, coalesce(city_slug, ''))
);

create index if not exists idx_leaderboard_scope_period_rank
  on public.leaderboard_cache(scope, period, rank asc)
  where scope = 'global';
create index if not exists idx_leaderboard_city
  on public.leaderboard_cache(city_slug, period, rank asc)
  where scope = 'city';

alter table public.leaderboard_cache enable row level security;
create policy "leaderboard_public_read"
  on public.leaderboard_cache for select using (true);

-- ─── Seed badge definitions ───────────────────────────────────────────────────

insert into public.badge_definitions
  (id, name, description, emoji, category, bonus_points) values
  ('first_flush',        'First Flush',          'Added your first bathroom',             '🚽', 'contribution', 50),
  ('code_breaker',       'Code Breaker',         'Submitted 10 verified access codes',    '🔓', 'trust',        100),
  ('trusted_source',     'Trusted Source',       'Had 50 of your codes verified as working','⭐','trust',       200),
  ('accessibility_hero', 'Accessibility Hero',   'Added 5 accessible bathrooms',          '♿', 'contribution', 150),
  ('photo_journalist',   'Photo Journalist',     'Uploaded 10 bathroom photos',           '📸', 'contribution', 75),
  ('bathroom_scout',     'Bathroom Scout',       'Added 5 bathrooms to the map',          '🗺️', 'contribution', 100),
  ('veteran_scout',      'Veteran Scout',        'Added 25 bathrooms to the map',         '🏅', 'contribution', 300),
  ('week_warrior',       'Week Warrior',         'Maintained a 7-day contribution streak','🔥', 'streak',       100),
  ('month_legend',       'Month Legend',         'Maintained a 30-day streak',            '👑', 'streak',       500),
  ('city_expert',        'City Expert',          'Contributed 10+ items in one city',     '🏙️', 'social',       150),
  ('helpful_voter',      'Helpful Voter',        'Cast 25 votes on access codes',         '🗳️', 'trust',        50),
  ('reporter',           'Reporter',             'Submitted 5 bathroom reports',          '📋', 'contribution', 50)
on conflict (id) do nothing;

-- ─── Core function: award_points ─────────────────────────────────────────────

create or replace function public.award_points(
  p_user_id      uuid,
  p_event_type   public.point_event_type,
  p_points       integer,
  p_reference_id uuid   default null,
  p_ref_type     text   default null,
  p_metadata     jsonb  default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Append to ledger
  insert into public.point_events
    (user_id, event_type, points, reference_id, reference_type, metadata)
  values
    (p_user_id, p_event_type, p_points, p_reference_id, p_ref_type, p_metadata);

  -- Update running balance on profile
  update public.profiles
  set points_balance = greatest(0, points_balance + p_points),
      updated_at     = now()
  where id = p_user_id;
end;
$$;

-- ─── Core function: update_streak ────────────────────────────────────────────

create or replace function public.update_streak(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak        public.user_streaks%rowtype;
  v_today         date := current_date;
  v_bonus_points  integer := 0;
  v_new_badge     text    := null;
begin
  select * into v_streak
  from public.user_streaks
  where user_id = p_user_id;

  if not found then
    -- First contribution ever
    insert into public.user_streaks
      (user_id, current_streak, longest_streak, last_contribution_date, total_contributions)
    values
      (p_user_id, 1, 1, v_today, 1);

    return jsonb_build_object(
      'streak', 1, 'bonus_points', 0, 'new_badge', null
    );
  end if;

  -- Already contributed today — no change
  if v_streak.last_contribution_date = v_today then
    return jsonb_build_object(
      'streak', v_streak.current_streak, 'bonus_points', 0, 'new_badge', null
    );
  end if;

  -- Consecutive day → extend streak
  if v_streak.last_contribution_date = v_today - interval '1 day' then
    v_streak.current_streak := v_streak.current_streak + 1;
  else
    -- Streak broken
    v_streak.current_streak := 1;
  end if;

  v_streak.longest_streak         := greatest(v_streak.longest_streak, v_streak.current_streak);
  v_streak.last_contribution_date := v_today;
  v_streak.total_contributions    := v_streak.total_contributions + 1;

  update public.user_streaks
  set current_streak         = v_streak.current_streak,
      longest_streak         = v_streak.longest_streak,
      last_contribution_date = v_streak.last_contribution_date,
      total_contributions    = v_streak.total_contributions,
      updated_at             = now()
  where user_id = p_user_id;

  -- Milestone streak bonuses
  v_bonus_points := case
    when v_streak.current_streak = 7   then 100
    when v_streak.current_streak = 30  then 500
    when v_streak.current_streak = 100 then 2000
    when v_streak.current_streak % 7 = 0 then 25  -- weekly recurring bonus
    else 0
  end;

  if v_bonus_points > 0 then
    perform public.award_points(
      p_user_id, 'streak_bonus', v_bonus_points, null, 'streak',
      jsonb_build_object('streak_day', v_streak.current_streak)
    );
  end if;

  -- Streak badge checks
  if v_streak.current_streak = 7 and not exists (
    select 1 from public.user_badges
    where user_id = p_user_id and badge_id = 'week_warrior'
  ) then
    v_new_badge := 'week_warrior';
  elsif v_streak.current_streak = 30 and not exists (
    select 1 from public.user_badges
    where user_id = p_user_id and badge_id = 'month_legend'
  ) then
    v_new_badge := 'month_legend';
  end if;

  return jsonb_build_object(
    'streak',       v_streak.current_streak,
    'bonus_points', v_bonus_points,
    'new_badge',    v_new_badge
  );
end;
$$;

-- ─── Core function: check_and_award_badges ───────────────────────────────────

create or replace function public.check_and_award_badges(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_badges    text[] := '{}';
  v_badge_id      text;
  v_bonus_total   integer := 0;
  v_bonus         integer;

  -- Contribution counts (computed once)
  v_bathroom_count      integer;
  v_accessible_count    integer;
  v_code_count          integer;
  v_verified_code_count integer;
  v_photo_count         integer;
  v_vote_count          integer;
  v_report_count        integer;
begin
  -- Gather counts
  select count(*) into v_bathroom_count
    from public.bathrooms where created_by = p_user_id and moderation_status = 'active';

  select count(*) into v_accessible_count
    from public.bathrooms
    where created_by = p_user_id and is_accessible = true and moderation_status = 'active';

  select count(*) into v_code_count
    from public.bathroom_access_codes
    where submitted_by = p_user_id and lifecycle_status != 'superseded';

  select count(*) into v_verified_code_count
    from public.bathroom_access_codes bac
    join public.code_votes cv on cv.code_id = bac.id and cv.vote = 1
    where bac.submitted_by = p_user_id;

  select count(*) into v_photo_count
    from public.bathroom_photos
    where uploaded_by = p_user_id and moderation_status = 'approved';

  select count(*) into v_vote_count
    from public.code_votes where user_id = p_user_id;

  select count(*) into v_report_count
    from public.bathroom_reports where reported_by = p_user_id;

  -- Badge checks — each only awarded once (idempotent insert)
  foreach v_badge_id in array array[
    'first_flush', 'bathroom_scout', 'veteran_scout',
    'accessibility_hero', 'code_breaker', 'trusted_source',
    'photo_journalist', 'helpful_voter', 'reporter'
  ] loop
    -- Skip if already earned
    continue when exists (
      select 1 from public.user_badges
      where user_id = p_user_id and badge_id = v_badge_id
    );

    declare
      v_earned boolean := false;
    begin
      v_earned := case v_badge_id
        when 'first_flush'        then v_bathroom_count >= 1
        when 'bathroom_scout'     then v_bathroom_count >= 5
        when 'veteran_scout'      then v_bathroom_count >= 25
        when 'accessibility_hero' then v_accessible_count >= 5
        when 'code_breaker'       then v_code_count >= 10
        when 'trusted_source'     then v_verified_code_count >= 50
        when 'photo_journalist'   then v_photo_count >= 10
        when 'helpful_voter'      then v_vote_count >= 25
        when 'reporter'           then v_report_count >= 5
        else false
      end;

      if v_earned then
        insert into public.user_badges (user_id, badge_id)
        values (p_user_id, v_badge_id);

        -- Award badge bonus points
        select bonus_points into v_bonus
          from public.badge_definitions where id = v_badge_id;

        if v_bonus > 0 then
          perform public.award_points(
            p_user_id, 'badge_bonus', v_bonus, null, 'badge',
            jsonb_build_object('badge_id', v_badge_id)
          );
          v_bonus_total := v_bonus_total + v_bonus;
        end if;

        v_new_badges := array_append(v_new_badges, v_badge_id);
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'new_badges',   v_new_badges,
    'bonus_points', v_bonus_total
  );
end;
$$;

-- ─── Orchestrator: record_contribution ───────────────────────────────────────
-- Single call site for all contribution types.
-- Returns points awarded + any new badges.

create or replace function public.record_contribution(
  p_contribution_type text,
  p_reference_id      uuid  default null,
  p_city_slug         text  default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid   := auth.uid();
  v_points         integer;
  v_event_type     public.point_event_type;
  v_ref_type       text;
  v_streak_result  jsonb;
  v_badge_result   jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  -- Map contribution type → points + event_type
  case p_contribution_type
    when 'add_bathroom'       then v_points := 50;  v_event_type := 'add_bathroom';       v_ref_type := 'bathroom';
    when 'code_submitted'     then v_points := 25;  v_event_type := 'code_submitted';     v_ref_type := 'code';
    when 'code_verified'      then v_points := 10;  v_event_type := 'code_vote_cast';     v_ref_type := 'code';
    when 'photo_uploaded'     then v_points := 15;  v_event_type := 'photo_uploaded';     v_ref_type := 'photo';
    when 'report_submitted'   then v_points := 5;   v_event_type := 'report_submitted';   v_ref_type := 'report';
    when 'cleanliness_rated'  then v_points := 5;   v_event_type := 'cleanliness_rated';  v_ref_type := 'rating';
    when 'favorite_added'     then v_points := 2;   v_event_type := 'favorite_added';     v_ref_type := 'favorite';
    else return jsonb_build_object('success', false, 'error', 'unknown_contribution_type');
  end case;

  -- Award base points
  perform public.award_points(
    v_user_id, v_event_type, v_points, p_reference_id, v_ref_type,
    case when p_city_slug is not null
      then jsonb_build_object('city_slug', p_city_slug)
      else null
    end
  );

  -- Update streak
  v_streak_result := public.update_streak(v_user_id);

  -- Check for newly earned badges
  v_badge_result := public.check_and_award_badges(v_user_id);

  return jsonb_build_object(
    'success',      true,
    'points',       v_points,
    'new_badges',   v_badge_result->'new_badges',
    'streak',       v_streak_result->'streak',
    'streak_bonus', v_streak_result->'bonus_points',
    'total_awarded', v_points
                     + coalesce((v_streak_result->>'bonus_points')::integer, 0)
                     + coalesce((v_badge_result->>'bonus_points')::integer, 0)
  );
end;
$$;

-- ─── RPC: get_user_stats ─────────────────────────────────────────────────────

create or replace function public.get_user_stats(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'user_id',             p_user_id,
    'points_balance',      p.points_balance,
    'is_premium',          p.is_premium,
    'bathrooms_added',     (
      select count(*) from public.bathrooms
      where created_by = p_user_id and moderation_status = 'active'
    ),
    'codes_submitted',     (
      select count(*) from public.bathroom_access_codes
      where submitted_by = p_user_id
    ),
    'codes_verified',      (
      select count(*) from public.bathroom_access_codes bac
      join public.code_votes cv on cv.code_id = bac.id and cv.vote = 1
      where bac.submitted_by = p_user_id
    ),
    'votes_cast',          (
      select count(*) from public.code_votes where user_id = p_user_id
    ),
    'photos_uploaded',     (
      select count(*) from public.bathroom_photos
      where uploaded_by = p_user_id and moderation_status = 'approved'
    ),
    'reports_submitted',   (
      select count(*) from public.bathroom_reports where reported_by = p_user_id
    ),
    'current_streak',      coalesce(s.current_streak, 0),
    'longest_streak',      coalesce(s.longest_streak, 0),
    'total_contributions', coalesce(s.total_contributions, 0),
    'badges_earned',       (
      select count(*) from public.user_badges where user_id = p_user_id
    )
  )
  from public.profiles p
  left join public.user_streaks s on s.user_id = p_user_id
  where p.id = p_user_id;
$$;

-- ─── RPC: get_leaderboard ────────────────────────────────────────────────────

create or replace function public.get_leaderboard(
  p_scope  text default 'global',
  p_period text default 'weekly',
  p_city   text default null,
  p_limit  integer default 50
)
returns table (
  rank         integer,
  user_id      uuid,
  display_name text,
  total_points integer,
  refreshed_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    lc.rank,
    lc.user_id,
    coalesce(lc.display_name, 'Anonymous') as display_name,
    lc.total_points,
    lc.refreshed_at
  from public.leaderboard_cache lc
  where lc.scope  = p_scope
    and lc.period = p_period
    and (p_city is null or lc.city_slug = p_city)
  order by lc.rank asc
  limit p_limit;
$$;

-- ─── Refresh leaderboard function (called by Edge Function) ──────────────────

create or replace function public.refresh_leaderboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count_global_weekly  integer;
  v_count_global_alltime integer;
begin
  -- Global weekly: sum points from last 7 days
  with weekly as (
    select
      pe.user_id,
      p.display_name,
      sum(pe.points) as total_points,
      row_number() over (order by sum(pe.points) desc) as rank
    from public.point_events pe
    join public.profiles p on p.id = pe.user_id
    where pe.created_at >= now() - interval '7 days'
      and pe.points > 0
    group by pe.user_id, p.display_name
  )
  insert into public.leaderboard_cache
    (user_id, display_name, scope, period, city_slug, total_points, rank, refreshed_at)
  select
    user_id, display_name, 'global', 'weekly', null, total_points, rank, now()
  from weekly
  on conflict (user_id, scope, period, coalesce(city_slug, ''))
  do update set
    display_name = excluded.display_name,
    total_points = excluded.total_points,
    rank         = excluded.rank,
    refreshed_at = excluded.refreshed_at;

  get diagnostics v_count_global_weekly = row_count;

  -- Global all-time
  with alltime as (
    select
      id as user_id,
      display_name,
      points_balance as total_points,
      row_number() over (order by points_balance desc) as rank
    from public.profiles
    where points_balance > 0
  )
  insert into public.leaderboard_cache
    (user_id, display_name, scope, period, city_slug, total_points, rank, refreshed_at)
  select
    user_id, display_name, 'global', 'alltime', null, total_points, rank, now()
  from alltime
  on conflict (user_id, scope, period, coalesce(city_slug, ''))
  do update set
    display_name = excluded.display_name,
    total_points = excluded.total_points,
    rank         = excluded.rank,
    refreshed_at = excluded.refreshed_at;

  get diagnostics v_count_global_alltime = row_count;

  return jsonb_build_object(
    'global_weekly',  v_count_global_weekly,
    'global_alltime', v_count_global_alltime
  );
end;
$$;
```

---

## 2. Edge Function — `supabase/functions/weekly-leaderboard-refresh/index.ts`

```typescript
// Deploy: supabase functions deploy weekly-leaderboard-refresh
// Trigger: GitHub Actions cron OR Supabase scheduled trigger (weekly, Sunday 00:00 UTC)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('refresh_leaderboard');

    if (error) {
      console.error('[leaderboard-refresh] RPC error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const elapsed = Date.now() - start;
    console.log(`[leaderboard-refresh] Done in ${elapsed}ms:`, data);

    return new Response(
      JSON.stringify({ success: true, result: data, elapsed_ms: elapsed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[leaderboard-refresh] Unexpected:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
```

---

## 3. `src/lib/gamification.ts` — NEW

```typescript
/**
 * PeeDom Gamification Constants & Level System
 *
 * Level thresholds, names, colors, and helper functions.
 * Used by LevelProgressBar, ProfileTab, and anywhere a user's level is shown.
 */

export interface Level {
  level:       number;
  name:        string;
  emoji:       string;
  minPoints:   number;
  maxPoints:   number;    // Infinity for last tier
  color:       string;
  badgeColor:  string;
}

// ─── Level definitions ─────────────────────────────────────────────────────────
// 8 tiers spanning 0 → ∞ points

export const LEVELS: readonly Level[] = [
  { level: 1, name: 'Explorer',     emoji: '🗺️',  minPoints: 0,     maxPoints: 199,    color: '#6b7280', badgeColor: '#e5e7eb' },
  { level: 2, name: 'Scout',        emoji: '🔍',  minPoints: 200,   maxPoints: 499,    color: '#16a34a', badgeColor: '#dcfce7' },
  { level: 3, name: 'Pathfinder',   emoji: '🧭',  minPoints: 500,   maxPoints: 999,    color: '#2563eb', badgeColor: '#dbeafe' },
  { level: 4, name: 'Ranger',       emoji: '⚡',  minPoints: 1000,  maxPoints: 1999,   color: '#7c3aed', badgeColor: '#ede9fe' },
  { level: 5, name: 'Guardian',     emoji: '🛡️',  minPoints: 2000,  maxPoints: 3999,   color: '#d97706', badgeColor: '#fef3c7' },
  { level: 6, name: 'Champion',     emoji: '🏆',  minPoints: 4000,  maxPoints: 7499,   color: '#dc2626', badgeColor: '#fee2e2' },
  { level: 7, name: 'Elite',        emoji: '💎',  minPoints: 7500,  maxPoints: 14999,  color: '#0891b2', badgeColor: '#cffafe' },
  { level: 8, name: 'Legend',       emoji: '👑',  minPoints: 15000, maxPoints: Infinity, color: '#b45309', badgeColor: '#fef9c3' },
] as const;

/**
 * Get the current level for a given points balance.
 */
export function getLevelForPoints(points: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

/**
 * Get progress (0–1) toward the next level.
 * Returns 1 if at max level.
 */
export function getLevelProgress(points: number): {
  level:         Level;
  nextLevel:     Level | null;
  progress:      number;        // 0.0 → 1.0
  pointsInLevel: number;        // points earned within current level
  pointsToNext:  number;        // points needed to reach next level (0 at max)
} {
  const level = getLevelForPoints(points);

  if (level.maxPoints === Infinity) {
    return {
      level,
      nextLevel:    null,
      progress:     1,
      pointsInLevel: points - level.minPoints,
      pointsToNext:  0,
    };
  }

  const nextLevel    = LEVELS[level.level] ?? null; // level.level is 1-indexed
  const span         = level.maxPoints - level.minPoints + 1;
  const earned       = points - level.minPoints;
  const progress     = Math.min(1, earned / span);
  const pointsToNext = level.maxPoints - points + 1;

  return { level, nextLevel, progress, pointsInLevel: earned, pointsToNext };
}

// ─── Points catalog (mirrors DB, used for UI display) ────────────────────────

export const POINT_VALUES = {
  add_bathroom:      50,
  code_submitted:    25,
  code_verified:     10,
  photo_uploaded:    15,
  report_submitted:  5,
  cleanliness_rated: 5,
  favorite_added:    2,
  streak_7_day:      100,
  streak_30_day:     500,
  streak_100_day:    2000,
  streak_weekly:     25,
} as const;

// ─── Streak display helpers ───────────────────────────────────────────────────

export function getStreakEmoji(streak: number): string {
  if (streak >= 30) return '👑';
  if (streak >= 14) return '🔥';
  if (streak >= 7)  return '⚡';
  if (streak >= 3)  return '✨';
  return '💧';
}

export function getStreakColor(streak: number): string {
  if (streak >= 30) return '#b45309';
  if (streak >= 14) return '#dc2626';
  if (streak >= 7)  return '#d97706';
  if (streak >= 3)  return '#2563eb';
  return '#6b7280';
}
```

---

## 4. Types — additions to `src/types/index.ts`

```typescript
// ============================================================================
// GAMIFICATION TYPES
// ============================================================================

import type { Level } from '@/lib/gamification';

export type PointEventType =
  | 'add_bathroom'
  | 'code_submitted'
  | 'code_verified_by_others'
  | 'code_vote_cast'
  | 'photo_uploaded'
  | 'report_submitted'
  | 'cleanliness_rated'
  | 'favorite_added'
  | 'streak_bonus'
  | 'badge_bonus'
  | 'premium_purchase'
  | 'admin_adjustment';

export type ContributionType =
  | 'add_bathroom'
  | 'code_submitted'
  | 'code_verified'
  | 'photo_uploaded'
  | 'report_submitted'
  | 'cleanliness_rated'
  | 'favorite_added';

export interface PointEvent {
  id:             string;
  user_id:        string;
  event_type:     PointEventType;
  points:         number;
  reference_id:   string | null;
  reference_type: string | null;
  metadata:       Record<string, unknown> | null;
  created_at:     string;
}

export interface BadgeDefinition {
  id:           string;
  name:         string;
  description:  string;
  emoji:        string;
  category:     'contribution' | 'trust' | 'streak' | 'social' | 'special';
  bonus_points: number;
  is_active:    boolean;
}

export interface UserBadge {
  id:          string;
  user_id:     string;
  badge_id:    string;
  earned_at:   string;
  notified_at: string | null;
  // Joined from badge_definitions
  badge?:      BadgeDefinition;
}

export interface UserStreak {
  user_id:                string;
  current_streak:         number;
  longest_streak:         number;
  last_contribution_date: string | null;
  total_contributions:    number;
  updated_at:             string;
}

export interface UserStats {
  user_id:              string;
  points_balance:       number;
  is_premium:           boolean;
  bathrooms_added:      number;
  codes_submitted:      number;
  codes_verified:       number;
  votes_cast:           number;
  photos_uploaded:      number;
  reports_submitted:    number;
  current_streak:       number;
  longest_streak:       number;
  total_contributions:  number;
  badges_earned:        number;
}

export interface LeaderboardEntry {
  rank:         number;
  user_id:      string;
  display_name: string;
  total_points: number;
  refreshed_at: string;
}

export interface ContributionResult {
  success:      boolean;
  points:       number;
  new_badges:   string[];
  streak:       number;
  streak_bonus: number;
  total_awarded: number;
  error?:       string;
}

export type LeaderboardScope  = 'global' | 'city';
export type LeaderboardPeriod = 'weekly' | 'alltime';
```

Also add to `database.ts` Tables:

```typescript
point_events: {
  Row: {
    id: string; user_id: string; event_type: string; points: number;
    reference_id: string | null; reference_type: string | null;
    metadata: Json | null; created_at: string;
  };
  Insert: { id?: string; user_id: string; event_type: string; points: number;
    reference_id?: string | null; reference_type?: string | null;
    metadata?: Json | null; created_at?: string;
  };
  Update: Record<string, never>; // append-only
};
badge_definitions: {
  Row: { id: string; name: string; description: string; emoji: string;
    category: string; bonus_points: number; is_active: boolean; created_at: string; };
  Insert: { id: string; name: string; description: string; emoji: string;
    category?: string; bonus_points?: number; is_active?: boolean; created_at?: string; };
  Update: { name?: string; description?: string; emoji?: string;
    category?: string; bonus_points?: number; is_active?: boolean; };
};
user_badges: {
  Row: { id: string; user_id: string; badge_id: string;
    earned_at: string; notified_at: string | null; };
  Insert: { id?: string; user_id: string; badge_id: string;
    earned_at?: string; notified_at?: string | null; };
  Update: { notified_at?: string | null; };
};
user_streaks: {
  Row: { user_id: string; current_streak: number; longest_streak: number;
    last_contribution_date: string | null; total_contributions: number; updated_at: string; };
  Insert: { user_id: string; current_streak?: number; longest_streak?: number;
    last_contribution_date?: string | null; total_contributions?: number; updated_at?: string; };
  Update: { current_streak?: number; longest_streak?: number;
    last_contribution_date?: string | null; total_contributions?: number; updated_at?: string; };
};
leaderboard_cache: {
  Row: { id: string; user_id: string; display_name: string | null; scope: string;
    period: string; city_slug: string | null; total_points: number; rank: number;
    refreshed_at: string; };
  Insert: { id?: string; user_id: string; display_name?: string | null; scope: string;
    period: string; city_slug?: string | null; total_points: number; rank: number;
    refreshed_at?: string; };
  Update: { display_name?: string | null; total_points?: number;
    rank?: number; refreshed_at?: string; };
};
```

---

## 5. `src/stores/ui.store.ts` — MODIFIED (add badge modal state)

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { BadgeDefinition } from '@/types';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id:       string;
  message:  string;
  type:     ToastType;
  duration: number;
}

interface UIStoreState {
  isDetailSheetOpen:       boolean;
  isAddBathroomSheetOpen:  boolean;
  isSubmitCodeSheetOpen:   boolean;
  isReportSheetOpen:       boolean;
  toasts:                  Toast[];
  // Gamification
  pendingBadges:           BadgeDefinition[];
  pointsFlash:             { amount: number; id: string } | null;
}

interface UIStoreActions {
  openDetailSheet:         () => void;
  closeDetailSheet:        () => void;
  openAddBathroomSheet:    () => void;
  closeAddBathroomSheet:   () => void;
  openSubmitCodeSheet:     () => void;
  closeSubmitCodeSheet:    () => void;
  openReportSheet:         () => void;
  closeReportSheet:        () => void;
  closeAllSheets:          () => void;
  showToast:               (message: string, type?: ToastType, duration?: number) => void;
  dismissToast:            (id: string) => void;
  // Gamification
  queueBadge:              (badge: BadgeDefinition) => void;
  dismissBadge:            () => void;
  flashPoints:             (amount: number) => void;
  clearPointsFlash:        () => void;
}

export type UIStore = UIStoreState & UIStoreActions;

export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      isDetailSheetOpen:      false,
      isAddBathroomSheetOpen: false,
      isSubmitCodeSheetOpen:  false,
      isReportSheetOpen:      false,
      toasts:                 [],
      pendingBadges:          [],
      pointsFlash:            null,

      openDetailSheet:      () => set({ isDetailSheetOpen: true },      false, 'ui/openDetailSheet'),
      closeDetailSheet:     () => set({ isDetailSheetOpen: false },     false, 'ui/closeDetailSheet'),
      openAddBathroomSheet: () => set({ isAddBathroomSheetOpen: true }, false, 'ui/openAddBathroom'),
      closeAddBathroomSheet:() => set({ isAddBathroomSheetOpen: false },false, 'ui/closeAddBathroom'),
      openSubmitCodeSheet:  () => set({ isSubmitCodeSheetOpen: true },  false, 'ui/openSubmitCode'),
      closeSubmitCodeSheet: () => set({ isSubmitCodeSheetOpen: false }, false, 'ui/closeSubmitCode'),
      openReportSheet:      () => set({ isReportSheetOpen: true },      false, 'ui/openReport'),
      closeReportSheet:     () => set({ isReportSheetOpen: false },     false, 'ui/closeReport'),

      closeAllSheets: () =>
        set(
          { isDetailSheetOpen: false, isAddBathroomSheetOpen: false,
            isSubmitCodeSheetOpen: false, isReportSheetOpen: false },
          false, 'ui/closeAll',
        ),

      showToast: (message, type = 'info', duration = 3000) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        set(
          (state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }),
          false, 'ui/showToast',
        );
        setTimeout(() => get().dismissToast(id), duration);
      },

      dismissToast: (id) =>
        set(
          (state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }),
          false, 'ui/dismissToast',
        ),

      queueBadge: (badge) =>
        set(
          (state) => ({ pendingBadges: [...state.pendingBadges, badge] }),
          false, 'ui/queueBadge',
        ),

      dismissBadge: () =>
        set(
          (state) => ({ pendingBadges: state.pendingBadges.slice(1) }),
          false, 'ui/dismissBadge',
        ),

      flashPoints: (amount) => {
        const id = `pts_${Date.now()}`;
        set({ pointsFlash: { amount, id } }, false, 'ui/flashPoints');
        setTimeout(() => get().clearPointsFlash(), 2200);
      },

      clearPointsFlash: () =>
        set({ pointsFlash: null }, false, 'ui/clearPointsFlash'),
    }),
    { name: 'PeeDom:UIStore' },
  ),
);
```

---

## 6. `src/hooks/usePoints.ts` — NEW

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { analytics } from '@/lib/analytics';
import { useUIStore } from '@/stores/ui.store';
import { useSessionStore } from '@/stores/session.store';
import type {
  PointEvent,
  ContributionType,
  ContributionResult,
  UserStats,
} from '@/types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const pointQueryKeys = {
  history:    (userId: string) => ['points', 'history', userId] as const,
  userStats:  (userId: string) => ['points', 'stats',   userId] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function usePointHistory(userId: string) {
  return useQuery<PointEvent[], Error>({
    queryKey: pointQueryKeys.history(userId),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('point_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return (data ?? []) as PointEvent[];
    },
    enabled:   Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUserStats(userId: string) {
  return useQuery<UserStats, Error>({
    queryKey: pointQueryKeys.userStats(userId),
    queryFn:  async () => {
      const { data, error } = await supabase.rpc('get_user_stats', {
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
      return data as UserStats;
    },
    enabled:   Boolean(userId),
    staleTime: 60 * 1000, // 1 min — stats change after each contribution
  });
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

/**
 * Record a contribution and handle all downstream effects:
 * - Points awarded
 * - Streak updated
 * - Badges checked & queued
 * - Points flash triggered
 * - Session store points balance updated
 */
export function useRecordContribution() {
  const { flashPoints, queueBadge } = useUIStore();
  const { _setProfile, profile }    = useSessionStore();

  return useMutation<ContributionResult, Error, {
    type:         ContributionType;
    reference_id?: string;
    city_slug?:    string;
  }>({
    mutationFn: async ({ type, reference_id, city_slug }) => {
      const { data, error } = await supabase.rpc('record_contribution', {
        p_contribution_type: type,
        p_reference_id:      reference_id ?? null,
        p_city_slug:         city_slug    ?? null,
      });

      if (error) throw new Error(error.message);

      const result = data as ContributionResult;
      if (!result.success) throw new Error(result.error ?? 'Contribution failed');
      return result;
    },

    onSuccess: async (result) => {
      // 1. Flash points on screen
      if (result.total_awarded > 0) {
        flashPoints(result.total_awarded);
      }

      // 2. Update local points balance in session store
      if (profile && result.total_awarded > 0) {
        _setProfile({
          ...profile,
          points_balance: profile.points_balance + result.total_awarded,
        });
      }

      // 3. Queue any earned badges for modal display
      if (result.new_badges?.length > 0) {
        // Fetch badge definitions for the newly earned badges
        const { data: badgeDefs } = await supabase
          .from('badge_definitions')
          .select('*')
          .in('id', result.new_badges);

        if (badgeDefs) {
          for (const badge of badgeDefs) {
            queueBadge(badge);
          }
        }
      }

      analytics.track('bathroom_added', { points: result.points });
    },

    onError: (error) => {
      captureException(error, { context: 'useRecordContribution' });
    },
  });
}
```

---

## 7. `src/hooks/useBadges.ts` — NEW

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import type { UserBadge, BadgeDefinition } from '@/types';

export const badgeQueryKeys = {
  user:        (userId: string) => ['badges', 'user',       userId] as const,
  definitions: ()               => ['badges', 'definitions']        as const,
  unnotified:  (userId: string) => ['badges', 'unnotified', userId] as const,
};

export function useBadgeDefinitions() {
  return useQuery<BadgeDefinition[], Error>({
    queryKey: badgeQueryKeys.definitions(),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('badge_definitions')
        .select('*')
        .eq('is_active', true)
        .order('category');

      if (error) throw new Error(error.message);
      return (data ?? []) as BadgeDefinition[];
    },
    staleTime: 60 * 60 * 1000, // Definitions rarely change
  });
}

export function useUserBadges(userId: string) {
  return useQuery<UserBadge[], Error>({
    queryKey: badgeQueryKeys.user(userId),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*, badge:badge_definitions(*)')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as UserBadge[];
    },
    enabled:   Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMarkBadgesNotified() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { userId: string; badgeIds: string[] }>({
    mutationFn: async ({ userId, badgeIds }) => {
      const { error } = await supabase
        .from('user_badges')
        .update({ notified_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('badge_id', badgeIds)
        .is('notified_at', null);

      if (error) throw new Error(error.message);
    },

    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: badgeQueryKeys.user(userId) });
    },

    onError: (error) => {
      captureException(error, { context: 'useMarkBadgesNotified' });
    },
  });
}
```

---

## 8. `src/hooks/useLeaderboard.ts` — NEW

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { LeaderboardEntry, LeaderboardScope, LeaderboardPeriod } from '@/types';

export const leaderboardQueryKeys = {
  board: (scope: LeaderboardScope, period: LeaderboardPeriod, city?: string) =>
    ['leaderboard', scope, period, city ?? 'global'] as const,
};

export function useLeaderboard(
  scope:  LeaderboardScope  = 'global',
  period: LeaderboardPeriod = 'weekly',
  city?:  string,
  limit:  number            = 50,
) {
  return useQuery<LeaderboardEntry[], Error>({
    queryKey: leaderboardQueryKeys.board(scope, period, city),
    queryFn:  async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_scope:  scope,
        p_period: period,
        p_city:   city ?? null,
        p_limit:  limit,
      });

      if (error) throw new Error(error.message);
      return (data ?? []) as LeaderboardEntry[];
    },
    staleTime: 5 * 60 * 1000, // Refreshed weekly, 5min local cache is fine
  });
}
```

---

## 9. `src/hooks/useStreak.ts` — NEW

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserStreak } from '@/types';

export const streakQueryKeys = {
  user: (userId: string) => ['streak', userId] as const,
};

export function useUserStreak(userId: string) {
  return useQuery<UserStreak | null, Error>({
    queryKey: streakQueryKeys.user(userId),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return (data ?? null) as UserStreak | null;
    },
    enabled:   Boolean(userId),
    staleTime: 60 * 1000,
  });
}
```

---

## 10. Component — `src/components/gamification/PointsToast.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { useUIStore } from '@/stores/ui.store';

/**
 * Subscribes to useUIStore.pointsFlash and renders a floating "+N pts" toast.
 * Mount once in the root layout above the navigator.
 */
export function PointsToast() {
  const pointsFlash = useUIStore((s) => s.pointsFlash);

  const opacity     = useRef(new Animated.Value(0)).current;
  const translateY  = useRef(new Animated.Value(20)).current;
  const lastId      = useRef<string | null>(null);

  useEffect(() => {
    if (!pointsFlash || pointsFlash.id === lastId.current) return;
    lastId.current = pointsFlash.id;

    opacity.setValue(0);
    translateY.setValue(20);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1,  duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0,  duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(1400),
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0,  duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -12, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [pointsFlash?.id]);

  if (!pointsFlash) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
      testID="points-toast"
    >
      <View style={styles.pill}>
        <Text style={styles.text}>+{pointsFlash.amount} pts</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:  'absolute',
    bottom:    110,          // above tab bar
    alignSelf: 'center',
    zIndex:    9999,
  },
  pill: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 18,
    paddingVertical:   10,
    borderRadius:      999,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.18,
    shadowRadius:      8,
    elevation:         10,
  },
  text: {
    color:       '#ffffff',
    fontWeight:  '800',
    fontSize:    18,
    letterSpacing: 0.5,
  },
});
```

---

## 11. Component — `src/components/gamification/BadgeEarnedModal.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useUIStore } from '@/stores/ui.store';
import { useAuth } from '@/contexts/AuthContext';
import { useMarkBadgesNotified } from '@/hooks/useBadges';

/**
 * Shows badge-earned modals from the queue in useUIStore.pendingBadges.
 * Mount once above the navigator.
 */
export function BadgeEarnedModal() {
  const pendingBadges  = useUIStore((s) => s.pendingBadges);
  const dismissBadge   = useUIStore((s) => s.dismissBadge);
  const { user }       = useAuth();
  const markNotified   = useMarkBadgesNotified();

  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const currentBadge = pendingBadges[0] ?? null;

  useEffect(() => {
    if (!currentBadge) return;

    scale.setValue(0.7);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, bounciness: 14 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [currentBadge?.id]);

  const handleDismiss = () => {
    if (currentBadge && user) {
      markNotified.mutate({ userId: user.id, badgeIds: [currentBadge.id] });
    }
    dismissBadge();
  };

  if (!currentBadge) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      testID="badge-earned-modal"
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Animated.View
          style={[styles.card, { opacity, transform: [{ scale }] }]}
          testID="badge-card"
        >
          <Pressable onPress={() => {}}>
            <Text style={styles.header}>🎉 Achievement Unlocked!</Text>

            <View style={styles.emojiContainer}>
              <Text style={styles.badgeEmoji} testID="badge-emoji">
                {currentBadge.emoji}
              </Text>
            </View>

            <Text style={styles.badgeName} testID="badge-name">
              {currentBadge.name}
            </Text>
            <Text style={styles.badgeDescription} testID="badge-description">
              {currentBadge.description}
            </Text>

            {currentBadge.bonus_points > 0 && (
              <View style={styles.bonusPill} testID="badge-bonus">
                <Text style={styles.bonusText}>
                  +{currentBadge.bonus_points} bonus points!
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleDismiss}
              testID="badge-dismiss"
            >
              <Text style={styles.buttonText}>
                {pendingBadges.length > 1
                  ? `Awesome! (${pendingBadges.length - 1} more)`
                  : 'Awesome! 🎊'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius:    24,
    padding:         32,
    alignItems:      'center',
    width:           '100%',
    maxWidth:        340,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 16 },
    shadowOpacity:   0.2,
    shadowRadius:    24,
    elevation:       24,
  },
  header: {
    fontSize:    14,
    fontWeight:  '700',
    color:       '#6b7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  emojiContainer: {
    width:           96,
    height:          96,
    backgroundColor: '#fef9c3',
    borderRadius:    48,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    16,
    borderWidth:     3,
    borderColor:     '#fde047',
  },
  badgeEmoji: {
    fontSize: 48,
  },
  badgeName: {
    fontSize:    22,
    fontWeight:  '800',
    color:       '#111827',
    marginBottom: 8,
    textAlign:   'center',
  },
  badgeDescription: {
    fontSize:    14,
    color:       '#6b7280',
    textAlign:   'center',
    lineHeight:  20,
    marginBottom: 20,
  },
  bonusPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderRadius:      999,
    marginBottom:      20,
    borderWidth:       1,
    borderColor:       '#22c55e',
  },
  bonusText: {
    color:      '#15803d',
    fontWeight: '700',
    fontSize:   14,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical:   14,
    borderRadius:      12,
    width:             '100%',
    alignItems:        'center',
  },
  buttonText: {
    color:      '#ffffff',
    fontWeight: '700',
    fontSize:   16,
  },
});
```

---

## 12. Component — `src/components/gamification/LevelProgressBar.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getLevelProgress } from '@/lib/gamification';

interface LevelProgressBarProps {
  points:   number;
  compact?: boolean;
  testID?:  string;
}

export function LevelProgressBar({ points, compact = false, testID }: LevelProgressBarProps) {
  const { level, nextLevel, progress, pointsToNext } = getLevelProgress(points);

  const fillPercent = `${(progress * 100).toFixed(1)}%`;

  return (
    <View style={compact ? styles.containerCompact : styles.container} testID={testID}>
      <View style={styles.levelRow}>
        <View style={[styles.levelBadge, { backgroundColor: level.badgeColor }]}>
          <Text style={styles.levelEmoji}>{level.emoji}</Text>
          {!compact && (
            <Text style={[styles.levelName, { color: level.color }]}>
              {level.name}
            </Text>
          )}
        </View>

        {!compact && nextLevel && (
          <Text style={styles.nextInfo} testID="points-to-next">
            {pointsToNext.toLocaleString()} pts to {nextLevel.name}
          </Text>
        )}

        {!compact && !nextLevel && (
          <Text style={[styles.nextInfo, { color: '#b45309' }]}>Max Level 👑</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack} testID="level-bar-track">
        <View
          style={[
            styles.barFill,
            { width: fillPercent as any, backgroundColor: level.color },
          ]}
          testID="level-bar-fill"
        />
      </View>

      {!compact && (
        <Text style={styles.pointsLabel} testID="points-balance">
          {points.toLocaleString()} pts total
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  containerCompact: {
    paddingVertical: 4,
  },
  levelRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   8,
  },
  levelBadge: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:   999,
    gap:            6,
  },
  levelEmoji: {
    fontSize: 16,
  },
  levelName: {
    fontSize:   13,
    fontWeight: '700',
  },
  nextInfo: {
    fontSize: 12,
    color:    '#9ca3af',
    fontStyle: 'italic',
  },
  barTrack: {
    height:          8,
    backgroundColor: '#e5e7eb',
    borderRadius:    4,
    overflow:        'hidden',
    marginBottom:    6,
  },
  barFill: {
    height:       '100%',
    borderRadius: 4,
  },
  pointsLabel: {
    fontSize: 12,
    color:    '#9ca3af',
    textAlign: 'right',
  },
});
```

---

## 13. Component — `src/components/gamification/LeaderboardRow.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getLevelForPoints } from '@/lib/gamification';
import type { LeaderboardEntry } from '@/types';

interface LeaderboardRowProps {
  entry:      LeaderboardEntry;
  isCurrentUser: boolean;
  testID?:    string;
}

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function LeaderboardRow({ entry, isCurrentUser, testID }: LeaderboardRowProps) {
  const level  = getLevelForPoints(entry.total_points);
  const medal  = RANK_MEDALS[entry.rank];

  return (
    <View
      style={[styles.row, isCurrentUser && styles.rowHighlighted]}
      testID={testID}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {medal ? (
          <Text style={styles.medal} testID="rank-medal">{medal}</Text>
        ) : (
          <Text style={styles.rank} testID="rank-number">#{entry.rank}</Text>
        )}
      </View>

      {/* Level badge */}
      <View style={[styles.levelBadge, { backgroundColor: level.badgeColor }]}>
        <Text style={styles.levelEmoji}>{level.emoji}</Text>
      </View>

      {/* Name */}
      <Text
        style={[styles.name, isCurrentUser && styles.nameHighlighted]}
        numberOfLines={1}
        testID="display-name"
      >
        {entry.display_name}
        {isCurrentUser ? ' (You)' : ''}
      </Text>

      {/* Points */}
      <Text style={styles.points} testID="points">
        {entry.total_points.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap:             10,
  },
  rowHighlighted: {
    backgroundColor: '#eff6ff',
    borderRadius:    10,
    borderBottomWidth: 0,
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  medal: {
    fontSize: 22,
  },
  rank: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#6b7280',
  },
  levelBadge: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },
  levelEmoji: {
    fontSize: 18,
  },
  name: {
    flex:       1,
    fontSize:   15,
    fontWeight: '500',
    color:      '#111827',
  },
  nameHighlighted: {
    fontWeight: '700',
    color:      '#2563eb',
  },
  points: {
    fontSize:   14,
    fontWeight: '700',
    color:      '#374151',
  },
});
```

---

## 14. Component — `src/components/gamification/StreakBadge.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStreakEmoji, getStreakColor } from '@/lib/gamification';

interface StreakBadgeProps {
  streak:  number;
  compact?: boolean;
  testID?:  string;
}

export function StreakBadge({ streak, compact = false, testID }: StreakBadgeProps) {
  const emoji = getStreakEmoji(streak);
  const color = getStreakColor(streak);

  if (streak === 0) {
    return (
      <View style={styles.inactiveContainer} testID={testID}>
        <Text style={styles.inactiveText}>Start your streak today!</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { borderColor: color }, compact && styles.containerCompact]}
      testID={testID}
    >
      <Text style={[styles.emoji, compact && styles.emojiCompact]}>{emoji}</Text>
      <Text style={[styles.count, { color }, compact && styles.countCompact]}
            testID="streak-count">
        {streak}
      </Text>
      {!compact && (
        <Text style={styles.label}>day streak</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    paddingHorizontal: 14,
    paddingVertical:   9,
    borderRadius:   999,
    borderWidth:    2,
    backgroundColor: '#fffbeb',
  },
  containerCompact: {
    paddingHorizontal: 10,
    paddingVertical:   5,
  },
  emoji: {
    fontSize: 20,
  },
  emojiCompact: {
    fontSize: 16,
  },
  count: {
    fontSize:   22,
    fontWeight: '800',
  },
  countCompact: {
    fontSize: 16,
  },
  label: {
    fontSize:  13,
    color:     '#6b7280',
    fontWeight: '500',
  },
  inactiveContainer: {
    paddingHorizontal: 14,
    paddingVertical:   9,
    borderRadius:      999,
    backgroundColor:   '#f3f4f6',
  },
  inactiveText: {
    fontSize: 13,
    color:    '#9ca3af',
  },
});
```

---

## 15. Barrel — `src/components/gamification/index.ts`

```typescript
export { PointsToast }       from './PointsToast';
export { BadgeEarnedModal }  from './BadgeEarnedModal';
export { LevelProgressBar }  from './LevelProgressBar';
export { LeaderboardRow }    from './LeaderboardRow';
export { StreakBadge }       from './StreakBadge';
```

---

## Integration — `app/_layout.tsx` — MODIFIED

Add `PointsToast` and `BadgeEarnedModal` to the root layout so they overlay everything:

```typescript
import { PointsToast, BadgeEarnedModal } from '@/components/gamification';

// Inside the return, after <StatusBar /> and inside <AuthProvider>:
<>
  <StatusBar style="auto" />
  <Stack screenOptions={{ headerShown: false }}>
    {/* ... screens unchanged ... */}
  </Stack>
  {/* Gamification overlays — mounted once, driven by UIStore */}
  <PointsToast />
  <BadgeEarnedModal />
</>
```

---

# Validation Block — SDET

## `src/lib/__tests__/gamification.test.ts`

```typescript
import {
  getLevelForPoints,
  getLevelProgress,
  getStreakEmoji,
  getStreakColor,
  LEVELS,
} from '@/lib/gamification';

describe('getLevelForPoints()', () => {
  it('returns Explorer for 0 points', () => {
    expect(getLevelForPoints(0).name).toBe('Explorer');
  });

  it('returns Scout at exactly 200 points', () => {
    expect(getLevelForPoints(200).name).toBe('Scout');
  });

  it('returns Legend at 15000 points', () => {
    expect(getLevelForPoints(15000).name).toBe('Legend');
  });

  it('returns Legend for points well above max threshold', () => {
    expect(getLevelForPoints(999_999).name).toBe('Legend');
  });

  it('all level thresholds are contiguous (no gaps)', () => {
    for (let i = 0; i < LEVELS.length - 1; i++) {
      expect(LEVELS[i].maxPoints + 1).toBe(LEVELS[i + 1].minPoints);
    }
  });

  it('boundary: 199 = Explorer, 200 = Scout', () => {
    expect(getLevelForPoints(199).name).toBe('Explorer');
    expect(getLevelForPoints(200).name).toBe('Scout');
  });
});

describe('getLevelProgress()', () => {
  it('progress is 0 at level minimum', () => {
    const { progress } = getLevelProgress(0);
    expect(progress).toBe(0);
  });

  it('progress is 1 at Legend (max level)', () => {
    const { progress, nextLevel, pointsToNext } = getLevelProgress(999_999);
    expect(progress).toBe(1);
    expect(nextLevel).toBeNull();
    expect(pointsToNext).toBe(0);
  });

  it('progress is between 0 and 1 for mid-level', () => {
    const { progress } = getLevelProgress(300); // Scout: 200-499
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
  });

  it('pointsToNext decreases as points increase within a level', () => {
    const { pointsToNext: a } = getLevelProgress(250);
    const { pointsToNext: b } = getLevelProgress(300);
    expect(b).toBeLessThan(a);
  });
});

describe('getStreakEmoji()', () => {
  it('returns 💧 for streak=0', () => expect(getStreakEmoji(0)).toBe('💧'));
  it('returns ✨ for streak=3', () => expect(getStreakEmoji(3)).toBe('✨'));
  it('returns ⚡ for streak=7', () => expect(getStreakEmoji(7)).toBe('⚡'));
  it('returns 🔥 for streak=14', () => expect(getStreakEmoji(14)).toBe('🔥'));
  it('returns 👑 for streak=30', () => expect(getStreakEmoji(30)).toBe('👑'));
});
```

---

## `src/hooks/__tests__/usePoints.test.ts`

```typescript
jest.mock('@/lib/supabase',  () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',    () => ({ captureException: jest.fn() }));
jest.mock('@/lib/analytics', () => ({ analytics: { track: jest.fn() } }));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserStats, useRecordContribution } from '@/hooks/usePoints';
import { supabase, resetSupabaseMocks } from 'src/__mocks__/supabase';
import { useUIStore } from '@/stores/ui.store';
import { useSessionStore } from '@/stores/session.store';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockStats = {
  user_id: USER_ID, points_balance: 350, is_premium: false,
  bathrooms_added: 3, codes_submitted: 5, codes_verified: 12,
  votes_cast: 8, photos_uploaded: 2, reports_submitted: 1,
  current_streak: 4, longest_streak: 7, total_contributions: 23,
  badges_earned: 2,
};

describe('useUserStats', () => {
  beforeEach(() => resetSupabaseMocks());

  it('returns stats on success', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: mockStats, error: null });

    const { result } = renderHook(() => useUserStats(USER_ID), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.points_balance).toBe(350);
    expect(result.current.data?.current_streak).toBe(4);
  });

  it('is disabled when userId is empty', () => {
    const { result } = renderHook(() => useUserStats(''), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns error on RPC failure', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const { result } = renderHook(() => useUserStats(USER_ID), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useRecordContribution', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    useUIStore.setState({ pendingBadges: [], pointsFlash: null });
  });

  it('triggers flashPoints when total_awarded > 0', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: {
        success: true, points: 50, new_badges: [],
        streak: 1, streak_bonus: 0, total_awarded: 50,
      },
      error: null,
    });

    const flashSpy = jest.spyOn(useUIStore.getState(), 'flashPoints');

    const { result } = renderHook(() => useRecordContribution(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ type: 'add_bathroom' });
    });

    expect(flashSpy).toHaveBeenCalledWith(50);
  });

  it('queues badges when new_badges are returned', async () => {
    // Mock record_contribution RPC
    supabase.rpc.mockResolvedValueOnce({
      data: {
        success: true, points: 50, new_badges: ['first_flush'],
        streak: 1, streak_bonus: 0, total_awarded: 100,
      },
      error: null,
    });

    // Mock badge_definitions fetch
    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValueOnce({
        data: [{
          id: 'first_flush', name: 'First Flush', description: '...', emoji: '🚽',
          category: 'contribution', bonus_points: 50, is_active: true,
        }],
        error: null,
      }),
    });

    const queueSpy = jest.spyOn(useUIStore.getState(), 'queueBadge');

    const { result } = renderHook(() => useRecordContribution(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ type: 'add_bathroom' });
    });

    expect(queueSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'first_flush' }),
    );
  });

  it('throws when record_contribution returns success=false', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { success: false, error: 'not_authenticated' },
      error: null,
    });

    const { result } = renderHook(() => useRecordContribution(), { wrapper: makeWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ type: 'code_submitted' });
      }),
    ).rejects.toThrow('not_authenticated');
  });
});
```

---

## `src/components/gamification/__tests__/LevelProgressBar.test.tsx`

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LevelProgressBar } from '../LevelProgressBar';

describe('LevelProgressBar', () => {
  it('shows Explorer at 0 points', () => {
    render(<LevelProgressBar points={0} testID="bar" />);
    expect(screen.getByText('Explorer')).toBeTruthy();
    expect(screen.getByTestId('points-balance')).toHaveTextContent('0 pts');
  });

  it('shows Scout at 200 points', () => {
    render(<LevelProgressBar points={200} testID="bar" />);
    expect(screen.getByText('Scout')).toBeTruthy();
  });

  it('shows Legend at 15000+ points', () => {
    render(<LevelProgressBar points={15000} testID="bar" />);
    expect(screen.getByText('Legend')).toBeTruthy();
    expect(screen.getByText('Max Level 👑')).toBeTruthy();
  });

  it('shows points-to-next for non-max levels', () => {
    render(<LevelProgressBar points={300} testID="bar" />);
    expect(screen.getByTestId('points-to-next')).toBeTruthy();
  });

  it('compact mode omits points-balance and next-info', () => {
    render(<LevelProgressBar points={300} compact testID="bar" />);
    expect(screen.queryByTestId('points-balance')).toBeNull();
    expect(screen.queryByTestId('points-to-next')).toBeNull();
  });

  it('renders progress bar track and fill', () => {
    render(<LevelProgressBar points={500} testID="bar" />);
    expect(screen.getByTestId('level-bar-track')).toBeTruthy();
    expect(screen.getByTestId('level-bar-fill')).toBeTruthy();
  });
});
```

---

## `src/components/gamification/__tests__/BadgeEarnedModal.test.tsx`

```typescript
jest.mock('@/lib/supabase',  () => require('src/__mocks__/supabase'));
jest.mock('@/hooks/useBadges', () => ({
  useMarkBadgesNotified: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BadgeEarnedModal } from '../BadgeEarnedModal';
import { useUIStore } from '@/stores/ui.store';

const mockBadge = {
  id: 'first_flush', name: 'First Flush', description: 'Added your first bathroom',
  emoji: '🚽', category: 'contribution' as const, bonus_points: 50, is_active: true,
};

describe('BadgeEarnedModal', () => {
  beforeEach(() => {
    useUIStore.setState({ pendingBadges: [], pointsFlash: null });
  });

  it('renders nothing when no pending badges', () => {
    render(<BadgeEarnedModal />);
    expect(screen.queryByTestId('badge-earned-modal')).toBeNull();
  });

  it('renders badge details when a badge is queued', () => {
    useUIStore.getState().queueBadge(mockBadge);
    render(<BadgeEarnedModal />);

    expect(screen.getByTestId('badge-emoji')).toHaveTextContent('🚽');
    expect(screen.getByTestId('badge-name')).toHaveTextContent('First Flush');
    expect(screen.getByTestId('badge-description')).toHaveTextContent('Added your first bathroom');
  });

  it('shows bonus points pill when bonus_points > 0', () => {
    useUIStore.getState().queueBadge(mockBadge);
    render(<BadgeEarnedModal />);

    expect(screen.getByTestId('badge-bonus')).toHaveTextContent('+50 bonus points!');
  });

  it('dismisses badge on button press', () => {
    useUIStore.getState().queueBadge(mockBadge);
    render(<BadgeEarnedModal />);

    fireEvent.press(screen.getByTestId('badge-dismiss'));
    expect(useUIStore.getState().pendingBadges).toHaveLength(0);
  });

  it('shows remaining count when multiple badges queued', () => {
    const badge2 = { ...mockBadge, id: 'bathroom_scout', name: 'Bathroom Scout' };
    useUIStore.getState().queueBadge(mockBadge);
    useUIStore.getState().queueBadge(badge2);

    render(<BadgeEarnedModal />);
    expect(screen.getByTestId('badge-dismiss')).toHaveTextContent('1 more');
  });
});
```

---

## `src/stores/__tests__/ui.store.gamification.test.ts`

```typescript
import { useUIStore } from '@/stores/ui.store';

const mockBadge = {
  id: 'first_flush', name: 'First Flush', description: '...', emoji: '🚽',
  category: 'contribution' as const, bonus_points: 50, is_active: true,
};

describe('UIStore — gamification extensions', () => {
  beforeEach(() => {
    useUIStore.setState({ pendingBadges: [], pointsFlash: null, toasts: [] });
  });

  it('queueBadge adds to pendingBadges', () => {
    useUIStore.getState().queueBadge(mockBadge);
    expect(useUIStore.getState().pendingBadges).toHaveLength(1);
    expect(useUIStore.getState().pendingBadges[0].id).toBe('first_flush');
  });

  it('dismissBadge removes first item', () => {
    const badge2 = { ...mockBadge, id: 'code_breaker' };
    useUIStore.getState().queueBadge(mockBadge);
    useUIStore.getState().queueBadge(badge2);
    useUIStore.getState().dismissBadge();

    expect(useUIStore.getState().pendingBadges).toHaveLength(1);
    expect(useUIStore.getState().pendingBadges[0].id).toBe('code_breaker');
  });

  it('flashPoints sets pointsFlash with correct amount', () => {
    useUIStore.getState().flashPoints(75);
    expect(useUIStore.getState().pointsFlash?.amount).toBe(75);
    expect(useUIStore.getState().pointsFlash?.id).toBeDefined();
  });

  it('multiple flashPoints calls get unique IDs', () => {
    useUIStore.getState().flashPoints(50);
    const id1 = useUIStore.getState().pointsFlash?.id;
    useUIStore.getState().clearPointsFlash();

    useUIStore.getState().flashPoints(100);
    const id2 = useUIStore.getState().pointsFlash?.id;

    expect(id1).not.toBe(id2);
  });

  it('clearPointsFlash sets pointsFlash to null', () => {
    useUIStore.getState().flashPoints(50);
    useUIStore.getState().clearPointsFlash();
    expect(useUIStore.getState().pointsFlash).toBeNull();
  });
});
```

---

## Security Validation SQL

```sql
-- ============================================================================
-- Gamification RLS + Logic Tests
-- ============================================================================

-- 1. award_points: cannot be called directly by authenticated users (RLS blocks insert)
-- Run as authenticated user — should fail
insert into public.point_events (user_id, event_type, points)
values (auth.uid(), 'add_bathroom', 999);
-- Expected: ERROR: new row violates row-level security policy

-- 2. user_badges: cannot be inserted directly
insert into public.user_badges (user_id, badge_id) values (auth.uid(), 'first_flush');
-- Expected: ERROR: new row violates row-level security policy

-- 3. record_contribution: unauthenticated → error
-- Run as anon:
select public.record_contribution('add_bathroom');
-- Expected: {"success": false, "error": "not_authenticated"}

-- 4. Streak correctness — verify streak increments on consecutive days
-- (Run as a user, then simulate date progression)
select public.update_streak(auth.uid());
-- First call: streak=1
-- Second call same day: streak unchanged
-- Call next day: streak=2

-- 5. check_and_award_badges is idempotent
-- Run twice with the same user — should not double-award badges
select public.check_and_award_badges(auth.uid());
select public.check_and_award_badges(auth.uid());
-- Badge count should remain constant after the second call

-- 6. Leaderboard cache is publicly readable
-- Run as anon:
select count(*) from public.leaderboard_cache;
-- Expected: row count ≥ 0 (no error)

-- 7. Point events are user-scoped — anon cannot read
-- Run as anon:
select count(*) from public.point_events;
-- Expected: 0 rows (RLS filters to auth.uid() = user_id, which is null for anon)

-- 8. refresh_leaderboard requires service role (no RLS bypass for regular users)
-- Run as regular authenticated user:
select public.refresh_leaderboard();
-- Expected: Should succeed (security definer) but leaderboard_cache RLS
-- ensures regular users cannot directly write to it outside this function
```

---

## Performance Notes

- **`point_events` ledger** — indexed on `(user_id, created_at desc)`. The `get_user_stats` RPC runs 7 subquery counts. For scale, these should migrate to pre-aggregated columns on `profiles` (via trigger) once daily active users exceed ~10k. Left as subqueries for now for correctness.
- **`check_and_award_badges`** runs 7 COUNT queries per call. It's `security definer` and only called from `record_contribution`. Consider caching the result in a `profiles.badge_check_at` timestamp and only re-running if > 1 min has elapsed.
- **`leaderboard_cache`** is a write-through cache refreshed by Edge Function. Never compute rank in real time at read — the cache table makes all leaderboard reads O(1) index scans.
- **`PointsToast` animation** uses `useNativeDriver: true` for both opacity and translateY — runs on the UI thread, zero JS bridge overhead. ✅
- **Memory leak check** — `BadgeEarnedModal` uses `useEffect` triggered by badge ID changes. No subscriptions or timers to clean up. `PointsToast`'s `Animated.sequence` is fire-and-forget; React Native handles cleanup. ✅

---

## Section 2 Checklist

| Feature | DB | Types | Hook | UI | Tests |
|---------|----|----|------|----|-------|
| Points ledger + award_points | ✅ | ✅ | ✅ | — | ✅ |
| Badge definitions + check_and_award_badges | ✅ | ✅ | ✅ | ✅ | ✅ |
| Streak system + milestones | ✅ | ✅ | ✅ | ✅ | ✅ |
| record_contribution orchestrator | ✅ | ✅ | ✅ | — | ✅ |
| Level system (8 tiers) | — | ✅ | — | ✅ | ✅ |
| Leaderboard cache + refresh | ✅ | ✅ | ✅ | ✅ | — |
| PointsToast (animated) | — | — | — | ✅ | ✅ |
| BadgeEarnedModal | — | — | — | ✅ | ✅ |
| Points → premium conversion | Schema ready | — | Future Phase | — | — |
| UIStore gamification extensions | — | — | — | ✅ | ✅ |

**Section 2: The Gamification Engine is complete. Say "Next" for Section 3: The Map Tab, or "Integrated" to verify first.**

## Assistant (commentary)

`2026-03-16T08:20:15.825Z`

I have the implementation shape now. I’m adding two focused map components next: a filter drawer and a richer bottom-sheet detail card, then I’ll wire them into the tab screen and run the full validation pass.

## Assistant (commentary)

`2026-03-16T08:21:15.582Z`

The new map components are in place. I’m wiring the screen now so the map overlay buttons, filter state, and bottom-sheet actions all work together off the existing stores and navigation rules.

## Assistant (commentary)

`2026-03-16T08:21:44.901Z`

The screen wiring is done. I’m updating the map utility tests now so the new filter logic, open-hours evaluation, and pin-tone classification are covered before I run the compiler and Jest.

## Assistant (commentary)

`2026-03-16T08:22:32.529Z`

I found one backend-side correctness issue before validation: the new map filters were only being applied on the happy-path RPC response, not on the fallback/search code paths. I’m fixing that so `open now`, `no code required`, and cleanliness filtering behave consistently everywhere.

## Assistant (commentary)

`2026-03-16T08:25:24.834Z`

The implementation itself is compiling and linting cleanly. The remaining failures are test fixtures: the parser mocks need the new `cleanliness_avg` field, and the map utility tests were too timezone-sensitive for the new hours logic. I’m correcting those fixtures now.

## User

`2026-03-16T08:26:15.271Z`

compare with: Clean. No conflicts. Beginning output.

---

# Section 3: The Map Tab

## Terminal Commands

```bash
# Install the last pre-Phase-4 pending package
npm install @gorhom/bottom-sheet

# Rebuild native (bottom-sheet needs native reanimated + gesture handler)
npx expo prebuild --clean
# Then: npx expo run:android  OR  npx expo run:ios
```

---

## 1. Database — `supabase/migrations/005_map_features.sql`

```sql
-- ============================================================================
-- PeeDom Map Features Migration
-- 005_map_features.sql
-- ============================================================================

-- ─── RPC: get_nearby_bathrooms ───────────────────────────────────────────────
-- Returns up to 60 active bathrooms within radius_meters of a coordinate.
-- Hits the GIST index on bathrooms.geom.
-- Includes the top code summary for each bathroom (confidence, has_code flag).

create or replace function public.get_nearby_bathrooms(
  user_lat     double precision,
  user_lng     double precision,
  radius_meters double precision default 5000
)
returns table (
  id                 uuid,
  place_name         text,
  address_line1      text,
  city               text,
  state              text,
  latitude           double precision,
  longitude          double precision,
  is_locked          boolean,
  is_accessible      boolean,
  is_customer_only   boolean,
  hours_json         jsonb,
  distance_meters    double precision,
  -- Code summary (nullable — bathroom may have no codes)
  has_code           boolean,
  confidence_score   numeric,
  last_verified_at   timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with nearby as (
    select
      b.id,
      b.place_name,
      b.address_line1,
      b.city,
      b.state,
      b.latitude,
      b.longitude,
      b.is_locked,
      b.is_accessible,
      b.is_customer_only,
      b.hours_json,
      ST_Distance(
        b.geom,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
      ) as distance_meters
    from public.bathrooms b
    where b.moderation_status = 'active'
      and ST_DWithin(
        b.geom,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_meters
      )
    order by distance_meters asc
    limit 60
  ),
  code_summary as (
    -- Best active code per bathroom (highest confidence)
    select distinct on (bac.bathroom_id)
      bac.bathroom_id,
      true                    as has_code,
      bac.confidence_score,
      bac.last_verified_at
    from public.bathroom_access_codes bac
    where bac.visibility_status = 'visible'
      and bac.lifecycle_status  = 'active'
    order by bac.bathroom_id, bac.confidence_score desc, bac.last_verified_at desc nulls last
  )
  select
    n.id,
    n.place_name,
    n.address_line1,
    n.city,
    n.state,
    n.latitude,
    n.longitude,
    n.is_locked,
    n.is_accessible,
    n.is_customer_only,
    n.hours_json,
    n.distance_meters,
    coalesce(cs.has_code, false)       as has_code,
    cs.confidence_score,
    cs.last_verified_at
  from nearby n
  left join code_summary cs on cs.bathroom_id = n.id
  order by n.distance_meters asc;
$$;

-- ─── RPC: get_bathroom_detail ─────────────────────────────────────────────────
-- Full detail for a single bathroom including:
--   - All active codes with the caller's vote
--   - Avg cleanliness rating
--   - Open report count
--   - Caller's favorite status

create or replace function public.get_bathroom_detail(
  p_bathroom_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_bathroom      record;
  v_codes         jsonb;
  v_clean_avg     numeric;
  v_report_count  integer;
  v_is_favorited  boolean := false;
begin
  -- Core bathroom record
  select * into v_bathroom
  from public.bathrooms
  where id = p_bathroom_id and moderation_status = 'active';

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  -- Active codes with user vote
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',               bac.id,
      'code_value',       bac.code_value,
      'confidence_score', bac.confidence_score,
      'up_votes',         bac.up_votes,
      'down_votes',       bac.down_votes,
      'last_verified_at', bac.last_verified_at,
      'expires_at',       bac.expires_at,
      'user_vote',        cv.vote
    ) order by bac.confidence_score desc
  ), '[]'::jsonb)
  into v_codes
  from public.bathroom_access_codes bac
  left join public.code_votes cv
    on cv.code_id = bac.id and cv.user_id = auth.uid()
  where bac.bathroom_id      = p_bathroom_id
    and bac.visibility_status = 'visible'
    and bac.lifecycle_status  = 'active';

  -- Average cleanliness
  select round(avg(rating)::numeric, 1) into v_clean_avg
  from public.cleanliness_ratings
  where bathroom_id = p_bathroom_id;

  -- Open report count
  select count(*) into v_report_count
  from public.bathroom_reports
  where bathroom_id = p_bathroom_id and status = 'open';

  -- Favorite status (only for authenticated users)
  if auth.uid() is not null then
    select exists(
      select 1 from public.favorites
      where user_id = auth.uid() and bathroom_id = p_bathroom_id
    ) into v_is_favorited;
  end if;

  return jsonb_build_object(
    'id',               v_bathroom.id,
    'place_name',       v_bathroom.place_name,
    'address_line1',    v_bathroom.address_line1,
    'city',             v_bathroom.city,
    'state',            v_bathroom.state,
    'postal_code',      v_bathroom.postal_code,
    'latitude',         v_bathroom.latitude,
    'longitude',        v_bathroom.longitude,
    'is_locked',        v_bathroom.is_locked,
    'is_accessible',    v_bathroom.is_accessible,
    'is_customer_only', v_bathroom.is_customer_only,
    'hours_json',       v_bathroom.hours_json,
    'updated_at',       v_bathroom.updated_at,
    'codes',            v_codes,
    'cleanliness_avg',  v_clean_avg,
    'open_report_count',v_report_count,
    'is_favorited',     v_is_favorited
  );
end;
$$;

-- ─── RPC: toggle_favorite ────────────────────────────────────────────────────

create or replace function public.toggle_favorite(p_bathroom_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select exists(
    select 1 from public.favorites
    where user_id = auth.uid() and bathroom_id = p_bathroom_id
  ) into v_exists;

  if v_exists then
    delete from public.favorites
    where user_id = auth.uid() and bathroom_id = p_bathroom_id;
    return jsonb_build_object('success', true, 'favorited', false);
  else
    insert into public.favorites (user_id, bathroom_id)
    values (auth.uid(), p_bathroom_id);
    return jsonb_build_object('success', true, 'favorited', true);
  end if;
end;
$$;

-- ─── Index verification ───────────────────────────────────────────────────────
-- Ensure GIST index exists (created in migration 001)
-- select indexname from pg_indexes
-- where tablename = 'bathrooms' and indexname = 'idx_bathrooms_geom';
```

---

## 2. Types — additions to `src/types/index.ts`

```typescript
// ============================================================================
// MAP TYPES
// ============================================================================

export interface NearbyBathroom {
  id:               string;
  place_name:       string;
  address_line1:    string | null;
  city:             string | null;
  state:            string | null;
  latitude:         number;
  longitude:        number;
  is_locked:        boolean | null;
  is_accessible:    boolean | null;
  is_customer_only: boolean;
  hours_json:       HoursData | null;
  distance_meters:  number;
  has_code:         boolean;
  confidence_score: number | null;
  last_verified_at: string | null;
}

export interface BathroomDetail {
  id:               string;
  place_name:       string;
  address_line1:    string | null;
  city:             string | null;
  state:            string | null;
  postal_code:      string | null;
  latitude:         number;
  longitude:        number;
  is_locked:        boolean | null;
  is_accessible:    boolean | null;
  is_customer_only: boolean;
  hours_json:       HoursData | null;
  updated_at:       string;
  codes:            BathroomCodeWithVote[];
  cleanliness_avg:  number | null;
  open_report_count: number;
  is_favorited:     boolean;
}

/**
 * Derived pin color for map markers.
 * green  = unlocked or no code needed + has data
 * yellow = locked but code available
 * red    = locked, no code
 * grey   = unknown / no data yet
 */
export type MarkerColor = 'green' | 'yellow' | 'red' | 'grey';

export function getMarkerColor(bathroom: NearbyBathroom): MarkerColor {
  if (!bathroom.is_locked) return 'green';
  if (bathroom.has_code)   return 'yellow';
  return 'red';
}

export function getMarkerHex(color: MarkerColor): string {
  switch (color) {
    case 'green':  return '#16a34a';
    case 'yellow': return '#d97706';
    case 'red':    return '#dc2626';
    case 'grey':   return '#9ca3af';
  }
}

export function isCurrentlyOpen(hoursJson: HoursData | null): boolean | null {
  if (!hoursJson) return null; // unknown

  const now    = new Date();
  const days   = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayKey = days[now.getDay()];
  const slots  = hoursJson[dayKey];

  if (!slots || slots.length === 0) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return slots.some((slot) => {
    const [oh, om] = slot.open.split(':').map(Number);
    const [ch, cm] = slot.close.split(':').map(Number);
    const openMin  = oh * 60 + om;
    const closeMin = ch * 60 + cm;

    // Handle overnight hours (e.g. 22:00 – 02:00)
    if (closeMin < openMin) {
      return nowMinutes >= openMin || nowMinutes <= closeMin;
    }
    return nowMinutes >= openMin && nowMinutes <= closeMin;
  });
}

export function formatDistance(meters: number): string {
  if (meters < 160)   return 'Here';
  if (meters < 1600)  return `${Math.round(meters / 10) * 10}m`;
  const miles = meters / 1609.344;
  return miles < 10 ? `${miles.toFixed(1)}mi` : `${Math.round(miles)}mi`;
}
```

---

## 3. `src/hooks/useNearbyBathrooms.ts` — NEW (replaces session summary version)

```typescript
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { useMapStore } from '@/stores/map.store';
import { isCurrentlyOpen } from '@/types';
import type { NearbyBathroom } from '@/types';

export const nearbyQueryKeys = {
  all:    ['bathrooms', 'nearby'] as const,
  region: (lat: number, lng: number, radius: number) =>
    ['bathrooms', 'nearby', lat.toFixed(3), lng.toFixed(3), radius] as const,
};

const LOCATION_DENIED_ERROR = 'LOCATION_PERMISSION_DENIED';

export interface UseNearbyBathroomsOptions {
  /** Override location (e.g. map center when user pans away from position) */
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
}

export function useNearbyBathrooms(opts: UseNearbyBathroomsOptions = {}) {
  const { radiusMeters = 5000 } = opts;
  const { filters } = useMapStore();

  return useQuery<NearbyBathroom[], Error>({
    queryKey: nearbyQueryKeys.region(
      opts.centerLat ?? 0,
      opts.centerLng ?? 0,
      radiusMeters,
    ),
    queryFn: async () => {
      let lat: number;
      let lng: number;

      if (opts.centerLat !== undefined && opts.centerLng !== undefined) {
        lat = opts.centerLat;
        lng = opts.centerLng;
      } else {
        // Request device location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error(LOCATION_DENIED_ERROR);

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }

      const { data, error } = await supabase.rpc('get_nearby_bathrooms', {
        user_lat:      lat,
        user_lng:      lng,
        radius_meters: radiusMeters,
      });

      if (error) throw new Error(error.message);

      let results = (data ?? []) as NearbyBathroom[];

      // ── Client-side filter application ───────────────────────────────────
      if (filters.openNow) {
        results = results.filter((b) => isCurrentlyOpen(b.hours_json) === true);
      }
      if (filters.accessibleOnly) {
        results = results.filter((b) => b.is_accessible === true);
      }
      if (filters.noCodeRequired) {
        results = results.filter((b) => !b.is_locked);
      }
      // minCleanlinessRating requires a join — handled server-side in future;
      // for now we pass through (rating data not in nearby RPC response)

      return results;
    },
    retry: (failureCount, error) => {
      if (error.message === LOCATION_DENIED_ERROR) return false;
      return failureCount < 2;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export { LOCATION_DENIED_ERROR };
```

---

## 4. `src/hooks/useBathroomDetail.ts` — NEW

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { analytics } from '@/lib/analytics';
import { useRecordContribution } from '@/hooks/usePoints';
import type { BathroomDetail } from '@/types';

export const detailQueryKeys = {
  detail: (id: string) => ['bathrooms', 'detail', id] as const,
};

export function useBathroomDetail(bathroomId: string | null) {
  return useQuery<BathroomDetail, Error>({
    queryKey: detailQueryKeys.detail(bathroomId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bathroom_detail', {
        p_bathroom_id: bathroomId,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return data as BathroomDetail;
    },
    enabled: Boolean(bathroomId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useToggleFavorite() {
  const queryClient   = useQueryClient();
  const recordContrib = useRecordContribution();

  return useMutation
    { success: boolean; favorited: boolean },
    Error,
    { bathroomId: string }
  >({
    mutationFn: async ({ bathroomId }) => {
      const { data, error } = await supabase.rpc('toggle_favorite', {
        p_bathroom_id: bathroomId,
      });

      if (error) throw new Error(error.message);
      return data as { success: boolean; favorited: boolean };
    },

    // Optimistic update on detail cache
    onMutate: async ({ bathroomId }) => {
      const key = detailQueryKeys.detail(bathroomId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BathroomDetail>(key);

      queryClient.setQueryData<BathroomDetail>(key, (old) =>
        old ? { ...old, is_favorited: !old.is_favorited } : old,
      );

      return { previous, key };
    },

    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
      captureException(_err, { context: 'useToggleFavorite' });
    },

    onSuccess: (result, { bathroomId }) => {
      if (result.favorited) {
        analytics.track('bathroom_favorited');
        recordContrib.mutate({ type: 'favorite_added', reference_id: bathroomId });
      } else {
        analytics.track('bathroom_unfavorited');
      }
      // Invalidate favorites list
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
```

---

## 5. Component — `src/components/map/BathroomMarker.tsx`

```typescript
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { getMarkerColor, getMarkerHex, formatDistance } from '@/types';
import type { NearbyBathroom } from '@/types';

interface BathroomMarkerProps {
  bathroom:  NearbyBathroom;
  selected:  boolean;
  onPress:   (id: string) => void;
}

/**
 * Single bathroom map marker.
 * Color-coded:
 *   🟢 green  = no lock / free access
 *   🟡 yellow = locked + code available
 *   🔴 red    = locked, no code
 *
 * Uses memo to prevent re-render on unrelated state changes (critical for
 * maps with 60 markers).
 */
export const BathroomMarker = memo(function BathroomMarker({
  bathroom,
  selected,
  onPress,
}: BathroomMarkerProps) {
  const color    = getMarkerColor(bathroom);
  const hex      = getMarkerHex(color);
  const distance = formatDistance(bathroom.distance_meters);

  return (
    <Marker
      coordinate={{ latitude: bathroom.latitude, longitude: bathroom.longitude }}
      onPress={() => onPress(bathroom.id)}
      tracksViewChanges={selected}  // only track when selected (perf)
      testID={`marker-${bathroom.id}`}
    >
      {/* Custom marker view */}
      <View
        style={[
          styles.pin,
          { backgroundColor: hex, borderColor: selected ? '#1e293b' : hex },
          selected && styles.pinSelected,
        ]}
        testID={`marker-pin-${bathroom.id}`}
      >
        <Text style={styles.pinEmoji}>
          {color === 'green' ? '✓' : color === 'yellow' ? '🔑' : '🔒'}
        </Text>
      </View>
      <View style={[styles.pinTail, { borderTopColor: hex }]} />

      {/* Callout (tap expander) — lightweight, navigates to detail sheet */}
      <Callout onPress={() => onPress(bathroom.id)} tooltip>
        <View style={styles.callout} testID={`callout-${bathroom.id}`}>
          <Text style={styles.calloutName} numberOfLines={2}>
            {bathroom.place_name}
          </Text>
          <Text style={styles.calloutMeta}>
            {distance}
            {bathroom.is_accessible ? '  ♿' : ''}
            {bathroom.is_customer_only ? '  🛒' : ''}
          </Text>
          <Text style={[styles.calloutStatus, { color: hex }]}>
            {color === 'green'  ? '✓ Free access' :
             color === 'yellow' ? '🔑 Code available' :
             '🔒 No code yet'}
          </Text>
        </View>
      </Callout>
    </Marker>
  );
});

const styles = StyleSheet.create({
  pin: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    2.5,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.3,
    shadowRadius:   4,
    elevation:      6,
  },
  pinSelected: {
    width:      44,
    height:     44,
    borderRadius: 22,
    borderWidth:  3,
    shadowOpacity: 0.5,
    elevation:    10,
  },
  pinEmoji: {
    fontSize:   16,
    color:      '#ffffff',
    fontWeight: '800',
  },
  pinTail: {
    alignSelf:   'center',
    width:       0,
    height:      0,
    borderLeftWidth:  6,
    borderRightWidth: 6,
    borderTopWidth:   8,
    borderLeftColor:  'transparent',
    borderRightColor: 'transparent',
    marginTop:   -1,
  },
  // Callout
  callout: {
    backgroundColor: '#ffffff',
    borderRadius:    12,
    padding:         12,
    minWidth:        180,
    maxWidth:        240,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.15,
    shadowRadius:    8,
    elevation:       8,
  },
  calloutName: {
    fontSize:    14,
    fontWeight:  '700',
    color:       '#111827',
    marginBottom: 4,
  },
  calloutMeta: {
    fontSize:    12,
    color:       '#6b7280',
    marginBottom: 4,
  },
  calloutStatus: {
    fontSize:   12,
    fontWeight: '600',
  },
});
```

---

## 6. Component — `src/components/map/NavigateButton.tsx`

```typescript
import React from 'react';
import {
  TouchableOpacity,
  Text,
  Linking,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { analytics } from '@/lib/analytics';

interface NavigateButtonProps {
  latitude:  number;
  longitude: number;
  placeName: string;
  style?:    object;
  testID?:   string;
}

const MAPS_APPS = {
  apple:  (lat: number, lng: number, name: string) =>
    `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`,
  google: (lat: number, lng: number, name: string) =>
    `comgooglemaps://?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`,
  waze:   (lat: number, lng: number) =>
    `waze://?ll=${lat},${lng}&navigate=yes`,
  gmaps:  (lat: number, lng: number, name: string) =>
    `https://maps.google.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`,
};

export function NavigateButton({
  latitude, longitude, placeName, style, testID,
}: NavigateButtonProps) {
  const handleNavigate = async () => {
    analytics.track('map_navigate_tapped');

    const isIOS = Platform.OS === 'ios';

    const options: { label: string; url: string }[] = [];

    if (isIOS) {
      options.push({ label: 'Apple Maps', url: MAPS_APPS.apple(latitude, longitude, placeName) });
    }

    const googleAvailable = await Linking.canOpenURL('comgooglemaps://').catch(() => false);
    if (googleAvailable) {
      options.push({ label: 'Google Maps', url: MAPS_APPS.google(latitude, longitude, placeName) });
    }

    const wazeAvailable = await Linking.canOpenURL('waze://').catch(() => false);
    if (wazeAvailable) {
      options.push({ label: 'Waze', url: MAPS_APPS.waze(latitude, longitude) });
    }

    // Always include web fallback
    options.push({ label: 'Open in Browser', url: MAPS_APPS.gmaps(latitude, longitude, placeName) });

    if (options.length === 1) {
      await Linking.openURL(options[0].url);
      return;
    }

    Alert.alert(
      'Navigate to Bathroom',
      'Choose your navigation app:',
      [
        ...options.map((o) => ({
          text: o.label,
          onPress: () => Linking.openURL(o.url),
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleNavigate}
      activeOpacity={0.85}
      testID={testID}
    >
      <Text style={styles.icon}>🧭</Text>
      <Text style={styles.text}>Navigate</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    backgroundColor:   '#2563eb',
    paddingHorizontal: 18,
    paddingVertical:   11,
    borderRadius:      10,
    flex:              1,
    justifyContent:    'center',
  },
  icon: { fontSize: 16 },
  text: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
```

---

## 7. Component — `src/components/map/MapControls.tsx`

```typescript
import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useMapStore } from '@/stores/map.store';

interface MapControlsProps {
  onLocateMe:       () => void;
  onAddBathroom:    () => void;
  isLocating:       boolean;
  testID?:          string;
}

export function MapControls({
  onLocateMe,
  onAddBathroom,
  isLocating,
  testID,
}: MapControlsProps) {
  const { hasActiveFilters, setFilterSheetOpen } = useMapStore();
  const filtersActive = hasActiveFilters();

  return (
    <View style={styles.container} testID={testID} pointerEvents="box-none">
      {/* Locate Me */}
      <TouchableOpacity
        style={[styles.circleButton, styles.shadow]}
        onPress={onLocateMe}
        disabled={isLocating}
        testID="locate-me-button"
      >
        {isLocating
          ? <ActivityIndicator size="small" color="#2563eb" />
          : <Text style={styles.icon}>📍</Text>
        }
      </TouchableOpacity>

      {/* Filter */}
      <TouchableOpacity
        style={[styles.circleButton, styles.shadow, filtersActive && styles.activeFilter]}
        onPress={() => setFilterSheetOpen(true)}
        testID="filter-button"
      >
        <Text style={styles.icon}>⚙️</Text>
        {filtersActive && <View style={styles.filterDot} testID="filter-active-dot" />}
      </TouchableOpacity>

      {/* Add Bathroom */}
      <TouchableOpacity
        style={[styles.addButton, styles.shadow]}
        onPress={onAddBathroom}
        testID="add-bathroom-button"
      >
        <Text style={styles.addIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:       'absolute',
    right:          16,
    bottom:         110,
    gap:            10,
    alignItems:     'center',
  },
  circleButton: {
    width:           48,
    height:          48,
    borderRadius:    24,
    backgroundColor: '#ffffff',
    alignItems:      'center',
    justifyContent:  'center',
  },
  activeFilter: {
    backgroundColor: '#eff6ff',
    borderWidth:     1.5,
    borderColor:     '#2563eb',
  },
  addButton: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: '#2563eb',
    alignItems:      'center',
    justifyContent:  'center',
  },
  icon:    { fontSize: 22 },
  addIcon: { fontSize: 32, color: '#ffffff', lineHeight: 36 },
  shadow: {
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 3 },
    shadowOpacity:  0.15,
    shadowRadius:   6,
    elevation:      6,
  },
  filterDot: {
    position:       'absolute',
    top:            8,
    right:          8,
    width:          9,
    height:         9,
    borderRadius:   5,
    backgroundColor: '#2563eb',
    borderWidth:    1.5,
    borderColor:    '#ffffff',
  },
});
```

---

## 8. Component — `src/components/map/FilterSheet.tsx`

```typescript
import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useMapStore, MapFilters } from '@/stores/map.store';

const SNAP_POINTS = ['50%'];

const CLEANLINESS_OPTIONS: { value: MapFilters['minCleanlinessRating']; label: string }[] = [
  { value: 0, label: 'Any' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
  { value: 5, label: '5 only' },
];

interface FilterSheetProps {
  testID?: string;
}

export function FilterSheet({ testID }: FilterSheetProps) {
  const {
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters,
    isFilterSheetOpen,
    setFilterSheetOpen,
  } = useMapStore();

  const sheetRef = useRef<BottomSheet>(null);

  const handleClose = useCallback(() => {
    sheetRef.current?.close();
    setFilterSheetOpen(false);
  }, [setFilterSheetOpen]);

  if (!isFilterSheetOpen) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={SNAP_POINTS}
      onClose={handleClose}
      enablePanDownToClose
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      testID={testID}
    >
      <BottomSheetView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          {hasActiveFilters() && (
            <TouchableOpacity
              onPress={resetFilters}
              testID="reset-filters"
            >
              <Text style={styles.resetText}>Reset all</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Toggle: Open Now */}
        <FilterRow
          label="Open Now"
          description="Only show bathrooms currently open"
          emoji="🕐"
          testID="filter-open-now"
        >
          <Switch
            value={filters.openNow}
            onValueChange={(v) => setFilter('openNow', v)}
            trackColor={{ true: '#2563eb' }}
            thumbColor={Platform.OS === 'ios' ? undefined : '#ffffff'}
            testID="filter-open-now-switch"
          />
        </FilterRow>

        {/* Toggle: Accessible */}
        <FilterRow
          label="Accessible Only"
          description="Wheelchair accessible bathrooms"
          emoji="♿"
          testID="filter-accessible"
        >
          <Switch
            value={filters.accessibleOnly}
            onValueChange={(v) => setFilter('accessibleOnly', v)}
            trackColor={{ true: '#2563eb' }}
            thumbColor={Platform.OS === 'ios' ? undefined : '#ffffff'}
            testID="filter-accessible-switch"
          />
        </FilterRow>

        {/* Toggle: No Code Required */}
        <FilterRow
          label="No Code Required"
          description="Unlocked or freely accessible"
          emoji="🔓"
          testID="filter-no-code"
        >
          <Switch
            value={filters.noCodeRequired}
            onValueChange={(v) => setFilter('noCodeRequired', v)}
            trackColor={{ true: '#2563eb' }}
            thumbColor={Platform.OS === 'ios' ? undefined : '#ffffff'}
            testID="filter-no-code-switch"
          />
        </FilterRow>

        {/* Cleanliness minimum */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🧹 Minimum Cleanliness Rating</Text>
          <View style={styles.pillRow}>
            {CLEANLINESS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.pill,
                  filters.minCleanlinessRating === opt.value && styles.pillActive,
                ]}
                onPress={() => setFilter('minCleanlinessRating', opt.value)}
                testID={`filter-cleanliness-${opt.value}`}
              >
                <Text
                  style={[
                    styles.pillText,
                    filters.minCleanlinessRating === opt.value && styles.pillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Map Legend</Text>
          <View style={styles.legendRow}>
            <Text style={[styles.legendDot, { color: '#16a34a' }]}>●</Text>
            <Text style={styles.legendLabel}>Free access</Text>
            <Text style={[styles.legendDot, { color: '#d97706', marginLeft: 16 }]}>●</Text>
            <Text style={styles.legendLabel}>Code available</Text>
            <Text style={[styles.legendDot, { color: '#dc2626', marginLeft: 16 }]}>●</Text>
            <Text style={styles.legendLabel}>No code</Text>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

// ─── FilterRow ────────────────────────────────────────────────────────────────

function FilterRow({
  label, description, emoji, children, testID,
}: {
  label: string;
  description: string;
  emoji: string;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.filterRow} testID={testID}>
      <Text style={styles.filterEmoji}>{emoji}</Text>
      <View style={styles.filterText}>
        <Text style={styles.filterLabel}>{label}</Text>
        <Text style={styles.filterDesc}>{description}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#ffffff', borderRadius: 20 },
  handle:  { backgroundColor: '#d1d5db', width: 40 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: 12,
    marginBottom:   4,
  },
  title:     { fontSize: 20, fontWeight: '800', color: '#111827' },
  resetText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  filterRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  filterEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  filterText: { flex: 1 },
  filterLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  filterDesc:  { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  section: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sectionLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical:    8,
    borderRadius:       999,
    backgroundColor:   '#f1f5f9',
    borderWidth:       1.5,
    borderColor:       '#e2e8f0',
  },
  pillActive:     { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText:       { fontSize: 14, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#ffffff' },
  legend:      { paddingTop: 16 },
  legendTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  legendRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  legendDot:   { fontSize: 18 },
  legendLabel: { fontSize: 13, color: '#374151', marginLeft: 4 },
});
```

---

## 9. Component — `src/components/map/BathroomDetailSheet.tsx`

```typescript
import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMapStore } from '@/stores/map.store';
import { useBathroomDetail, useToggleFavorite } from '@/hooks/useBathroomDetail';
import { useAuth } from '@/contexts/AuthContext';
import { CodeRevealCard } from '@/components/trust/CodeRevealCard';
import { PhotoGallery } from '@/components/trust/PhotoGallery';
import { PhotoUploadButton } from '@/components/trust/PhotoUploadButton';
import { NavigateButton } from './NavigateButton';
import { formatDistance, isCurrentlyOpen } from '@/types';
import type { NearbyBathroom } from '@/types';

interface BathroomDetailSheetProps {
  selectedBathroom: NearbyBathroom | null;
  onClose:          () => void;
  testID?:          string;
}

const SNAP_POINTS = ['35%', '75%'];

export function BathroomDetailSheet({
  selectedBathroom,
  onClose,
  testID,
}: BathroomDetailSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const { isAuthenticated } = useAuth();

  const { data: detail, isLoading } = useBathroomDetail(
    selectedBathroom?.id ?? null,
  );
  const toggleFavorite = useToggleFavorite();

  // Open/close sheet when selection changes
  useEffect(() => {
    if (selectedBathroom) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [selectedBathroom?.id]);

  const handleClose = useCallback(() => {
    sheetRef.current?.close();
    onClose();
  }, [onClose]);

  const handleFavorite = () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Sign in to save favorites.', [{ text: 'OK' }]);
      return;
    }
    if (!selectedBathroom) return;
    toggleFavorite.mutate({ bathroomId: selectedBathroom.id });
  };

  const handleReport = () => {
    if (!selectedBathroom) return;
    // Will route to report modal — wired in Section 5
    Alert.alert('Report', 'Report flow coming in Section 5.');
  };

  if (!selectedBathroom) return null;

  const openStatus = isCurrentlyOpen(selectedBathroom.hours_json);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      onClose={handleClose}
      enablePanDownToClose
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      testID={testID}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header} testID="detail-header">
          <View style={styles.headerText}>
            <Text style={styles.placeName} numberOfLines={2} testID="detail-place-name">
              {selectedBathroom.place_name}
            </Text>
            <Text style={styles.address} testID="detail-address">
              {[selectedBathroom.address_line1, selectedBathroom.city, selectedBathroom.state]
                .filter(Boolean)
                .join(', ')}
            </Text>
          </View>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            testID="detail-close"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Badges row ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.badgeScroll}
          contentContainerStyle={styles.badgeRow}
        >
          <Badge
            label={formatDistance(selectedBathroom.distance_meters)}
            emoji="📍"
            color="#2563eb"
            bgColor="#eff6ff"
            testID="badge-distance"
          />
          {openStatus === true  && <Badge label="Open Now"   emoji="🟢" color="#15803d" bgColor="#dcfce7" testID="badge-open" />}
          {openStatus === false && <Badge label="Closed"     emoji="🔴" color="#dc2626" bgColor="#fee2e2" testID="badge-closed" />}
          {selectedBathroom.is_accessible     && <Badge label="Accessible"     emoji="♿" color="#7c3aed" bgColor="#ede9fe" testID="badge-accessible" />}
          {selectedBathroom.is_customer_only  && <Badge label="Customers Only" emoji="🛒" color="#d97706" bgColor="#fef3c7" testID="badge-customer-only" />}
          {selectedBathroom.is_locked === false && <Badge label="No Lock"      emoji="🔓" color="#16a34a" bgColor="#dcfce7" testID="badge-no-lock" />}
        </ScrollView>

        {/* ── Action row ── */}
        <View style={styles.actionRow}>
          <NavigateButton
            latitude={selectedBathroom.latitude}
            longitude={selectedBathroom.longitude}
            placeName={selectedBathroom.place_name}
            testID="navigate-button"
          />

          <TouchableOpacity
            style={[
              styles.iconButton,
              detail?.is_favorited && styles.iconButtonActive,
            ]}
            onPress={handleFavorite}
            disabled={toggleFavorite.isPending}
            testID="favorite-button"
          >
            <Text style={styles.iconButtonEmoji}>
              {detail?.is_favorited ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleReport}
            testID="report-button"
          >
            <Text style={styles.iconButtonEmoji}>🚩</Text>
          </TouchableOpacity>
        </View>

        {/* ── Codes section ── */}
        <View style={styles.section} testID="detail-codes">
          <Text style={styles.sectionTitle}>Access Codes</Text>

          {isLoading && (
            <ActivityIndicator color="#2563eb" style={styles.loader} testID="detail-loading" />
          )}

          {!isLoading && detail?.codes && detail.codes.length > 0 && (
            detail.codes.map((code) => (
              <CodeRevealCard
                key={code.id}
                code={code}
                bathroomId={selectedBathroom.id}
                testID={`code-card-${code.id}`}
              />
            ))
          )}

          {!isLoading && (!detail?.codes || detail.codes.length === 0) && (
            <View style={styles.emptyState} testID="no-codes-state">
              <Text style={styles.emptyEmoji}>🔒</Text>
              <Text style={styles.emptyText}>No codes yet</Text>
              <Text style={styles.emptySubtext}>
                Know the code? Tap below to share it.
              </Text>
            </View>
          )}

          {/* Submit code CTA */}
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.submitCodeButton}
              onPress={() => Alert.alert('Submit Code', 'Code submission modal — Section 5.')}
              testID="submit-code-button"
            >
              <Text style={styles.submitCodeText}>+ Submit a code</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Photos section ── */}
        <View style={styles.section} testID="detail-photos">
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <PhotoUploadButton
              bathroomId={selectedBathroom.id}
              testID="photo-upload-button"
            />
          </View>
          <PhotoGallery
            bathroomId={selectedBathroom.id}
            testID="photo-gallery"
          />
        </View>

        {/* ── Cleanliness ── */}
        {detail && (
          <View style={styles.section} testID="detail-cleanliness">
            <Text style={styles.sectionTitle}>Cleanliness</Text>
            <Text style={styles.cleanlinessValue} testID="cleanliness-avg">
              {detail.cleanliness_avg !== null
                ? `${'⭐'.repeat(Math.round(detail.cleanliness_avg))} ${detail.cleanliness_avg.toFixed(1)} / 5`
                : 'No ratings yet'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPad} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// ─── Badge chip ───────────────────────────────────────────────────────────────

function Badge({
  label, emoji, color, bgColor, testID,
}: { label: string; emoji: string; color: string; bgColor: string; testID?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]} testID={testID}>
      <Text style={styles.badgeEmoji}>{emoji}</Text>
      <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBg:  { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle:   { backgroundColor: '#d1d5db', width: 40 },
  scroll:   { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 60 },
  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    marginBottom:   12,
    gap:            8,
  },
  headerText:  { flex: 1 },
  placeName:   { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  address:     { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  closeButton: {
    width:          36,
    height:         36,
    borderRadius:   18,
    backgroundColor: '#f1f5f9',
    alignItems:     'center',
    justifyContent: 'center',
  },
  closeIcon: { fontSize: 14, color: '#374151', fontWeight: '700' },
  // Badges
  badgeScroll: { marginBottom: 12 },
  badgeRow:    { flexDirection: 'row', gap: 6, paddingRight: 4 },
  badge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
  },
  badgeEmoji: { fontSize: 12 },
  badgeLabel: { fontSize: 12, fontWeight: '600' },
  // Actions
  actionRow: {
    flexDirection:  'row',
    gap:            8,
    marginBottom:   20,
    alignItems:     'center',
  },
  iconButton: {
    width:           46,
    height:          46,
    borderRadius:    10,
    backgroundColor: '#f1f5f9',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     '#e2e8f0',
  },
  iconButtonActive: {
    backgroundColor: '#fff1f2',
    borderColor:     '#fda4af',
  },
  iconButtonEmoji: { fontSize: 22 },
  // Sections
  section:      { marginBottom: 24 },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  loader:       { paddingVertical: 20 },
  // Empty state
  emptyState: {
    alignItems:    'center',
    paddingVertical: 24,
    backgroundColor: '#f8fafc',
    borderRadius:  12,
    marginBottom:  12,
  },
  emptyEmoji:   { fontSize: 36, marginBottom: 8 },
  emptyText:    { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 24 },
  // Submit code
  submitCodeButton: {
    borderWidth:     1.5,
    borderColor:     '#2563eb',
    borderStyle:     'dashed',
    borderRadius:    10,
    paddingVertical: 12,
    alignItems:      'center',
    marginTop:       8,
  },
  submitCodeText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
  // Cleanliness
  cleanlinessValue: { fontSize: 16, color: '#374151' },
  bottomPad: { height: 20 },
});
```

---

## 10. Component — `src/components/map/index.ts`

```typescript
export { BathroomMarker }       from './BathroomMarker';
export { BathroomDetailSheet }  from './BathroomDetailSheet';
export { FilterSheet }          from './FilterSheet';
export { MapControls }          from './MapControls';
export { NavigateButton }       from './NavigateButton';
```

---

## 11. `app/(tabs)/index.tsx` — FULL REPLACEMENT (Phase 4 Map Tab)

```typescript
import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView as RNMapView, {
  Region,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useMapStore } from '@/stores/map.store';
import { useNearbyBathrooms, LOCATION_DENIED_ERROR } from '@/hooks/useNearbyBathrooms';
import { analytics } from '@/lib/analytics';
import {
  BathroomMarker,
  BathroomDetailSheet,
  FilterSheet,
  MapControls,
} from '@/components/map';
import type { NearbyBathroom } from '@/types';

// Android uses Google Maps; iOS uses Apple Maps (no API key required for default)
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

export default function MapTab() {
  const mapRef = useRef<RNMapView>(null);

  const {
    region,
    setRegion,
    selectedBathroomId,
    setSelectedBathroom,
    setFilterSheetOpen,
  } = useMapStore();

  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Query using current map center (or device location on first load)
  const {
    data: bathrooms,
    isLoading,
    isError,
    error,
    refetch,
  } = useNearbyBathrooms(
    mapCenter
      ? { centerLat: mapCenter.lat, centerLng: mapCenter.lng }
      : {},
  );

  const selectedBathroom: NearbyBathroom | null =
    bathrooms?.find((b) => b.id === selectedBathroomId) ?? null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Denied',
          'Enable location access in Settings to find nearby bathrooms.',
          [{ text: 'OK' }],
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion: Region = {
        latitude:      pos.coords.latitude,
        longitude:     pos.coords.longitude,
        latitudeDelta:  0.01,
        longitudeDelta: 0.01,
      };

      mapRef.current?.animateToRegion(newRegion, 600);
      setRegion(newRegion);
      setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      analytics.track('onboarding_location_granted');
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  }, [setRegion]);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    setRegion(r);
    // Update map center for re-querying when user pans significantly
    setMapCenter({ lat: r.latitude, lng: r.longitude });
  }, [setRegion]);

  const handleMarkerPress = useCallback((id: string) => {
    setSelectedBathroom(id);
    analytics.track('map_bathroom_tapped');
  }, [setSelectedBathroom]);

  const handleDetailClose = useCallback(() => {
    setSelectedBathroom(null);
  }, [setSelectedBathroom]);

  const handleAddBathroom = useCallback(() => {
    // Wired to add-bathroom modal in Section 8 (Add Bathroom flow)
    Alert.alert('Add Bathroom', 'Add Bathroom flow coming in Section 8.');
  }, []);

  // ── Error / Permission states ────────────────────────────────────────────────

  const isLocationDenied = isError && error?.message === LOCATION_DENIED_ERROR;

  return (
    <View style={styles.container} testID="map-tab">
      {/* ── Map ── */}
      <RNMapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}   // We have our own
        showsCompass
        clusteringEnabled               // react-native-maps 1.18 native clustering
        clusterColor="#2563eb"
        testID="map-view"
      >
        {bathrooms?.map((bathroom) => (
          <BathroomMarker
            key={bathroom.id}
            bathroom={bathroom}
            selected={bathroom.id === selectedBathroomId}
            onPress={handleMarkerPress}
          />
        ))}
      </RNMapView>

      {/* ── Loading overlay (initial load only) ── */}
      {isLoading && !bathrooms && (
        <View style={styles.loadingOverlay} testID="map-loading">
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loadingText}>Finding bathrooms…</Text>
          </View>
        </View>
      )}

      {/* ── Location denied banner ── */}
      {isLocationDenied && (
        <SafeAreaView
          style={styles.bannerWrapper}
          edges={['top']}
          testID="location-denied-banner"
        >
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              📍 Location access needed to find bathrooms near you
            </Text>
            <TouchableOpacity onPress={handleLocateMe}>
              <Text style={styles.bannerAction}>Enable</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* ── Bathroom count chip ── */}
      {bathrooms && bathrooms.length > 0 && (
        <View style={styles.countChip} testID="bathroom-count">
          <Text style={styles.countText}>
            {bathrooms.length} bathrooms nearby
          </Text>
        </View>
      )}

      {/* ── Map controls (FABs) ── */}
      <MapControls
        onLocateMe={handleLocateMe}
        onAddBathroom={handleAddBathroom}
        isLocating={isLocating}
        testID="map-controls"
      />

      {/* ── Detail bottom sheet ── */}
      <BathroomDetailSheet
        selectedBathroom={selectedBathroom}
        onClose={handleDetailClose}
        testID="detail-sheet"
      />

      {/* ── Filter bottom sheet ── */}
      <FilterSheet testID="filter-sheet" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },
  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     'center',
    justifyContent: 'center',
    pointerEvents:  'none',
  },
  loadingPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    backgroundColor:   'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical:   10,
    borderRadius:      999,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.1,
    shadowRadius:      6,
    elevation:         4,
  },
  loadingText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  // Banner
  bannerWrapper: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
  },
  banner: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   '#1e293b',
    marginHorizontal:  12,
    marginTop:         8,
    padding:           12,
    borderRadius:      10,
  },
  bannerText:   { flex: 1, color: '#e2e8f0', fontSize: 13, lineHeight: 18 },
  bannerAction: { color: '#60a5fa', fontWeight: '700', fontSize: 13, marginLeft: 12 },
  // Count chip
  countChip: {
    position:          'absolute',
    top:               Platform.OS === 'ios' ? 60 : 16,
    alignSelf:         'center',
    backgroundColor:   'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderRadius:      999,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 1 },
    shadowOpacity:     0.08,
    shadowRadius:      4,
    elevation:         3,
  },
  countText: { fontSize: 12, color: '#374151', fontWeight: '600' },
});
```

---

## 12. `app/(tabs)/_layout.tsx` — MODIFIED (real icons + profile tab auth guard)

```typescript
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown:           false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle:           styles.tabBar,
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={95} style={StyleSheet.absoluteFill} />
          ) : null,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'map' : 'map-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'search' : 'search-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'heart' : 'heart-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={isAuthenticated
                ? (focused ? 'person' : 'person-outline')
                : (focused ? 'person-circle' : 'person-circle-outline')}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          title:   'Business',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: IoniconsName; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

const styles = StyleSheet.create({
  tabBar: {
    position:     'absolute',
    borderTopWidth: 0,
    elevation:    0,
    height:       Platform.OS === 'ios' ? 88 : 62,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.97)' : 'transparent',
  },
  tabLabel: {
    fontSize:   11,
    fontWeight: '500',
  },
});
```

---

# Validation Block — SDET

## `src/hooks/__tests__/useNearbyBathrooms.test.ts`

```typescript
jest.mock('@/lib/supabase',     () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',       () => ({ captureException: jest.fn() }));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync:           jest.fn().mockResolvedValue({
    coords: { latitude: 47.6062, longitude: -122.3321, accuracy: 10 },
  }),
  Accuracy: { Balanced: 3 },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn(() => Promise.resolve(null)),
  setItem:    jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useNearbyBathrooms,
  LOCATION_DENIED_ERROR,
} from '@/hooks/useNearbyBathrooms';
import { supabase, resetSupabaseMocks } from 'src/__mocks__/supabase';
import * as Location from 'expo-location';
import { useMapStore } from '@/stores/map.store';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const mockBathroom = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  place_name: 'Test Bathroom', address_line1: '123 Main St',
  city: 'Seattle', state: 'WA', latitude: 47.6062, longitude: -122.3321,
  is_locked: false, is_accessible: true, is_customer_only: false,
  hours_json: null, distance_meters: 150, has_code: true,
  confidence_score: 85, last_verified_at: new Date().toISOString(),
};

describe('useNearbyBathrooms', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    useMapStore.getState().resetFilters();
  });

  it('returns bathrooms on success', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [mockBathroom], error: null });

    const { result } = renderHook(() => useNearbyBathrooms(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].place_name).toBe('Test Bathroom');
  });

  it('throws LOCATION_DENIED when permission denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock)
      .mockResolvedValueOnce({ status: 'denied' });

    const { result } = renderHook(() => useNearbyBathrooms(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(LOCATION_DENIED_ERROR);
  });

  it('does not retry on LOCATION_DENIED error', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock)
      .mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useNearbyBathrooms(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // RPC should only be called once (no retries)
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('uses provided centerLat/centerLng instead of device location', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    renderHook(
      () => useNearbyBathrooms({ centerLat: 37.7749, centerLng: -122.4194 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith(
      'get_nearby_bathrooms',
      expect.objectContaining({ user_lat: 37.7749, user_lng: -122.4194 }),
    ));
    // Location.getCurrentPositionAsync should NOT be called
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('filters out non-accessible bathrooms when accessibleOnly=true', async () => {
    const inaccessible = { ...mockBathroom, id: 'id-2', is_accessible: false };
    supabase.rpc.mockResolvedValueOnce({
      data: [mockBathroom, inaccessible],
      error: null,
    });

    useMapStore.getState().setFilter('accessibleOnly', true);

    const { result } = renderHook(
      () => useNearbyBathrooms({ centerLat: 47.6, centerLng: -122.3 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].is_accessible).toBe(true);
  });

  it('filters out locked bathrooms when noCodeRequired=true', async () => {
    const locked = { ...mockBathroom, id: 'id-3', is_locked: true };
    supabase.rpc.mockResolvedValueOnce({
      data: [mockBathroom, locked],
      error: null,
    });

    useMapStore.getState().setFilter('noCodeRequired', true);

    const { result } = renderHook(
      () => useNearbyBathrooms({ centerLat: 47.6, centerLng: -122.3 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.every((b) => !b.is_locked)).toBe(true);
  });
});
```

---

## `src/hooks/__tests__/useBathroomDetail.test.ts`

```typescript
jest.mock('@/lib/supabase',  () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',    () => ({ captureException: jest.fn() }));
jest.mock('@/lib/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/hooks/usePoints', () => ({
  useRecordContribution: () => ({ mutate: jest.fn() }),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBathroomDetail, useToggleFavorite } from '@/hooks/useBathroomDetail';
import { supabase, resetSupabaseMocks } from 'src/__mocks__/supabase';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const BATHROOM_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockDetail = {
  id: BATHROOM_ID, place_name: 'City Hall Bathroom',
  address_line1: '1 City Hall', city: 'Seattle', state: 'WA',
  postal_code: '98104', latitude: 47.6062, longitude: -122.3321,
  is_locked: true, is_accessible: true, is_customer_only: false,
  hours_json: null, updated_at: new Date().toISOString(),
  codes: [], cleanliness_avg: 4.2, open_report_count: 0, is_favorited: false,
};

describe('useBathroomDetail', () => {
  beforeEach(() => resetSupabaseMocks());

  it('returns bathroom detail on success', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: mockDetail, error: null });

    const { result } = renderHook(
      () => useBathroomDetail(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.place_name).toBe('City Hall Bathroom');
    expect(result.current.data?.cleanliness_avg).toBe(4.2);
  });

  it('is disabled when bathroomId is null', () => {
    const { result } = renderHook(
      () => useBathroomDetail(null),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('throws on not_found error from RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { error: 'not_found' },
      error: null,
    });

    const { result } = renderHook(
      () => useBathroomDetail(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('not_found');
  });
});

describe('useToggleFavorite', () => {
  beforeEach(() => resetSupabaseMocks());

  it('calls toggle_favorite RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { success: true, favorited: true },
      error: null,
    });

    const { result } = renderHook(() => useToggleFavorite(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ bathroomId: BATHROOM_ID });
    });

    expect(supabase.rpc).toHaveBeenCalledWith('toggle_favorite', {
      p_bathroom_id: BATHROOM_ID,
    });
  });
});
```

---

## `src/components/map/__tests__/BathroomMarker.test.tsx`

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BathroomMarker } from '../BathroomMarker';
import type { NearbyBathroom } from '@/types';

// react-native-maps mock
jest.mock('react-native-maps', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default:    ({ children, testID }: any) => <View testID={testID}>{children}</View>,
    Marker:     ({ children, onPress, testID }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID}>{children}</TouchableOpacity>
    ),
    Callout:    ({ children, onPress, testID }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID}>{children}</TouchableOpacity>
    ),
    PROVIDER_GOOGLE:  'google',
    PROVIDER_DEFAULT: null,
  };
});

const freeBathroom: NearbyBathroom = {
  id: 'b-1', place_name: 'Free Bathroom', address_line1: '1 Main',
  city: 'Seattle', state: 'WA', latitude: 47.6, longitude: -122.3,
  is_locked: false, is_accessible: true, is_customer_only: false,
  hours_json: null, distance_meters: 200, has_code: false,
  confidence_score: null, last_verified_at: null,
};

const lockedWithCode: NearbyBathroom = {
  ...freeBathroom, id: 'b-2', is_locked: true, has_code: true, confidence_score: 75,
};

const lockedNoCode: NearbyBathroom = {
  ...freeBathroom, id: 'b-3', is_locked: true, has_code: false,
};

describe('BathroomMarker', () => {
  it('renders green pin for unlocked bathroom', () => {
    const onPress = jest.fn();
    render(<BathroomMarker bathroom={freeBathroom} selected={false} onPress={onPress} />);
    // Pin should show ✓ for free access
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('renders key emoji for locked + code available', () => {
    render(<BathroomMarker bathroom={lockedWithCode} selected={false} onPress={jest.fn()} />);
    expect(screen.getByText('🔑')).toBeTruthy();
  });

  it('renders lock emoji for locked + no code', () => {
    render(<BathroomMarker bathroom={lockedNoCode} selected={false} onPress={jest.fn()} />);
    expect(screen.getByText('🔒')).toBeTruthy();
  });

  it('calls onPress with bathroom id when marker pressed', () => {
    const onPress = jest.fn();
    render(<BathroomMarker bathroom={freeBathroom} selected={false} onPress={onPress} />);
    fireEvent.press(screen.getByTestId(`marker-${freeBathroom.id}`));
    expect(onPress).toHaveBeenCalledWith(freeBathroom.id);
  });

  it('shows accessible badge in callout', () => {
    render(<BathroomMarker bathroom={freeBathroom} selected={false} onPress={jest.fn()} />);
    expect(screen.getByTestId(`callout-${freeBathroom.id}`)).toBeTruthy();
    expect(screen.getByText(/♿/)).toBeTruthy();
  });
});
```

---

## `src/components/map/__tests__/FilterSheet.test.tsx`

```typescript
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn(() => Promise.resolve(null)),
  setItem:    jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = require('react-native');
  const BottomSheet = React.forwardRef(({ children, testID }: any, _ref: any) => (
    <View testID={testID}>{children}</View>
  ));
  return {
    __esModule: true,
    default:    BottomSheet,
    BottomSheetView: ({ children }: any) => <View>{children}</View>,
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FilterSheet } from '../FilterSheet';
import { useMapStore } from '@/stores/map.store';

describe('FilterSheet', () => {
  beforeEach(() => {
    useMapStore.getState().resetFilters();
    useMapStore.setState({ isFilterSheetOpen: true });
  });

  it('renders when isFilterSheetOpen=true', () => {
    render(<FilterSheet testID="filter-sheet" />);
    expect(screen.getByTestId('filter-sheet')).toBeTruthy();
  });

  it('does not render when isFilterSheetOpen=false', () => {
    useMapStore.setState({ isFilterSheetOpen: false });
    render(<FilterSheet testID="filter-sheet" />);
    expect(screen.queryByTestId('filter-sheet')).toBeNull();
  });

  it('toggles openNow filter', () => {
    render(<FilterSheet />);
    fireEvent(screen.getByTestId('filter-open-now-switch'), 'valueChange', true);
    expect(useMapStore.getState().filters.openNow).toBe(true);
  });

  it('toggles accessibleOnly filter', () => {
    render(<FilterSheet />);
    fireEvent(screen.getByTestId('filter-accessible-switch'), 'valueChange', true);
    expect(useMapStore.getState().filters.accessibleOnly).toBe(true);
  });

  it('sets cleanliness rating via pill buttons', () => {
    render(<FilterSheet />);
    fireEvent.press(screen.getByTestId('filter-cleanliness-3'));
    expect(useMapStore.getState().filters.minCleanlinessRating).toBe(3);
  });

  it('reset-filters button clears all filters', () => {
    useMapStore.getState().setFilter('openNow', true);
    useMapStore.getState().setFilter('accessibleOnly', true);

    render(<FilterSheet />);
    fireEvent.press(screen.getByTestId('reset-filters'));

    const filters = useMapStore.getState().filters;
    expect(filters.openNow).toBe(false);
    expect(filters.accessibleOnly).toBe(false);
  });

  it('shows reset button only when filters are active', () => {
    render(<FilterSheet />);
    expect(screen.queryByTestId('reset-filters')).toBeNull();

    useMapStore.getState().setFilter('openNow', true);
    render(<FilterSheet />);
    expect(screen.getByTestId('reset-filters')).toBeTruthy();
  });
});
```

---

## `src/components/map/__tests__/MapControls.test.tsx`

```typescript
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn(() => Promise.resolve(null)),
  setItem:    jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MapControls } from '../MapControls';
import { useMapStore } from '@/stores/map.store';

describe('MapControls', () => {
  const onLocateMe    = jest.fn();
  const onAddBathroom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useMapStore.getState().resetFilters();
  });

  it('calls onLocateMe when locate-me button pressed', () => {
    render(
      <MapControls
        onLocateMe={onLocateMe}
        onAddBathroom={onAddBathroom}
        isLocating={false}
        testID="controls"
      />,
    );
    fireEvent.press(screen.getByTestId('locate-me-button'));
    expect(onLocateMe).toHaveBeenCalled();
  });

  it('shows ActivityIndicator when isLocating=true', () => {
    render(
      <MapControls
        onLocateMe={onLocateMe}
        onAddBathroom={onAddBathroom}
        isLocating
        testID="controls"
      />,
    );
    expect(screen.queryByText('📍')).toBeNull();
  });

  it('calls onAddBathroom when add button pressed', () => {
    render(
      <MapControls
        onLocateMe={onLocateMe}
        onAddBathroom={onAddBathroom}
        isLocating={false}
        testID="controls"
      />,
    );
    fireEvent.press(screen.getByTestId('add-bathroom-button'));
    expect(onAddBathroom).toHaveBeenCalled();
  });

  it('shows active filter dot when filters are set', () => {
    render(
      <MapControls
        onLocateMe={onLocateMe}
        onAddBathroom={onAddBathroom}
        isLocating={false}
        testID="controls"
      />,
    );
    expect(screen.queryByTestId('filter-active-dot')).toBeNull();

    useMapStore.getState().setFilter('openNow', true);
    render(
      <MapControls
        onLocateMe={onLocateMe}
        onAddBathroom={onAddBathroom}
        isLocating={false}
        testID="controls"
      />,
    );
    expect(screen.getByTestId('filter-active-dot')).toBeTruthy();
  });
});
```

---

## Security Validation SQL

```sql
-- ============================================================================
-- Map Features RLS + Security Tests
-- ============================================================================

-- 1. get_nearby_bathrooms: only returns active bathrooms
-- Should never return moderation_status != 'active' rows
select distinct moderation_status
from public.bathrooms
where id in (
  select id from public.get_nearby_bathrooms(47.6062, -122.3321, 10000)
);
-- Expected: only 'active'

-- 2. get_bathroom_detail: returns not_found for hidden bathrooms
-- (Replace with a known 'hidden' bathroom ID)
select public.get_bathroom_detail('00000000-0000-0000-0000-000000000000'::uuid);
-- Expected: {"error": "not_found"}

-- 3. toggle_favorite: unauthenticated → error
-- Run as anon:
select public.toggle_favorite('550e8400-e29b-41d4-a716-446655440000'::uuid);
-- Expected: {"success": false, "error": "not_authenticated"}

-- 4. toggle_favorite: idempotent — calling twice unfavorites
-- Run as authenticated user:
select public.toggle_favorite('VALID-BATHROOM-ID'::uuid);
-- Returns: {"success": true, "favorited": true}
select public.toggle_favorite('VALID-BATHROOM-ID'::uuid);
-- Returns: {"success": true, "favorited": false}

-- 5. GIST index hit verification (run EXPLAIN ANALYZE in Supabase Dashboard)
explain analyze
select public.get_nearby_bathrooms(47.6062, -122.3321, 5000);
-- Look for: "Index Scan using idx_bathrooms_geom" in the plan
-- This confirms PostGIS is using the spatial index, not seq scan
```

---

## Performance Notes

- **`BathroomMarker` is `memo()`-wrapped** — 60 markers means 60 potential re-renders on every map region change. `memo` prevents re-renders unless `bathroom`, `selected`, or `onPress` change. `onPress` uses `useCallback` in the parent. ✅
- **`tracksViewChanges={selected}`** — react-native-maps updates the native marker view every frame when this is `true`. Only the selected marker needs tracking; all others are static. This is the single biggest perf win for map with many markers. ✅
- **`clusteringEnabled`** on react-native-maps 1.18 is native (Mapbox clusters on Android, Apple cluster annotation on iOS). Zero JS thread cost for clustering. ✅
- **`onRegionChangeComplete`** updates `mapCenter` on pan end, triggering a re-query with the new center. This is debounced implicitly by `staleTime: 2min` — if the user pans back before stale time, the cached result is served without a network call. ✅
- **Bottom sheet from `@gorhom/bottom-sheet`** uses Reanimated 2 worklets — all animation runs on the UI thread. No bridge involvement during sheet open/close. ✅
- **Memory leak check** — `BathroomDetailSheet` uses `useEffect` with `selectedBathroom?.id` as dependency. `BottomSheet.snapToIndex` / `.close()` are imperative calls with no listener cleanup needed. ✅

---

## Section 3 Checklist

| Feature | DB | Hook | UI | Tests |
|---------|----|----|------|----|
| `get_nearby_bathrooms` PostGIS RPC | ✅ | ✅ | — | ✅ SQL |
| `get_bathroom_detail` RPC | ✅ | ✅ | — | ✅ |
| `toggle_favorite` RPC | ✅ | ✅ | ✅ | ✅ |
| Color-coded markers (green/yellow/red) | — | — | ✅ | ✅ |
| Bottom sheet detail card | — | — | ✅ | — |
| Filter sheet (all 4 filters) | — | — | ✅ | ✅ |
| Navigate (Apple/Google/Waze deep link) | — | — | ✅ | — |
| Map controls FABs | — | — | ✅ | ✅ |
| `app/(tabs)/index.tsx` Phase 4 | — | — | ✅ | — |
| Real Ionicons tab icons | — | — | ✅ | — |
| Location permission handling | — | ✅ | ✅ | ✅ |
| Native map clustering | — | — | ✅ | — |

**Section 3: The Map Tab is complete. Say "Next" for Section 4: Push Notifications + Supabase Realtime, or "Integrated" to verify first.**

## Assistant (commentary)

`2026-03-16T08:26:40.532Z`

I’ve compared the sample against the code that’s actually in this workspace. The main gaps are architectural conflicts, not missing features, so I’m pulling exact file references before I summarize what’s worth adopting and what would regress the current stack.

## Assistant (final_answer)

`2026-03-16T08:27:37.105Z`

**Findings**
- `[P1]` I would not adopt the sample’s `get_bathroom_detail` / `toggle_favorite` approach verbatim because it cuts across the trust and offline guarantees already in this repo. Current code reveal access is server-gated in [access-codes.ts](/C:/Users/T/Desktop/PeeDom/src/api/access-codes.ts#L48) and favorites already handle auth, optimistic updates, and offline queue fallback in [useFavorites.ts](/C:/Users/T/Desktop/PeeDom/src/hooks/useFavorites.ts#L163). The sample’s direct detail RPC and raw favorite toggle would regress those paths.

- `[P1]` The sample assumes an `analytics.track(...)` client that does not exist here. The actual analytics surface only exports `trackAnalyticsEvent(...)` and a small fixed event set in [analytics.ts](/C:/Users/T/Desktop/PeeDom/src/lib/analytics.ts#L12). That sample code would fail against the current module.

- `[P2]` The sample introduces a parallel map store design that conflicts with the repo’s existing split between map region state and filter state. The live store shapes are in [useMapStore.ts](/C:/Users/T/Desktop/PeeDom/src/store/useMapStore.ts#L5) and [useFilterStore.ts](/C:/Users/T/Desktop/PeeDom/src/store/useFilterStore.ts#L4). Copying `src/stores/map.store.ts` / `accessibleOnly` / `setFilterSheetOpen` from the sample would fork state instead of integrating with current map and search flows.

- `[P2]` Its install/prebuild instructions are stale for this workspace. `@gorhom/bottom-sheet` is already present in [package.json](/C:/Users/T/Desktop/PeeDom/package.json#L22), and a blind `expo prebuild --clean` would just churn generated native files without being required for the code now in place.

- `[P2]` The sample’s UI test suite does not match this repo’s current Jest harness. The workspace is still `ts-jest` with `node` test environment in [jest.config.js](/C:/Users/T/Desktop/PeeDom/jest.config.js#L1), so those React Native component tests would need a test-stack upgrade before they become runnable.

- `[P2]` The pasted sample still contains placeholders like “coming in Section 5/8.” That directly violates the repo’s zero-placeholder rule, so I’d treat it as reference material, not merge-ready code.

**Useful Parts**
- The multi-app navigation chooser idea is good. Our current map tab uses Apple Maps / Google navigation / browser fallback in [index.tsx](/C:/Users/T/Desktop/PeeDom/app/(tabs)/index.tsx#L170); adding explicit Waze and Google Maps chooser UX would be a worthwhile follow-up.
- The sample’s component decomposition is fine conceptually, but we already covered the same surface in the current implementation with [MapView.tsx](/C:/Users/T/Desktop/PeeDom/src/components/MapView.tsx#L1), [MapDetailSheetCard.tsx](/C:/Users/T/Desktop/PeeDom/src/components/MapDetailSheetCard.tsx), and [MapFilterDrawer.tsx](/C:/Users/T/Desktop/PeeDom/src/components/MapFilterDrawer.tsx).
- As a spec, it’s useful for feature parity checking. As code, it’s not a clean fit for this repository.

Net: good reference, not good drop-in. The two pieces worth lifting later are the app chooser for navigation and a broader RN UI test harness.

## User

`2026-03-16T11:46:43.008Z`

next section

## Assistant (commentary)

`2026-03-16T11:47:06.337Z`

Proceeding to Section 4 as Push Notifications plus the real-time plumbing they depend on. I’m checking the current notification, realtime, and profile schema surfaces first so I can land this without breaking the existing Supabase/auth architecture.

## Assistant (commentary)

`2026-03-16T11:48:14.569Z`

The notification foundation is going to touch schema, app config, and profile UI together, so I’m checking the current profile screen and route patterns before I wire registration and preferences. The goal is a real opt-in flow, not an automatic permission prompt on app launch.

## User

`2026-03-16T11:48:17.011Z`

Clean. No conflicts. Beginning output.

---

# Section 4: Push Notifications + Supabase Realtime

## Terminal Commands

```bash
npx expo install expo-notifications expo-device
```

---

## 1. Database — `supabase/migrations/006_notifications_realtime.sql`

```sql
-- ============================================================================
-- PeeDom Notifications & Realtime Migration
-- 006_notifications_realtime.sql
-- ============================================================================

-- ─── Push token + notification prefs on profiles ─────────────────────────────

alter table public.profiles
  add column if not exists push_token        text,
  add column if not exists push_enabled      boolean not null default true,
  add column if not exists notification_prefs jsonb   not null default '{
    "code_verified":    true,
    "favorite_update":  true,
    "nearby_new":       false,
    "streak_reminder":  true
  }'::jsonb;

create index if not exists idx_profiles_push_token
  on public.profiles(push_token)
  where push_token is not null;

-- ─── Push subscriptions ───────────────────────────────────────────────────────
-- Which users want alerts for which bathrooms (their favorites).
-- Populated automatically when a user favorites a bathroom.

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  unique (user_id, bathroom_id)
);

create index if not exists idx_push_subs_bathroom
  on public.push_subscriptions(bathroom_id);
create index if not exists idx_push_subs_user
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subs_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subs_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subs_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- ─── Auto-subscribe on favorite, auto-unsubscribe on unfavorite ──────────────

create or replace function public.sync_push_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.push_subscriptions (user_id, bathroom_id)
    values (new.user_id, new.bathroom_id)
    on conflict do nothing;
    return new;
  elsif TG_OP = 'DELETE' then
    delete from public.push_subscriptions
    where user_id = old.user_id and bathroom_id = old.bathroom_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_favorite_change
  after insert or delete on public.favorites
  for each row execute function public.sync_push_subscription();

-- ─── Bathroom status events ───────────────────────────────────────────────────
-- Short-lived crowd-sourced status reports (2hr expiry).
-- Drives the live status banner in the detail sheet.

create type public.bathroom_live_status as enum (
  'clean', 'dirty', 'closed', 'out_of_order', 'long_wait'
);

create table if not exists public.bathroom_status_events (
  id          uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  status      public.bathroom_live_status not null,
  note        text,
  expires_at  timestamptz not null default (now() + interval '2 hours'),
  created_at  timestamptz not null default now()
);

create index if not exists idx_status_events_bathroom
  on public.bathroom_status_events(bathroom_id, expires_at desc);

alter table public.bathroom_status_events enable row level security;

create policy "status_events_select_active"
  on public.bathroom_status_events for select
  using (expires_at > now());

create policy "status_events_insert_authenticated"
  on public.bathroom_status_events for insert
  with check (auth.uid() = reported_by);

-- ─── Realtime: enable for the tables we subscribe to ─────────────────────────
-- Run in Supabase Dashboard → Database → Replication → Enable these tables:
-- bathroom_access_codes, bathroom_status_events
-- (or execute via supabase CLI: supabase db push after enabling in dashboard)

-- ─── RPC: register_push_token ────────────────────────────────────────────────

create or replace function public.register_push_token(
  p_token text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set push_token   = p_token,
      push_enabled = true,
      updated_at   = now()
  where id = auth.uid();
$$;

-- ─── RPC: deregister_push_token ──────────────────────────────────────────────

create or replace function public.deregister_push_token()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set push_token   = null,
      push_enabled = false,
      updated_at   = now()
  where id = auth.uid();
$$;

-- ─── RPC: get_subscribers_for_bathroom ───────────────────────────────────────
-- Called by Edge Functions (service role) to get push tokens for a bathroom.

create or replace function public.get_subscribers_for_bathroom(
  p_bathroom_id uuid
)
returns table (
  user_id    uuid,
  push_token text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.push_token
  from public.push_subscriptions ps
  join public.profiles p on p.id = ps.user_id
  where ps.bathroom_id = p_bathroom_id
    and p.push_token   is not null
    and p.push_enabled = true
    and (p.notification_prefs->>'favorite_update')::boolean = true;
$$;

-- ─── RPC: report_bathroom_status ─────────────────────────────────────────────

create or replace function public.report_bathroom_status(
  p_bathroom_id uuid,
  p_status      text,
  p_note        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  -- Rate limit: 1 status report per user per bathroom per 30 min
  if exists (
    select 1 from public.bathroom_status_events
    where bathroom_id = p_bathroom_id
      and reported_by = auth.uid()
      and created_at > now() - interval '30 minutes'
  ) then
    return jsonb_build_object('success', false, 'error', 'rate_limited');
  end if;

  insert into public.bathroom_status_events
    (bathroom_id, reported_by, status, note)
  values
    (p_bathroom_id, auth.uid(), p_status::public.bathroom_live_status, p_note);

  return jsonb_build_object('success', true);
end;
$$;
```

---

## 2. Edge Function — `supabase/functions/send-push-notification/index.ts`

```typescript
// Deploy: supabase functions deploy send-push-notification
// Called internally by other Edge Functions — not exposed publicly.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface PushPayload {
  tokens:   string[];
  title:    string;
  body:     string;
  data?:    Record<string, string>;
  badge?:   number;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendExpoPushMessages(payload: PushPayload) {
  const messages = payload.tokens.map((to) => ({
    to,
    title:    payload.title,
    body:     payload.body,
    data:     payload.data  ?? {},
    badge:    payload.badge ?? 0,
    sound:    'default',
    priority: 'high',
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method:  'POST',
    headers: {
      'Accept':       'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push failed: ${response.status} ${text}`);
  }

  const result = await response.json();

  // Log delivery receipts for invalid/inactive tokens
  const invalidTokens: string[] = [];
  for (const ticket of result.data ?? []) {
    if (ticket.status === 'error') {
      const detail = ticket.details?.error;
      // DeviceNotRegistered = token is stale, should be removed from DB
      if (detail === 'DeviceNotRegistered' || detail === 'InvalidCredentials') {
        const idx = result.data.indexOf(ticket);
        if (idx >= 0 && payload.tokens[idx]) {
          invalidTokens.push(payload.tokens[idx]);
        }
      }
    }
  }

  return { tickets: result.data, invalidTokens };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const payload: PushPayload = await req.json();

    if (!payload.tokens?.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No tokens provided' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Only send to valid Expo push tokens
    const validTokens = payload.tokens.filter((t) =>
      t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['),
    );

    if (!validTokens.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No valid Expo tokens' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { tickets, invalidTokens } = await sendExpoPushMessages({
      ...payload,
      tokens: validTokens,
    });

    // Clean up stale tokens from DB
    if (invalidTokens.length > 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } },
      );
      await supabase
        .from('profiles')
        .update({ push_token: null, push_enabled: false })
        .in('push_token', invalidTokens);

      console.log(`[push] Cleaned ${invalidTokens.length} stale tokens`);
    }

    return new Response(
      JSON.stringify({ success: true, sent: validTokens.length, tickets }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[push] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
```

---

## 3. Edge Function — `supabase/functions/notify-favorite-update/index.ts`

```typescript
// Deploy: supabase functions deploy notify-favorite-update
// Trigger: Database webhook on bathroom_access_codes INSERT
// (Configure in Supabase Dashboard → Database → Webhooks)
//
// Webhook config:
//   Table: bathroom_access_codes
//   Events: INSERT
//   URL: https://<project>.supabase.co/functions/v1/notify-favorite-update
//   Headers: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type:   'INSERT' | 'UPDATE' | 'DELETE';
  table:  string;
  record: {
    id:          string;
    bathroom_id: string;
    submitted_by: string;
    code_value:  string;
  };
  old_record: null | Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only process new code submissions
    if (payload.type !== 'INSERT' || payload.table !== 'bathroom_access_codes') {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const bathroomId = payload.record.bathroom_id;

    // Get bathroom name
    const { data: bathroom } = await supabase
      .from('bathrooms')
      .select('place_name')
      .eq('id', bathroomId)
      .single();

    if (!bathroom) {
      return new Response(JSON.stringify({ error: 'Bathroom not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get subscribers' push tokens (excluding the submitter)
    const { data: subscribers } = await supabase.rpc(
      'get_subscribers_for_bathroom',
      { p_bathroom_id: bathroomId },
    );

    const tokens = (subscribers ?? [])
      .filter((s: { user_id: string; push_token: string }) =>
        s.user_id !== payload.record.submitted_by && s.push_token,
      )
      .map((s: { push_token: string }) => s.push_token);

    if (!tokens.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Call send-push-notification function
    const pushResponse = await supabase.functions.invoke('send-push-notification', {
      body: {
        tokens,
        title: `New code for ${bathroom.place_name}`,
        body:  'A new access code was just submitted for one of your saved bathrooms.',
        data:  {
          type:        'new_code',
          bathroom_id: bathroomId,
          route:       `/bathroom/${bathroomId}`,
        },
      },
    });

    console.log(`[notify-favorite] Notified ${tokens.length} subscribers for ${bathroomId}`);

    return new Response(
      JSON.stringify({ success: true, sent: tokens.length, result: pushResponse.data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[notify-favorite] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
```

---

## 4. Types — additions to `src/types/index.ts`

```typescript
// ============================================================================
// PUSH NOTIFICATION & REALTIME TYPES
// ============================================================================

export type NotificationType =
  | 'new_code'
  | 'code_verified'
  | 'nearby_new'
  | 'streak_reminder'
  | 'badge_earned'
  | 'favorite_update';

export interface NotificationData {
  type:         NotificationType;
  bathroom_id?: string;
  route?:       string;
  badge_id?:    string;
}

export interface NotificationPrefs {
  code_verified:   boolean;
  favorite_update: boolean;
  nearby_new:      boolean;
  streak_reminder: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  code_verified:   true,
  favorite_update: true,
  nearby_new:      false,
  streak_reminder: true,
};

// ─── Realtime ─────────────────────────────────────────────────────────────────

export type BathroomLiveStatus =
  | 'clean'
  | 'dirty'
  | 'closed'
  | 'out_of_order'
  | 'long_wait';

export interface BathroomStatusEvent {
  id:          string;
  bathroom_id: string;
  reported_by: string;
  status:      BathroomLiveStatus;
  note:        string | null;
  expires_at:  string;
  created_at:  string;
}

export interface RealtimeCodeUpdate {
  id:               string;
  bathroom_id:      string;
  code_value:       string;
  confidence_score: number;
  up_votes:         number;
  down_votes:       number;
  last_verified_at: string | null;
  visibility_status: string;
  lifecycle_status:  string;
}

export function getStatusLabel(status: BathroomLiveStatus): string {
  switch (status) {
    case 'clean':       return '✨ Recently cleaned';
    case 'dirty':       return '⚠️ Reported dirty';
    case 'closed':      return '🚫 Reported closed';
    case 'out_of_order': return '🔧 Out of order';
    case 'long_wait':   return '⏳ Long wait';
  }
}

export function getStatusColor(status: BathroomLiveStatus): string {
  switch (status) {
    case 'clean':        return '#16a34a';
    case 'dirty':        return '#d97706';
    case 'closed':       return '#dc2626';
    case 'out_of_order': return '#7c3aed';
    case 'long_wait':    return '#0891b2';
  }
}

export function getStatusBg(status: BathroomLiveStatus): string {
  switch (status) {
    case 'clean':        return '#dcfce7';
    case 'dirty':        return '#fef3c7';
    case 'closed':       return '#fee2e2';
    case 'out_of_order': return '#ede9fe';
    case 'long_wait':    return '#cffafe';
  }
}
```

Also add to `database.ts` Tables:

```typescript
push_subscriptions: {
  Row: {
    id: string; user_id: string; bathroom_id: string; subscribed_at: string;
  };
  Insert: { id?: string; user_id: string; bathroom_id: string; subscribed_at?: string; };
  Update: Record<string, never>;
};
bathroom_status_events: {
  Row: {
    id: string; bathroom_id: string; reported_by: string;
    status: string; note: string | null; expires_at: string; created_at: string;
  };
  Insert: {
    id?: string; bathroom_id: string; reported_by: string;
    status: string; note?: string | null; expires_at?: string; created_at?: string;
  };
  Update: { note?: string | null; };
};
```

---

## 5. `src/lib/push-notifications.ts` — NEW

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { analytics } from '@/lib/analytics';
import type { NotificationData } from '@/types';

// ─── Configure foreground behavior ────────────────────────────────────────────
// Show notifications even when app is in foreground

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ─── Token Registration ────────────────────────────────────────────────────────

/**
 * Request permission and register push token with Supabase.
 * Call once after authentication, and on every app foreground after token refresh.
 *
 * Returns the token string or null if permission denied / not a device.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators cannot receive push notifications
    if (__DEV__) console.log('[Push] Skipping — not a physical device');
    return null;
  }

  try {
    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:           'PeeDom Alerts',
        importance:     Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:     '#2563eb',
        showBadge:      true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      analytics.track('onboarding_notifications_denied');
      return null;
    }

    analytics.track('onboarding_notifications_granted');

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });

    const token = tokenData.data;

    // Persist token to Supabase
    const { error } = await supabase.rpc('register_push_token', { p_token: token });
    if (error) {
      captureException(error, { context: 'registerPushToken' });
    }

    return token;
  } catch (error) {
    captureException(error, { context: 'registerPushToken' });
    return null;
  }
}

/**
 * Remove push token from Supabase on sign-out.
 */
export async function deregisterPushToken(): Promise<void> {
  try {
    await supabase.rpc('deregister_push_token');
  } catch (error) {
    captureException(error, { context: 'deregisterPushToken' });
  }
}

// ─── Notification routing ─────────────────────────────────────────────────────

type RouterPush = (route: string) => void;

/**
 * Handle a tap on a notification.
 * Extracts the route from notification data and pushes to it.
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  push: RouterPush,
): void {
  const data = response.notification.request.content.data as NotificationData | undefined;

  if (!data?.route) return;

  // Small delay allows navigation stack to be ready
  setTimeout(() => {
    try {
      push(data.route!);
    } catch (err) {
      captureException(err, { context: 'handleNotificationResponse', route: data.route });
    }
  }, 300);
}

/**
 * Set up notification response listener.
 * Returns the cleanup function — call in useEffect return.
 */
export function setupNotificationListener(push: RouterPush): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => handleNotificationResponse(response, push),
  );
  return () => subscription.remove();
}

/**
 * Clear the app badge count (call on app foreground).
 */
export async function clearBadgeCount(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // Non-critical — ignore on platforms that don't support badge
  }
}
```

---

## 6. `src/hooks/usePushNotifications.ts` — NEW

```typescript
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import {
  registerPushToken,
  deregisterPushToken,
  setupNotificationListener,
  clearBadgeCount,
} from '@/lib/push-notifications';
import { useSessionStore } from '@/stores/session.store';
import { captureException } from '@/lib/sentry';

/**
 * Top-level push notification hook.
 * Mount once in app/_layout.tsx (inside AuthProvider).
 *
 * Responsibilities:
 * 1. Register token when user becomes authenticated
 * 2. Deregister token on sign-out (handled via session watcher)
 * 3. Handle notification taps → route to the correct screen
 * 4. Clear badge on app foreground
 */
export function usePushNotifications(): void {
  const router        = useRouter();
  const { isAuthenticated, sessionStatus } = useSessionStore();
  const prevAuthRef   = useRef<boolean>(false);

  // ── Token registration/deregistration on auth state change ────────────────
  useEffect(() => {
    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current    = isAuthenticated;

    if (isAuthenticated && !wasAuthenticated) {
      // Just signed in → register
      registerPushToken().catch((err) =>
        captureException(err, { context: 'usePushNotifications/register' }),
      );
    }

    if (!isAuthenticated && wasAuthenticated) {
      // Just signed out → deregister
      deregisterPushToken().catch((err) =>
        captureException(err, { context: 'usePushNotifications/deregister' }),
      );
    }
  }, [isAuthenticated]);

  // ── Notification tap → navigation ─────────────────────────────────────────
  useEffect(() => {
    const cleanup = setupNotificationListener((route) => {
      router.push(route as any);
    });
    return cleanup;
  }, [router]);

  // ── Clear badge when app comes to foreground ───────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          clearBadgeCount();
        }
      },
    );
    return () => subscription.remove();
  }, []);
}
```

---

## 7. `src/hooks/useRealtimeCode.ts` — NEW

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { codeQueryKeys } from '@/hooks/useCodeOperations';
import { captureException } from '@/lib/sentry';
import type { RealtimeCodeUpdate } from '@/types';

/**
 * Subscribes to live updates for bathroom_access_codes for a given bathroom.
 *
 * When a new code is inserted or an existing code is updated (e.g. confidence_score
 * changes after a vote), TanStack Query cache is invalidated so the UI re-fetches.
 *
 * Cleans up the Supabase Realtime channel on unmount.
 *
 * @param bathroomId - The bathroom to watch. Pass null to skip subscription.
 */
export function useRealtimeCode(bathroomId: string | null): void {
  const queryClient = useQueryClient();
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!bathroomId) return;

    const channelName = `codes:bathroom:${bathroomId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event:  '*',       // INSERT, UPDATE, DELETE
          schema: 'public',
          table:  'bathroom_access_codes',
          filter: `bathroom_id=eq.${bathroomId}`,
        },
        (payload) => {
          // Invalidate the codes query — triggers a re-fetch
          queryClient.invalidateQueries({
            queryKey: codeQueryKeys.bathroom(bathroomId),
          });

          if (__DEV__) {
            console.log(`[Realtime] Code change on ${bathroomId}:`, payload.eventType);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          captureException(new Error('Realtime channel error'), {
            context: 'useRealtimeCode',
            bathroomId,
            channel: channelName,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [bathroomId, queryClient]);
}
```

---

## 8. `src/hooks/useRealtimeBathroomStatus.ts` — NEW

```typescript
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { analytics } from '@/lib/analytics';
import type { BathroomStatusEvent, BathroomLiveStatus } from '@/types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const statusQueryKeys = {
  current: (bathroomId: string) => ['bathroom', 'status', bathroomId] as const,
};

// ─── Query: fetch most recent active status ────────────────────────────────────

export function useCurrentBathroomStatus(bathroomId: string | null) {
  return useQuery<BathroomStatusEvent | null, Error>({
    queryKey: statusQueryKeys.current(bathroomId ?? ''),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('bathroom_status_events')
        .select('*')
        .eq('bathroom_id', bathroomId!)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return (data ?? null) as BathroomStatusEvent | null;
    },
    enabled:   Boolean(bathroomId),
    staleTime: 60 * 1000,       // 1 min — status changes frequently
    refetchInterval: 5 * 60 * 1000, // Poll every 5 min as a safety net
  });
}

// ─── Mutation: report status ──────────────────────────────────────────────────

export function useReportBathroomStatus() {
  const queryClient = useQueryClient();

  return useMutation
    { success: boolean; error?: string },
    Error,
    { bathroomId: string; status: BathroomLiveStatus; note?: string }
  >({
    mutationFn: async ({ bathroomId, status, note }) => {
      const { data, error } = await supabase.rpc('report_bathroom_status', {
        p_bathroom_id: bathroomId,
        p_status:      status,
        p_note:        note ?? null,
      });

      if (error) throw new Error(error.message);
      return data as { success: boolean; error?: string };
    },

    onSuccess: (_data, { bathroomId }) => {
      analytics.track('bathroom_reported');
      queryClient.invalidateQueries({
        queryKey: statusQueryKeys.current(bathroomId),
      });
    },

    onError: (error) => {
      captureException(error, { context: 'useReportBathroomStatus' });
    },
  });
}

// ─── Realtime: live status subscription ───────────────────────────────────────

/**
 * Subscribes to live bathroom_status_events for a given bathroom.
 * When a new status is reported, invalidates the cache so the
 * BathroomStatusBanner re-renders immediately.
 */
export function useRealtimeBathroomStatus(bathroomId: string | null): void {
  const queryClient = useQueryClient();
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!bathroomId) return;

    const channelName = `status:bathroom:${bathroomId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'bathroom_status_events',
          filter: `bathroom_id=eq.${bathroomId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: statusQueryKeys.current(bathroomId),
          });

          if (__DEV__) {
            console.log(`[Realtime] Status update on ${bathroomId}`);
          }
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          captureException(new Error('Realtime status channel error'), {
            context: 'useRealtimeBathroomStatus',
            bathroomId,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [bathroomId, queryClient]);
}
```

---

## 9. Component — `src/components/realtime/LiveCodeBadge.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useRealtimeCode } from '@/hooks/useRealtimeCode';
import { useBathroomCodes } from '@/hooks/useCodeOperations';

interface LiveCodeBadgeProps {
  bathroomId: string;
  testID?:    string;
}

/**
 * Shows a pulsing "LIVE" badge when Realtime is connected and
 * there are active codes for a bathroom.
 *
 * Also initiates the Realtime subscription for the given bathroom —
 * mount this whenever the detail sheet is open.
 */
export function LiveCodeBadge({ bathroomId, testID }: LiveCodeBadgeProps) {
  // Initiates the Realtime subscription (side-effect only)
  useRealtimeCode(bathroomId);

  const { data: codes } = useBathroomCodes(bathroomId);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  if (!codes || codes.length === 0) return null;

  return (
    <View style={styles.container} testID={testID}>
      <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
      <Text style={styles.label}>LIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:   999,
    borderWidth:    1,
    borderColor:    '#22c55e',
  },
  dot: {
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: '#16a34a',
  },
  label: {
    fontSize:    10,
    fontWeight:  '800',
    color:       '#15803d',
    letterSpacing: 1,
  },
});
```

---

## 10. Component — `src/components/realtime/BathroomStatusBanner.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  useCurrentBathroomStatus,
  useRealtimeBathroomStatus,
  useReportBathroomStatus,
} from '@/hooks/useRealtimeBathroomStatus';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStatusLabel,
  getStatusColor,
  getStatusBg,
  type BathroomLiveStatus,
} from '@/types';

const STATUS_OPTIONS: { value: BathroomLiveStatus; label: string; emoji: string }[] = [
  { value: 'clean',        label: 'Just cleaned',  emoji: '✨' },
  { value: 'dirty',        label: 'Needs cleaning', emoji: '⚠️' },
  { value: 'closed',       label: 'Closed / locked out', emoji: '🚫' },
  { value: 'out_of_order', label: 'Out of order',  emoji: '🔧' },
  { value: 'long_wait',    label: 'Long wait',      emoji: '⏳' },
];

interface BathroomStatusBannerProps {
  bathroomId: string;
  testID?:    string;
}

export function BathroomStatusBanner({ bathroomId, testID }: BathroomStatusBannerProps) {
  // Initiates realtime subscription
  useRealtimeBathroomStatus(bathroomId);

  const { data: currentStatus, isLoading } = useCurrentBathroomStatus(bathroomId);
  const { isAuthenticated } = useAuth();
  const reportStatus = useReportBathroomStatus();
  const [isReportSheetOpen, setReportSheetOpen] = useState(false);

  const handleStatusPress = () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Sign in to report bathroom status.', [{ text: 'OK' }]);
      return;
    }
    setReportSheetOpen(true);
  };

  const handleReport = async (status: BathroomLiveStatus) => {
    setReportSheetOpen(false);
    const result = await reportStatus.mutateAsync({ bathroomId, status });
    if (!result.success && result.error === 'rate_limited') {
      Alert.alert('Rate Limited', "You've already reported this bathroom's status recently.");
    }
  };

  if (isLoading) return null;

  return (
    <View testID={testID}>
      {/* Current status banner */}
      {currentStatus ? (
        <TouchableOpacity
          style={[
            styles.banner,
            { backgroundColor: getStatusBg(currentStatus.status as BathroomLiveStatus) },
          ]}
          onPress={handleStatusPress}
          testID="status-banner"
        >
          <Text style={[styles.bannerText, { color: getStatusColor(currentStatus.status as BathroomLiveStatus) }]}>
            {getStatusLabel(currentStatus.status as BathroomLiveStatus)}
          </Text>
          <Text style={styles.updateText}>Update →</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.noStatusBanner}
          onPress={handleStatusPress}
          testID="report-status-button"
        >
          <Text style={styles.noStatusText}>Report current status</Text>
        </TouchableOpacity>
      )}

      {/* Status picker modal */}
      <Modal
        visible={isReportSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReportSheetOpen(false)}
        testID="status-picker-modal"
      >
        <Pressable style={styles.backdrop} onPress={() => setReportSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>What's the status?</Text>

            {reportStatus.isPending ? (
              <ActivityIndicator
                size="large"
                color="#2563eb"
                style={styles.loader}
                testID="status-loading"
              />
            ) : (
              STATUS_OPTIONS.map(({ value, label, emoji }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.statusOption,
                    currentStatus?.status === value && styles.statusOptionActive,
                  ]}
                  onPress={() => handleReport(value)}
                  testID={`status-option-${value}`}
                >
                  <Text style={styles.statusEmoji}>{emoji}</Text>
                  <Text style={styles.statusLabel}>{label}</Text>
                  {currentStatus?.status === value && (
                    <Text style={styles.currentTag}>Current</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderRadius:      10,
    marginBottom:      12,
  },
  bannerText: { fontSize: 14, fontWeight: '600' },
  updateText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  noStatusBanner: {
    borderWidth:       1,
    borderColor:       '#e2e8f0',
    borderStyle:       'dashed',
    borderRadius:      10,
    paddingVertical:   10,
    alignItems:        'center',
    marginBottom:      12,
    backgroundColor:   '#f8fafc',
  },
  noStatusText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  // Sheet
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor:         '#ffffff',
    borderTopLeftRadius:     20,
    borderTopRightRadius:    20,
    paddingBottom:           40,
    paddingTop:              12,
    paddingHorizontal:       20,
  },
  sheetHandle: {
    width:        40,
    height:       4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf:    'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  loader:     { paddingVertical: 24 },
  statusOption: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap:            12,
  },
  statusOptionActive: { backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 6 },
  statusEmoji:  { fontSize: 22, width: 32, textAlign: 'center' },
  statusLabel:  { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500' },
  currentTag: {
    fontSize:          11,
    fontWeight:        '700',
    color:             '#16a34a',
    backgroundColor:   '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      999,
  },
});
```

---

## 11. Barrel — `src/components/realtime/index.ts`

```typescript
export { LiveCodeBadge }          from './LiveCodeBadge';
export { BathroomStatusBanner }   from './BathroomStatusBanner';
```

---

## 12. `app/_layout.tsx` — MODIFIED (add push setup + status bar)

```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PointsToast, BadgeEarnedModal } from '@/components/gamification';
import { queryClient } from '@/lib/query-client';
import { initSentry } from '@/lib/sentry';
import { usePushNotifications } from '@/hooks/usePushNotifications';

initSentry();

// ─── Inner layout (needs AuthProvider context for push hook) ──────────────────
function AppNavigator() {
  // Push notification setup — runs after auth state is available
  usePushNotifications();

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(auth)"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="bathroom/[id]"
          options={{
            presentation: 'card',
            headerShown:  true,
            headerTitle:  'Bathroom Details',
          }}
        />
      </Stack>
      {/* Gamification overlays */}
      <PointsToast />
      <BadgeEarnedModal />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
```

---

## 13. Integration into `BathroomDetailSheet.tsx`

Add these two imports and their usage inside the sheet (after the `sectionTitle` for codes):

```typescript
// Add to imports in BathroomDetailSheet.tsx
import { LiveCodeBadge } from '@/components/realtime/LiveCodeBadge';
import { BathroomStatusBanner } from '@/components/realtime/BathroomStatusBanner';

// In the sectionHeader for codes, add LiveCodeBadge:
<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>Access Codes</Text>
  <LiveCodeBadge
    bathroomId={selectedBathroom.id}
    testID="live-code-badge"
  />
</View>

// Before the codes section, add status banner:
<BathroomStatusBanner
  bathroomId={selectedBathroom.id}
  testID="status-banner"
/>
```

---

# Validation Block — SDET

## `src/__mocks__/expo-notifications.ts`

```typescript
const mockNotifications = {
  setNotificationHandler:       jest.fn(),
  getPermissionsAsync:          jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync:      jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync:        jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test-token-123]' }),
  setNotificationChannelAsync:  jest.fn().mockResolvedValue(null),
  setBadgeCountAsync:           jest.fn().mockResolvedValue(true),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: { HIGH: 4 },
};

export default mockNotifications;
export const {
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  getExpoPushTokenAsync,
  setNotificationChannelAsync,
  setBadgeCountAsync,
  addNotificationResponseReceivedListener,
  AndroidImportance,
} = mockNotifications;
```

## `src/__mocks__/expo-device.ts`

```typescript
export default {
  isDevice: true,
  deviceName: 'Test Device',
};
export const isDevice = true;
```

---

## `src/lib/__tests__/push-notifications.test.ts`

```typescript
jest.mock('expo-notifications', () => require('src/__mocks__/expo-notifications'));
jest.mock('expo-device',        () => require('src/__mocks__/expo-device'));
jest.mock('@/lib/supabase',     () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',       () => ({ captureException: jest.fn() }));
jest.mock('@/lib/analytics',    () => ({ analytics: { track: jest.fn() } }));
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: { OS: 'ios' },
}));

import {
  registerPushToken,
  deregisterPushToken,
  handleNotificationResponse,
} from '@/lib/push-notifications';
import * as Notifications from 'expo-notifications';
import { supabase, resetSupabaseMocks } from 'src/__mocks__/supabase';
import { analytics } from '@/lib/analytics';

describe('registerPushToken()', () => {
  beforeEach(() => resetSupabaseMocks());

  it('returns token and calls register_push_token RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({ error: null });

    const token = await registerPushToken();

    expect(token).toBe('ExponentPushToken[test-token-123]');
    expect(supabase.rpc).toHaveBeenCalledWith('register_push_token', {
      p_token: 'ExponentPushToken[test-token-123]',
    });
    expect(analytics.track).toHaveBeenCalledWith('onboarding_notifications_granted');
  });

  it('returns null when permission denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });

    const token = await registerPushToken();

    expect(token).toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(analytics.track).toHaveBeenCalledWith('onboarding_notifications_denied');
  });

  it('returns null on simulator (isDevice=false)', async () => {
    const Device = require('expo-device');
    const origIsDevice = Device.isDevice;
    Device.isDevice = false;

    const token = await registerPushToken();
    expect(token).toBeNull();

    Device.isDevice = origIsDevice;
  });

  it('returns null and captures exception on RPC error', async () => {
    supabase.rpc.mockResolvedValueOnce({ error: { message: 'DB error' } });
    const { captureException } = require('@/lib/sentry');

    const token = await registerPushToken();
    // Token is still returned — RPC error is non-blocking
    expect(token).toBe('ExponentPushToken[test-token-123]');
    expect(captureException).toHaveBeenCalled();
  });
});

describe('deregisterPushToken()', () => {
  beforeEach(() => resetSupabaseMocks());

  it('calls deregister_push_token RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({ error: null });
    await deregisterPushToken();
    expect(supabase.rpc).toHaveBeenCalledWith('deregister_push_token');
  });
});

describe('handleNotificationResponse()', () => {
  it('pushes to route from notification data', () => {
    const push = jest.fn();
    jest.useFakeTimers();

    const response = {
      notification: {
        request: {
          content: {
            data: { type: 'new_code', route: '/bathroom/abc-123' },
          },
        },
      },
    } as any;

    handleNotificationResponse(response, push);
    jest.runAllTimers();

    expect(push).toHaveBeenCalledWith('/bathroom/abc-123');
    jest.useRealTimers();
  });

  it('does nothing when no route in data', () => {
    const push = jest.fn();
    jest.useFakeTimers();

    const response = {
      notification: { request: { content: { data: { type: 'badge_earned' } } } },
    } as any;

    handleNotificationResponse(response, push);
    jest.runAllTimers();

    expect(push).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
```

---

## `src/hooks/__tests__/useRealtimeCode.test.ts`

```typescript
jest.mock('@/lib/supabase', () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',   () => ({ captureException: jest.fn() }));

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRealtimeCode } from '@/hooks/useRealtimeCode';
import { supabase } from 'src/__mocks__/supabase';

// ─── Realtime mock ────────────────────────────────────────────────────────────
const mockUnsubscribe = jest.fn();
const mockOn          = jest.fn().mockReturnThis();
const mockSubscribe   = jest.fn().mockImplementation((cb) => {
  cb('SUBSCRIBED');
  return { unsubscribe: mockUnsubscribe };
});

// Monkey-patch the supabase channel mock
(supabase as any).channel = jest.fn().mockReturnValue({
  on:          mockOn,
  subscribe:   mockSubscribe,
  unsubscribe: mockUnsubscribe,
});

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const BATHROOM_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('useRealtimeCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase as any).channel = jest.fn().mockReturnValue({
      on:          mockOn,
      subscribe:   mockSubscribe,
      unsubscribe: mockUnsubscribe,
    });
  });

  it('creates a channel for the given bathroomId', () => {
    renderHook(() => useRealtimeCode(BATHROOM_ID), { wrapper: makeWrapper() });

    expect((supabase as any).channel).toHaveBeenCalledWith(
      `codes:bathroom:${BATHROOM_ID}`,
    );
  });

  it('does not create channel when bathroomId is null', () => {
    renderHook(() => useRealtimeCode(null), { wrapper: makeWrapper() });
    expect((supabase as any).channel).not.toHaveBeenCalled();
  });

  it('calls unsubscribe on unmount — no memory leak', () => {
    const { unmount } = renderHook(
      () => useRealtimeCode(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('subscribes to postgres_changes on correct table and filter', () => {
    renderHook(() => useRealtimeCode(BATHROOM_ID), { wrapper: makeWrapper() });

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table:  'bathroom_access_codes',
        filter: `bathroom_id=eq.${BATHROOM_ID}`,
      }),
      expect.any(Function),
    );
  });

  it('invalidates query when change event fires', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    let capturedCallback: Function = () => {};
    mockOn.mockImplementation((_event: any, _filter: any, cb: Function) => {
      capturedCallback = cb;
      return { subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, on: mockOn };
    });

    renderHook(() => useRealtimeCode(BATHROOM_ID), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });

    act(() => {
      capturedCallback({ eventType: 'INSERT' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['codes', 'bathroom', BATHROOM_ID]),
      }),
    );
  });
});
```

---

## `src/hooks/__tests__/useRealtimeBathroomStatus.test.ts`

```typescript
jest.mock('@/lib/supabase',  () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',    () => ({ captureException: jest.fn() }));
jest.mock('@/lib/analytics', () => ({ analytics: { track: jest.fn() } }));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCurrentBathroomStatus,
  useReportBathroomStatus,
  useRealtimeBathroomStatus,
} from '@/hooks/useRealtimeBathroomStatus';
import { supabase, resetSupabaseMocks } from 'src/__mocks__/supabase';

const mockUnsubscribe = jest.fn();
(supabase as any).channel = jest.fn().mockReturnValue({
  on:          jest.fn().mockReturnThis(),
  subscribe:   jest.fn().mockImplementation((cb) => { cb('SUBSCRIBED'); return { unsubscribe: mockUnsubscribe }; }),
  unsubscribe: mockUnsubscribe,
});

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const BATHROOM_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockStatus = {
  id: 'status-1', bathroom_id: BATHROOM_ID, reported_by: 'user-1',
  status: 'clean', note: null,
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  created_at: new Date().toISOString(),
};

describe('useCurrentBathroomStatus', () => {
  beforeEach(() => resetSupabaseMocks());

  it('returns current status', async () => {
    supabase.from.mockReturnValue({
      select:  jest.fn().mockReturnThis(),
      eq:      jest.fn().mockReturnThis(),
      gt:      jest.fn().mockReturnThis(),
      order:   jest.fn().mockReturnThis(),
      limit:   jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockStatus, error: null }),
    });

    const { result } = renderHook(
      () => useCurrentBathroomStatus(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('clean');
  });

  it('returns null when no active status', async () => {
    supabase.from.mockReturnValue({
      select:  jest.fn().mockReturnThis(),
      eq:      jest.fn().mockReturnThis(),
      gt:      jest.fn().mockReturnThis(),
      order:   jest.fn().mockReturnThis(),
      limit:   jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
    });

    const { result } = renderHook(
      () => useCurrentBathroomStatus(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('is disabled when bathroomId is null', () => {
    const { result } = renderHook(
      () => useCurrentBathroomStatus(null),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useReportBathroomStatus', () => {
  beforeEach(() => resetSupabaseMocks());

  it('calls report_bathroom_status RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    const { result } = renderHook(() => useReportBathroomStatus(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ bathroomId: BATHROOM_ID, status: 'dirty' });
    });

    expect(supabase.rpc).toHaveBeenCalledWith('report_bathroom_status', {
      p_bathroom_id: BATHROOM_ID,
      p_status:      'dirty',
      p_note:        null,
    });
  });

  it('returns rate_limited error when called too soon', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { success: false, error: 'rate_limited' },
      error: null,
    });

    const { result } = renderHook(() => useReportBathroomStatus(), { wrapper: makeWrapper() });

    let response: any;
    await act(async () => {
      response = await result.current.mutateAsync({ bathroomId: BATHROOM_ID, status: 'clean' });
    });

    expect(response.error).toBe('rate_limited');
  });
});

describe('useRealtimeBathroomStatus — cleanup', () => {
  it('unsubscribes channel on unmount', () => {
    const { unmount } = renderHook(
      () => useRealtimeBathroomStatus(BATHROOM_ID),
      { wrapper: makeWrapper() },
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('does not subscribe when bathroomId is null', () => {
    const channelSpy = (supabase as any).channel as jest.Mock;
    channelSpy.mockClear();

    renderHook(() => useRealtimeBathroomStatus(null), { wrapper: makeWrapper() });
    expect(channelSpy).not.toHaveBeenCalled();
  });
});
```

---

## `src/components/realtime/__tests__/BathroomStatusBanner.test.tsx`

```typescript
jest.mock('@/lib/supabase',  () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',    () => ({ captureException: jest.fn() }));
jest.mock('@/lib/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
jest.mock('@/hooks/useRealtimeBathroomStatus', () => ({
  useCurrentBathroomStatus:    jest.fn(),
  useRealtimeBathroomStatus:   jest.fn(),
  useReportBathroomStatus:     jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BathroomStatusBanner } from '../BathroomStatusBanner';
import {
  useCurrentBathroomStatus,
  useReportBathroomStatus,
} from '@/hooks/useRealtimeBathroomStatus';

const BATHROOM_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('BathroomStatusBanner', () => {
  beforeEach(() => {
    (useCurrentBathroomStatus as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (useReportBathroomStatus as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ success: true }),
      isPending:   false,
    });
  });

  it('shows report-status button when no current status', () => {
    render(<BathroomStatusBanner bathroomId={BATHROOM_ID} testID="banner" />);
    expect(screen.getByTestId('report-status-button')).toBeTruthy();
  });

  it('shows status banner when status exists', () => {
    (useCurrentBathroomStatus as jest.Mock).mockReturnValue({
      data: {
        id: 's-1', bathroom_id: BATHROOM_ID, status: 'clean',
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        created_at: new Date().toISOString(), reported_by: 'u-1', note: null,
      },
      isLoading: false,
    });

    render(<BathroomStatusBanner bathroomId={BATHROOM_ID} testID="banner" />);
    expect(screen.getByTestId('status-banner')).toBeTruthy();
    expect(screen.getByText('✨ Recently cleaned')).toBeTruthy();
  });

  it('opens status picker modal on status banner press', () => {
    (useCurrentBathroomStatus as jest.Mock).mockReturnValue({
      data: {
        id: 's-1', bathroom_id: BATHROOM_ID, status: 'dirty',
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        created_at: new Date().toISOString(), reported_by: 'u-1', note: null,
      },
      isLoading: false,
    });

    render(<BathroomStatusBanner bathroomId={BATHROOM_ID} />);
    fireEvent.press(screen.getByTestId('status-banner'));
    expect(screen.getByTestId('status-picker-modal')).toBeTruthy();
  });

  it('calls mutateAsync with correct status when option pressed', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ success: true });
    (useReportBathroomStatus as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });

    render(<BathroomStatusBanner bathroomId={BATHROOM_ID} />);
    fireEvent.press(screen.getByTestId('report-status-button'));
    fireEvent.press(screen.getByTestId('status-option-clean'));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ bathroomId: BATHROOM_ID, status: 'clean' }),
    );
  });

  it('returns null when isLoading=true', () => {
    (useCurrentBathroomStatus as jest.Mock).mockReturnValue({ data: null, isLoading: true });

    const { toJSON } = render(<BathroomStatusBanner bathroomId={BATHROOM_ID} />);
    expect(toJSON()).toBeNull();
  });
});
```

---

## Security Validation SQL

```sql
-- ============================================================================
-- Push Notifications & Realtime Security Tests
-- ============================================================================

-- 1. push_subscriptions auto-sync: inserting a favorite creates a subscription
-- Run as authenticated user:
insert into public.favorites (user_id, bathroom_id)
values (auth.uid(), 'VALID-BATHROOM-UUID');
-- Expected: row appears in public.push_subscriptions

-- 2. Unfavoriting removes the subscription
delete from public.favorites
where user_id = auth.uid() and bathroom_id = 'VALID-BATHROOM-UUID';
-- Expected: row removed from public.push_subscriptions

-- 3. push_subscriptions: user cannot read other users' subscriptions
-- Run as user A, check only seeing own rows:
select count(*) from public.push_subscriptions;
-- Expected: only rows where user_id = auth.uid()

-- 4. register_push_token: only updates authenticated user's own row
-- Run as authenticated user:
select public.register_push_token('ExponentPushToken[test]');
select push_token from public.profiles where id = auth.uid();
-- Expected: push_token = 'ExponentPushToken[test]'

-- 5. report_bathroom_status: rate limiting at 1 per 30 min
select public.report_bathroom_status('VALID-BATHROOM-UUID', 'clean');
-- First call: {"success": true}
select public.report_bathroom_status('VALID-BATHROOM-UUID', 'dirty');
-- Second call within 30 min: {"success": false, "error": "rate_limited"}

-- 6. bathroom_status_events RLS: expired events are not visible
-- Insert an event with expires_at in the past (should not appear in select)
insert into public.bathroom_status_events
  (bathroom_id, reported_by, status, expires_at)
values
  ('VALID-BATHROOM-UUID', auth.uid(), 'clean', now() - interval '1 hour');

select count(*) from public.bathroom_status_events
where bathroom_id = 'VALID-BATHROOM-UUID'
  and expires_at <= now();
-- Expected: 0 (RLS policy filters these out)

-- 7. get_subscribers_for_bathroom: requires service role (called from Edge Functions)
-- Run as regular authenticated user:
select * from public.get_subscribers_for_bathroom('VALID-BATHROOM-UUID');
-- Verify it only returns users with push_enabled=true and non-null push_token
```

---

## Performance Notes

- **Realtime channel naming** — `codes:bathroom:{id}` and `status:bathroom:{id}` are unique per bathroom. When the detail sheet opens for bathroom A, only A's channel is created. Closing the sheet triggers `unsubscribe()`. Zero orphaned channels. ✅
- **`useEffect` cleanup** — both `useRealtimeCode` and `useRealtimeBathroomStatus` store the channel in a `useRef` and call `channel.unsubscribe()` in the cleanup. This was explicitly unit-tested in the SDET block. ✅
- **Realtime → TanStack Query invalidation pattern** — we never update the cache directly from realtime payloads. We invalidate and let TanStack re-fetch. This avoids partial-state bugs (e.g. a realtime `UPDATE` payload missing joined fields). Slightly more network traffic, but correctness is guaranteed. ✅
- **Push token cleanup** — `send-push-notification` Edge Function detects `DeviceNotRegistered` receipts from Expo and proactively nullifies stale tokens in the DB. This prevents wasted push attempts on every subsequent notification. ✅
- **`report_bathroom_status` rate limit** — enforced in the DB function (not client-side), so it cannot be bypassed by API calls directly. ✅
- **`notification_prefs` JSONB default** — set at the DB level, so new users automatically have sensible defaults without needing an app update. ✅

---

## Section 4 Checklist

| Feature | DB | Edge Fn | Hook | UI | Tests |
|---------|----|----|------|----|-------|
| Push token registration + cleanup | ✅ | ✅ | ✅ | — | ✅ |
| Permission denied handling | — | — | ✅ | — | ✅ |
| Notification tap → route navigation | — | — | ✅ | — | ✅ |
| Stale token pruning (DeviceNotRegistered) | — | ✅ | — | — | — |
| Favorite update push (webhook trigger) | ✅ | ✅ | — | — | — |
| Realtime code updates (channel + invalidation) | ✅ | — | ✅ | ✅ | ✅ |
| Realtime status updates | ✅ | — | ✅ | ✅ | ✅ |
| Bathroom live status reporting | ✅ | — | ✅ | ✅ | ✅ |
| Rate limiting (1 status/30min) | ✅ | — | — | — | ✅ SQL |
| Auto-subscribe on favorite | ✅ | — | — | — | ✅ SQL |
| Badge count clear on foreground | — | — | ✅ | — | — |
| Memory leak audit (all channels) | — | — | ✅ | — | ✅ |

**Section 4: Push Notifications + Realtime is complete. Say "Next" for Section 5: The Search Tab, or "Integrated" to verify first.**

## Assistant (commentary)

`2026-03-16T11:48:25.702Z`

The sample is directionally useful, but it doesn’t fit this repo verbatim. I’m taking the same feature scope and adapting it to the actual stack here: `getSupabaseClient()`, the current analytics API, the existing auth store, and the already-established map/detail flows.

## Assistant (commentary)

`2026-03-16T11:48:31.502Z`

I’m starting with the infrastructure pieces: package support plus the notification/realtime schema. Once those are in, I’ll wire the runtime and UI against them instead of building dead-end client code.

## Assistant (commentary)

`2026-03-16T11:49:54.622Z`

Using `$staff-mobile-engineer` for Section 4. I’m validating the current auth, profile, and bathroom detail surfaces before wiring push registration and realtime into the repo’s existing architecture.

## Assistant (commentary)

`2026-03-16T11:50:05.601Z`

I’ve confirmed the runtime surfaces: push setup belongs in the root layout, preferences belong in the existing profile tab, and realtime status belongs on the bathroom detail screen rather than the map sheet sample. Next I’m checking type shapes and existing Supabase helpers so the new code fits without introducing parallel APIs.

## Assistant (commentary)

`2026-03-16T11:50:16.701Z`

The repo uses `getSupabaseClient()`, a constrained analytics API, and the bathroom detail route as the canonical detail surface. I’m adapting Section 4 to those seams instead of the pasted sample’s alternate clients and context APIs.

## Assistant (commentary)

`2026-03-16T11:50:28.301Z`

The current Jest harness is still `ts-jest` with `node`, so I’m not going to drop in the sample’s React Native component tests unchanged. I’m checking the existing test style first so Section 4 lands with runnable coverage instead of a broken test stack.

## Assistant (commentary)

`2026-03-16T11:51:31.437Z`

I’ve got the integration points now. The remaining design choice is narrow: add Section 4 as a repo-native layer around the existing detail screen and auth store, instead of trying to retrofit the sample’s alternative map/detail architecture.

## Assistant (commentary)

`2026-03-16T11:51:55.807Z`

Before editing, I’m checking the installed Expo Notifications typings locally so the push handler and cold-start routing use the SDK 54 API exactly, not a remembered version.

## Assistant (commentary)

`2026-03-16T11:56:23.646Z`

I have enough context to start edits. I’m implementing the database and edge-function layer first so the app code can target concrete RPCs and realtime tables instead of inventing client-only state.

## Assistant (commentary)

`2026-03-16T11:56:59.214Z`

I’m moving on to the serverless pieces now. I’m tightening the sample’s edge functions so they only accept service-role callers and prune invalid Expo tokens in bounded batches.

## Assistant (commentary)

`2026-03-16T11:57:34.367Z`

I’ve got the backend contract in place. Next I’m patching the Expo config and shared types so the runtime can request notification permission cleanly and the new profile fields survive parsing and cache restore.

## Assistant (commentary)

`2026-03-16T11:58:27.056Z`

I hit a small patch drift in `AuthContext`; I’m reopening the exact import block and cache-shaping code before patching so I don’t stomp any of the session recovery logic.

## Assistant (commentary)

`2026-03-16T12:01:43.447Z`

I’m wiring the realtime UI into the actual bathroom route now. The detail screen already owns code fetch/reveal state, so the new subscription hook is just refreshing that state instead of trying to bolt React Query onto a screen that doesn’t use it today.

## Assistant (commentary)

`2026-03-16T12:02:20.286Z`

The shared client code is in. I’m doing a pass over the new API modules before validation because there are a couple of places where I intentionally diverged from the sample: sign-out now clears only the token, and the profile UI only exposes the notification channel that is actually live today.

## Assistant (commentary)

`2026-03-16T12:02:45.390Z`

I’ve finished the main implementation pass and I’m running type-check now before adding tests. That should surface any integration drift from the new profile fields, Expo Notifications types, or Supabase RPC signatures.

## Assistant (commentary)

`2026-03-16T12:03:11.946Z`

The type-check came back clean. I’m adding focused unit coverage now around the new parser shape, the Expo push token flow, and the status helper logic so the notification/realtime layer is covered by the repo’s current Jest setup instead of a separate RN component harness.

## Assistant (commentary)

`2026-03-16T12:04:02.477Z`

The implementation and tests are both in place. I’m running lint next, then the full Jest suite, and I’ll fix any style or runtime regressions before I close out Section 4.

## Assistant (commentary)

`2026-03-16T12:04:39.427Z`

The failures are limited to test typing, not runtime logic. I’m patching the new Jest mocks to use explicit `jest.Mock` casts so `ts-jest` stops inferring `never` for the mocked async return values.

## Assistant (commentary)

`2026-03-16T12:06:44.443Z`

Validation is clean now. I’m doing one final status pass so I can close Section 4 with the actual affected files and anything you still need to wire in Supabase Dashboard, like the webhook and realtime publication.

## Assistant (final_answer)

`2026-03-16T12:07:04.465Z`

Section 4 is integrated. I added the notification/realtime schema in [008_notifications_realtime.sql](C:\Users\T\Desktop\PeeDom\supabase\migrations\008_notifications_realtime.sql), service-side push handlers in [send-push-notification](C:\Users\T\Desktop\PeeDom\supabase\functions\send-push-notification\index.ts) and [notify-favorite-update](C:\Users\T\Desktop\PeeDom\supabase\functions\notify-favorite-update\index.ts), and repo-native client wiring in [push-notifications.ts](C:\Users\T\Desktop\PeeDom\src\lib\push-notifications.ts), [notifications.ts](C:\Users\T\Desktop\PeeDom\src\api\notifications.ts), [usePushNotifications.ts](C:\Users\T\Desktop\PeeDom\src\hooks\usePushNotifications.ts), and [useBathroomLiveStatus.ts](C:\Users\T\Desktop\PeeDom\src\hooks\useBathroomLiveStatus.ts). Root push setup is mounted from [app/_layout.tsx](C:\Users\T\Desktop\PeeDom\app\_layout.tsx), the profile tab now has real notification controls in [profile.tsx](C:\Users\T\Desktop\PeeDom\app\(tabs)\profile.tsx), and the bathroom detail route now shows live status plus code realtime refresh in [app/bathroom/[id].tsx](C:\Users\T\Desktop\PeeDom\app\bathroom\[id].tsx).

I also extended profile parsing/cache restore in [AuthContext.tsx](C:\Users\T\Desktop\PeeDom\src\contexts\AuthContext.tsx) and updated shared DB/types in [database.ts](C:\Users\T\Desktop\PeeDom\src\types\database.ts), [index.ts](C:\Users\T\Desktop\PeeDom\src\types\index.ts), and [supabase-parsers.ts](C:\Users\T\Desktop\PeeDom\src\lib\supabase-parsers.ts). The profile UI only exposes the currently live channel, `favorite_update`, instead of shipping dead toggles.

Validation passed:
- `npm run type-check`
- `npm run lint`
- `npm test -- --runInBand`

Manual follow-up still required:
- Deploy [send-push-notification](C:\Users\T\Desktop\PeeDom\supabase\functions\send-push-notification\index.ts) and [notify-favorite-update](C:\Users\T\Desktop\PeeDom\supabase\functions\notify-favorite-update\index.ts).
- Configure the Supabase database webhook for `bathroom_access_codes` `INSERT` events to call `notify-favorite-update`.
- Apply the new migration and rebuild the native app after the `expo-notifications` install/config change.

Next for Section 5.

## User

`2026-03-16T12:08:24.713Z`

next

## Assistant (final_answer)

`2026-03-16T12:08:37.081Z`

Send the Section 5 block and I’ll integrate it against the current search tab implementation.

## User

`2026-03-16T12:33:17.905Z`

Clean. No conflicts. Beginning output.

---

# Section 5: The Search Tab

## Terminal Commands

```bash
# No new packages — all dependencies satisfied by prior sections
```

---

## 1. Database — `supabase/migrations/007_search.sql`

```sql
-- ============================================================================
-- PeeDom Search Migration
-- 007_search.sql
-- ============================================================================

-- ─── Full-text search vector column ─────────────────────────────────────────
-- Stored tsvector combining place_name (high weight) + address + city + state.
-- Automatically kept in sync via trigger.

alter table public.bathrooms
  add column if not exists search_vector tsvector;

-- Populate existing rows
update public.bathrooms
set search_vector = to_tsvector('english',
  coalesce(place_name,    '') || ' ' ||
  coalesce(address_line1, '') || ' ' ||
  coalesce(city,          '') || ' ' ||
  coalesce(state,         '')
);

-- GIN index for fast full-text search
create index if not exists idx_bathrooms_search_vector
  on public.bathrooms using gin(search_vector);

-- Trigger to keep search_vector in sync on INSERT/UPDATE
create or replace function public.update_bathroom_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector := to_tsvector('english',
    coalesce(new.place_name,    '') || ' ' ||
    coalesce(new.address_line1, '') || ' ' ||
    coalesce(new.city,          '') || ' ' ||
    coalesce(new.state,         '')
  );
  return new;
end;
$$;

create trigger bathroom_search_vector_update
  before insert or update of place_name, address_line1, city, state
  on public.bathrooms
  for each row execute function public.update_bathroom_search_vector();

-- ─── RPC: search_bathrooms ───────────────────────────────────────────────────
-- Proximity-biased full-text search.
-- Rank = ts_rank (text relevance) × recency_factor ÷ log(distance_meters + 2)
-- Returns up to `p_limit` active bathrooms with code summary.

create or replace function public.search_bathrooms(
  p_query      text,
  p_user_lat   double precision default null,
  p_user_lng   double precision default null,
  p_limit      integer          default 20
)
returns table (
  id                 uuid,
  place_name         text,
  address_line1      text,
  city               text,
  state              text,
  latitude           double precision,
  longitude          double precision,
  is_locked          boolean,
  is_accessible      boolean,
  is_customer_only   boolean,
  hours_json         jsonb,
  distance_meters    double precision,
  has_code           boolean,
  confidence_score   numeric,
  last_verified_at   timestamptz,
  rank               real
)
language sql
stable
security invoker
set search_path = public
as $$
  with parsed_query as (
    select plainto_tsquery('english', p_query) as q
  ),
  results as (
    select
      b.id,
      b.place_name,
      b.address_line1,
      b.city,
      b.state,
      b.latitude,
      b.longitude,
      b.is_locked,
      b.is_accessible,
      b.is_customer_only,
      b.hours_json,
      case
        when p_user_lat is not null and p_user_lng is not null then
          ST_Distance(
            b.geom,
            ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
          )
        else null
      end as distance_meters,
      ts_rank(b.search_vector, pq.q) as text_rank
    from public.bathrooms b, parsed_query pq
    where b.moderation_status = 'active'
      and b.search_vector @@ pq.q
  ),
  ranked as (
    select
      r.*,
      -- Combine text rank with distance bias
      case
        when r.distance_meters is not null then
          r.text_rank / ln(r.distance_meters / 100.0 + 2.0)
        else r.text_rank
      end as rank
    from results r
  ),
  code_summary as (
    select distinct on (bac.bathroom_id)
      bac.bathroom_id,
      true                   as has_code,
      bac.confidence_score,
      bac.last_verified_at
    from public.bathroom_access_codes bac
    where bac.visibility_status = 'visible'
      and bac.lifecycle_status  = 'active'
    order by bac.bathroom_id, bac.confidence_score desc, bac.last_verified_at desc nulls last
  )
  select
    ranked.id,
    ranked.place_name,
    ranked.address_line1,
    ranked.city,
    ranked.state,
    ranked.latitude,
    ranked.longitude,
    ranked.is_locked,
    ranked.is_accessible,
    ranked.is_customer_only,
    ranked.hours_json,
    ranked.distance_meters,
    coalesce(cs.has_code, false) as has_code,
    cs.confidence_score,
    cs.last_verified_at,
    ranked.rank::real
  from ranked
  left join code_summary cs on cs.bathroom_id = ranked.id
  order by ranked.rank desc
  limit p_limit;
$$;

-- ─── City browse: distinct cities with bathroom counts ───────────────────────

create or replace function public.get_city_browse(p_limit integer default 30)
returns table (
  city          text,
  state         text,
  bathroom_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    city,
    state,
    count(*) as bathroom_count
  from public.bathrooms
  where moderation_status = 'active'
    and city is not null
    and state is not null
  group by city, state
  order by bathroom_count desc
  limit p_limit;
$$;
```

---

## 2. Types — additions to `src/types/index.ts`

```typescript
// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchResult {
  id:               string;
  place_name:       string;
  address_line1:    string | null;
  city:             string | null;
  state:            string | null;
  latitude:         number;
  longitude:        number;
  is_locked:        boolean | null;
  is_accessible:    boolean | null;
  is_customer_only: boolean;
  hours_json:       HoursData | null;
  distance_meters:  number | null;
  has_code:         boolean;
  confidence_score: number | null;
  last_verified_at: string | null;
  rank:             number;
}

export interface SearchHistoryItem {
  query:        string;
  searched_at:  string;
}

export interface CityBrowseItem {
  city:            string;
  state:           string;
  bathroom_count:  number;
}

export function formatSearchAddress(result: SearchResult): string {
  return [result.address_line1, result.city, result.state]
    .filter(Boolean)
    .join(', ');
}
```

---

## 3. `src/lib/validators/search.ts` — NEW

```typescript
import { z } from 'zod';

export const SearchQuerySchema = z.object({
  query: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(200, 'Search query is too long')
    .trim(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
```

Add to `src/lib/validators/index.ts`:
```typescript
export * from './search';
```

---

## 4. `src/hooks/useSearchHistory.ts` — NEW

```typescript
import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import type { SearchHistoryItem } from '@/types';

const HISTORY_KEY    = '@peedom/search_history';
const MAX_HISTORY    = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load on mount
  useEffect(() => {
    storage.get<SearchHistoryItem[]>(HISTORY_KEY).then((stored) => {
      setHistory(stored ?? []);
    });
  }, []);

  const addToHistory = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    setHistory((prev) => {
      // Deduplicate + prepend + cap at MAX_HISTORY
      const filtered = prev.filter(
        (h) => h.query.toLowerCase() !== trimmed.toLowerCase(),
      );
      const next: SearchHistoryItem[] = [
        { query: trimmed, searched_at: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_HISTORY);

      storage.set(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback(async (query: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.query !== query);
      storage.set(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await storage.remove(HISTORY_KEY);
  }, []);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
```

---

## 5. `src/hooks/useSearch.ts` — NEW

```typescript
import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { analytics } from '@/lib/analytics';
import { SearchQuerySchema } from '@/lib/validators';
import type { SearchResult, CityBrowseItem } from '@/types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const searchQueryKeys = {
  results:     (q: string) => ['search', 'results', q]   as const,
  cityBrowse:  ()          => ['search', 'city-browse']   as const,
};

// ─── City browse (static-ish, used when search bar is empty) ─────────────────

export function useCityBrowse() {
  return useQuery<CityBrowseItem[], Error>({
    queryKey: searchQueryKeys.cityBrowse(),
    queryFn:  async () => {
      const { data, error } = await supabase.rpc('get_city_browse', { p_limit: 30 });
      if (error) throw new Error(error.message);
      return (data ?? []) as CityBrowseItem[];
    },
    staleTime: 15 * 60 * 1000, // Cities change rarely
  });
}

// ─── Main search hook ─────────────────────────────────────────────────────────

interface UseSearchState {
  query:           string;
  debouncedQuery:  string;
  isSearching:     boolean;
  results:         SearchResult[];
  error:           Error | null;
  setQuery:        (q: string) => void;
  clearQuery:      () => void;
}

const DEBOUNCE_MS = 350;

export function useSearch(): UseSearchState {
  const [query,          setQueryRaw]   = useState('');
  const [debouncedQuery, setDebounced]  = useState('');
  const debounceRef                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRef                      = useRef<{ lat: number; lng: number } | null>(null);

  // Debounce input
  const setQuery = useCallback((q: string) => {
    setQueryRaw(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebounced(q.trim());
    }, DEBOUNCE_MS);
  }, []);

  const clearQuery = useCallback(() => {
    setQueryRaw('');
    setDebounced('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // Best-effort location for proximity bias (non-blocking)
  const ensureLocation = useCallback(async () => {
    if (locationRef.current) return;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getLastKnownPositionAsync();
      if (pos) {
        locationRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      }
    } catch {
      // Location unavailable — search without proximity bias
    }
  }, []);

  const { data, isFetching, error } = useQuery<SearchResult[], Error>({
    queryKey: searchQueryKeys.results(debouncedQuery),
    queryFn:  async () => {
      const validated = SearchQuerySchema.safeParse({ query: debouncedQuery });
      if (!validated.success) return [];

      await ensureLocation();

      const { data: rows, error: rpcError } = await supabase.rpc('search_bathrooms', {
        p_query:    validated.data.query,
        p_user_lat: locationRef.current?.lat ?? null,
        p_user_lng: locationRef.current?.lng ?? null,
        p_limit:    validated.data.limit,
      });

      if (rpcError) throw new Error(rpcError.message);

      analytics.track('search_query', { query_length: debouncedQuery.length });

      return (rows ?? []) as SearchResult[];
    },
    enabled:   debouncedQuery.length >= 2,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev, // keep previous results while typing
  });

  return {
    query,
    debouncedQuery,
    isSearching: isFetching,
    results:     data ?? [],
    error:       error ?? null,
    setQuery,
    clearQuery,
  };
}
```

---

## 6. Component — `src/components/search/SearchBar.tsx`

```typescript
import React, { useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';

interface SearchBarProps {
  value:        string;
  onChangeText: (text: string) => void;
  onClear:      () => void;
  isLoading?:   boolean;
  autoFocus?:   boolean;
  testID?:      string;
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  isLoading = false,
  autoFocus = false,
  testID,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.inputRow}>
        {/* Search icon / spinner */}
        <View style={styles.iconContainer}>
          {isLoading
            ? <ActivityIndicator size="small" color="#2563eb" testID="search-spinner" />
            : <Text style={styles.searchIcon}>🔍</Text>
          }
        </View>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Search bathrooms, locations…"
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus={autoFocus}
          clearButtonMode="never"   // we render our own
          testID="search-input"
        />

        {value.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            style={styles.clearButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="search-clear"
          >
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical:    8,
    backgroundColor:   '#ffffff',
    borderBottomWidth:  1,
    borderBottomColor: '#f1f5f9',
  },
  inputRow: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: '#f1f5f9',
    borderRadius:   12,
    paddingHorizontal: 12,
    height:         46,
  },
  iconContainer: {
    width:          24,
    alignItems:     'center',
    justifyContent: 'center',
    marginRight:    8,
  },
  searchIcon: { fontSize: 17 },
  input: {
    flex:      1,
    fontSize:  16,
    color:     '#111827',
    padding:   0,            // reset default TextInput padding
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  clearButton: {
    width:          28,
    height:         28,
    borderRadius:   14,
    backgroundColor: '#d1d5db',
    alignItems:     'center',
    justifyContent: 'center',
    marginLeft:     6,
  },
  clearIcon: { fontSize: 11, color: '#374151', fontWeight: '700' },
});
```

---

## 7. Component — `src/components/search/SearchResultItem.tsx`

```typescript
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  getMarkerColor,
  getMarkerHex,
  formatDistance,
  formatSearchAddress,
  isCurrentlyOpen,
} from '@/types';
import type { SearchResult } from '@/types';

interface SearchResultItemProps {
  result:   SearchResult;
  onPress:  (result: SearchResult) => void;
  testID?:  string;
}

export const SearchResultItem = memo(function SearchResultItem({
  result,
  onPress,
  testID,
}: SearchResultItemProps) {
  const color    = getMarkerColor(result);
  const hex      = getMarkerHex(color);
  const address  = formatSearchAddress(result);
  const openStatus = isCurrentlyOpen(result.hours_json);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(result)}
      activeOpacity={0.7}
      testID={testID}
    >
      {/* Color dot */}
      <View style={[styles.colorDot, { backgroundColor: hex }]} testID="result-dot" />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1} testID="result-name">
          {result.place_name}
        </Text>
        {address.length > 0 && (
          <Text style={styles.address} numberOfLines={1} testID="result-address">
            {address}
          </Text>
        )}

        {/* Tags row */}
        <View style={styles.tags}>
          {result.distance_meters !== null && (
            <Tag
              label={formatDistance(result.distance_meters)}
              color="#2563eb"
              testID="tag-distance"
            />
          )}
          {openStatus === true  && <Tag label="Open"    color="#16a34a" testID="tag-open" />}
          {openStatus === false && <Tag label="Closed"  color="#dc2626" testID="tag-closed" />}
          {result.is_accessible     && <Tag label="♿"   color="#7c3aed" testID="tag-accessible" />}
          {result.is_customer_only  && <Tag label="🛒 Customers" color="#d97706" testID="tag-customers" />}
        </View>
      </View>

      {/* Code status */}
      <View style={styles.codeStatus} testID="result-code-status">
        {result.is_locked === false ? (
          <Text style={[styles.codeEmoji, { color: '#16a34a' }]}>🔓</Text>
        ) : result.has_code ? (
          <Text style={[styles.codeEmoji, { color: '#d97706' }]}>🔑</Text>
        ) : (
          <Text style={[styles.codeEmoji, { color: '#9ca3af' }]}>🔒</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

function Tag({
  label, color, testID,
}: { label: string; color: string; testID?: string }) {
  return (
    <View style={[styles.tag, { borderColor: color + '40' }]} testID={testID}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  colorDot: {
    width:        12,
    height:       12,
    borderRadius: 6,
    flexShrink:   0,
  },
  info: { flex: 1, gap: 3 },
  name: {
    fontSize:   15,
    fontWeight: '600',
    color:      '#111827',
  },
  address: {
    fontSize: 12,
    color:    '#6b7280',
  },
  tags: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           4,
    marginTop:     3,
  },
  tag: {
    borderWidth:       1,
    borderRadius:      999,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
  codeStatus: {
    width:          32,
    alignItems:     'center',
    justifyContent: 'center',
  },
  codeEmoji: { fontSize: 20 },
});
```

---

## 8. Component — `src/components/search/SearchResultsList.tsx`

```typescript
import React from 'react';
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SearchResultItem } from './SearchResultItem';
import type { SearchResult } from '@/types';

interface SearchResultsListProps {
  results:    SearchResult[];
  isLoading:  boolean;
  query:      string;
  error:      Error | null;
  onSelect:   (result: SearchResult) => void;
  testID?:    string;
}

export function SearchResultsList({
  results,
  isLoading,
  query,
  error,
  onSelect,
  testID,
}: SearchResultsListProps) {
  // Loading state
  if (isLoading && results.length === 0) {
    return (
      <View style={styles.center} testID="search-loading">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Searching…</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.center} testID="search-error">
        <Text style={styles.errorEmoji}>😔</Text>
        <Text style={styles.errorTitle}>Search failed</Text>
        <Text style={styles.errorSubtitle}>{error.message}</Text>
      </View>
    );
  }

  // Empty state (only show when user has typed something meaningful)
  if (!isLoading && results.length === 0 && query.length >= 2) {
    return (
      <View style={styles.center} testID="search-empty">
        <Text style={styles.emptyEmoji}>🔍</Text>
        <Text style={styles.emptyTitle}>No bathrooms found</Text>
        <Text style={styles.emptySubtitle}>
          Try a different name, address, or city
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <SearchResultItem
          result={item}
          onPress={onSelect}
          testID={`result-item-${index}`}
        />
      )}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      testID={testID}
      ListFooterComponent={
        isLoading && results.length > 0
          ? <ActivityIndicator style={styles.footerLoader} color="#2563eb" />
          : null
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop:     60,
  },
  loadingText:    { marginTop: 12, fontSize: 14, color: '#6b7280' },
  errorEmoji:     { fontSize: 44, marginBottom: 12 },
  errorTitle:     { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  errorSubtitle:  { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  emptyEmoji:     { fontSize: 44, marginBottom: 12 },
  emptyTitle:     { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle:  { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
  footerLoader:   { paddingVertical: 16 },
});
```

---

## 9. Component — `src/components/search/RecentSearches.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import type { SearchHistoryItem } from '@/types';

interface RecentSearchesProps {
  history:    SearchHistoryItem[];
  onSelect:   (query: string) => void;
  onRemove:   (query: string) => void;
  onClearAll: () => void;
  testID?:    string;
}

export function RecentSearches({
  history,
  onSelect,
  onRemove,
  onClearAll,
  testID,
}: RecentSearchesProps) {
  if (history.length === 0) return null;

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Recent Searches</Text>
        <TouchableOpacity onPress={onClearAll} testID="clear-all-history">
          <Text style={styles.clearAll}>Clear all</Text>
        </TouchableOpacity>
      </View>

      {/* Items */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.query}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => onSelect(item.query)}
            testID={`history-item-${item.query}`}
          >
            <Text style={styles.clockEmoji}>🕐</Text>
            <Text style={styles.itemQuery} numberOfLines={1}>
              {item.query}
            </Text>
            <TouchableOpacity
              onPress={() => onRemove(item.query)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID={`history-remove-${item.query}`}
            >
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingTop:      4,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  title:    { fontSize: 14, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  clearAll: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  item: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 16,
    paddingVertical:   13,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap:            10,
  },
  clockEmoji: { fontSize: 16, color: '#9ca3af' },
  itemQuery: {
    flex:      1,
    fontSize:  15,
    color:     '#374151',
    fontWeight: '500',
  },
  removeIcon: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
});
```

---

## 10. Component — `src/components/search/SearchFilters.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useMapStore, MapFilters } from '@/stores/map.store';

interface FilterChip {
  key:   keyof Pick<MapFilters, 'openNow' | 'accessibleOnly' | 'noCodeRequired'>;
  label: string;
  emoji: string;
}

const CHIPS: FilterChip[] = [
  { key: 'openNow',        label: 'Open Now',   emoji: '🕐' },
  { key: 'accessibleOnly', label: 'Accessible', emoji: '♿' },
  { key: 'noCodeRequired', label: 'No Code',    emoji: '🔓' },
];

interface SearchFiltersProps {
  testID?: string;
}

export function SearchFilters({ testID }: SearchFiltersProps) {
  const { filters, setFilter, hasActiveFilters, resetFilters } = useMapStore();

  return (
    <View style={styles.wrapper} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* Reset chip — only visible when filters active */}
        {hasActiveFilters() && (
          <TouchableOpacity
            style={[styles.chip, styles.chipReset]}
            onPress={resetFilters}
            testID="search-filter-reset"
          >
            <Text style={styles.chipResetText}>✕ Reset</Text>
          </TouchableOpacity>
        )}

        {CHIPS.map(({ key, label, emoji }) => {
          const active = filters[key];
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(key, !active)}
              testID={`search-filter-${key}`}
            >
              <Text style={styles.chipEmoji}>{emoji}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  row: {
    flexDirection:  'row',
    gap:            8,
    paddingHorizontal: 16,
    paddingVertical:   10,
  },
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:      999,
    backgroundColor:   '#f1f5f9',
    borderWidth:       1.5,
    borderColor:       '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#eff6ff',
    borderColor:     '#2563eb',
  },
  chipReset: {
    backgroundColor: '#fef2f2',
    borderColor:     '#fca5a5',
  },
  chipEmoji:       { fontSize: 14 },
  chipLabel:       { fontSize: 13, fontWeight: '600', color: '#374151' },
  chipLabelActive: { color: '#2563eb' },
  chipResetText:   { fontSize: 13, fontWeight: '600', color: '#dc2626' },
});
```

---

## 11. Component — `src/components/search/CityBrowse.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useCityBrowse } from '@/hooks/useSearch';
import type { CityBrowseItem } from '@/types';

interface CityBrowseProps {
  onSelect: (city: string, state: string) => void;
  testID?:  string;
}

export function CityBrowse({ onSelect, testID }: CityBrowseProps) {
  const { data: cities, isLoading } = useCityBrowse();

  if (isLoading) {
    return (
      <View style={styles.center} testID="city-browse-loading">
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!cities || cities.length === 0) return null;

  return (
    <View testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse by City</Text>
      </View>

      <FlatList
        data={cities}
        keyExtractor={(item) => `${item.city}-${item.state}`}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => onSelect(item.city, item.state)}
            testID={`city-item-${item.city}`}
          >
            <Text style={styles.cityEmoji}>🏙️</Text>
            <View style={styles.cityInfo}>
              <Text style={styles.cityName}>
                {item.city}, {item.state}
              </Text>
              <Text style={styles.cityCount}>
                {item.bathroom_count.toLocaleString()} bathroom{item.bathroom_count !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 20, alignItems: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize:      14,
    fontWeight:    '700',
    color:         '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  cityEmoji: { fontSize: 22 },
  cityInfo:  { flex: 1 },
  cityName:  { fontSize: 15, fontWeight: '600', color: '#111827' },
  cityCount: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  chevron:   { fontSize: 20, color: '#d1d5db', fontWeight: '300' },
});
```

---

## 12. Barrel — `src/components/search/index.ts`

```typescript
export { SearchBar }         from './SearchBar';
export { SearchResultItem }  from './SearchResultItem';
export { SearchResultsList } from './SearchResultsList';
export { RecentSearches }    from './RecentSearches';
export { SearchFilters }     from './SearchFilters';
export { CityBrowse }        from './CityBrowse';
```

---

## 13. `app/(tabs)/search.tsx` — FULL REPLACEMENT

```typescript
import React, { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSearch } from '@/hooks/useSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useMapStore } from '@/stores/map.store';
import { analytics } from '@/lib/analytics';
import {
  SearchBar,
  SearchResultsList,
  RecentSearches,
  SearchFilters,
  CityBrowse,
} from '@/components/search';
import type { SearchResult } from '@/types';

export default function SearchTab() {
  const router = useRouter();

  const {
    query,
    debouncedQuery,
    isSearching,
    results,
    error,
    setQuery,
    clearQuery,
  } = useSearch();

  const {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  } = useSearchHistory();

  const { setSelectedBathroom, setRegion } = useMapStore();

  const showResults  = debouncedQuery.length >= 2;
  const showRecent   = !showResults && history.length > 0;
  const showBrowse   = !showResults && history.length === 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelect = useCallback((result: SearchResult) => {
    Keyboard.dismiss();
    addToHistory(result.place_name);
    analytics.track('search_result_tapped');

    // Zoom the map to the selected bathroom and open its detail sheet
    setRegion({
      latitude:       result.latitude,
      longitude:      result.longitude,
      latitudeDelta:  0.005,
      longitudeDelta: 0.005,
    });
    setSelectedBathroom(result.id);

    // Navigate to the map tab to show the detail sheet
    router.push('/(tabs)/');
  }, [addToHistory, setRegion, setSelectedBathroom, router]);

  const handleHistorySelect = useCallback((q: string) => {
    setQuery(q);
  }, [setQuery]);

  const handleCitySelect = useCallback((city: string, state: string) => {
    setQuery(`${city}, ${state}`);
  }, [setQuery]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
      testID="search-tab"
    >
      {/* Search bar */}
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onClear={clearQuery}
        isLoading={isSearching}
        testID="search-bar"
      />

      {/* Filter chips */}
      <SearchFilters testID="search-filters" />

      {/* Content area */}
      <View style={styles.content}>
        {showResults && (
          <SearchResultsList
            results={results}
            isLoading={isSearching}
            query={debouncedQuery}
            error={error}
            onSelect={handleSelect}
            testID="search-results"
          />
        )}

        {showRecent && (
          <RecentSearches
            history={history}
            onSelect={handleHistorySelect}
            onRemove={removeFromHistory}
            onClearAll={clearHistory}
            testID="recent-searches"
          />
        )}

        {showBrowse && (
          <CityBrowse
            onSelect={handleCitySelect}
            testID="city-browse"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
});
```

---

# Validation Block — SDET

## `src/hooks/__tests__/useSearchHistory.test.ts`

```typescript
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn(() => Promise.resolve(null)),
  setItem:    jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('useSearchHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initializes with empty history when storage is empty', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(0));
  });

  it('loads history from AsyncStorage on mount', async () => {
    const stored = JSON.stringify([
      { query: 'Seattle library', searched_at: new Date().toISOString() },
    ]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(stored);

    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    expect(result.current.history[0].query).toBe('Seattle library');
  });

  it('addToHistory prepends and deduplicates', async () => {
    const { result } = renderHook(() => useSearchHistory());

    await act(async () => { await result.current.addToHistory('Pike Place'); });
    await act(async () => { await result.current.addToHistory('City Hall'); });
    await act(async () => { await result.current.addToHistory('Pike Place'); }); // duplicate

    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[0].query).toBe('Pike Place'); // most recent first
  });

  it('addToHistory is case-insensitive for deduplication', async () => {
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => { await result.current.addToHistory('pike place'); });
    await act(async () => { await result.current.addToHistory('Pike Place'); });
    expect(result.current.history).toHaveLength(1);
  });

  it('addToHistory ignores queries shorter than 2 chars', async () => {
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => { await result.current.addToHistory('a'); });
    expect(result.current.history).toHaveLength(0);
  });

  it('caps history at 10 items', async () => {
    const { result } = renderHook(() => useSearchHistory());
    for (let i = 0; i < 12; i++) {
      await act(async () => { await result.current.addToHistory(`query ${i}`); });
    }
    expect(result.current.history).toHaveLength(10);
  });

  it('removeFromHistory deletes the correct item', async () => {
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => { await result.current.addToHistory('First'); });
    await act(async () => { await result.current.addToHistory('Second'); });
    await act(async () => { await result.current.removeFromHistory('First'); });

    expect(result.current.history.map((h) => h.query)).not.toContain('First');
    expect(result.current.history.map((h) => h.query)).toContain('Second');
  });

  it('clearHistory empties the list and calls AsyncStorage.removeItem', async () => {
    const { result } = renderHook(() => useSearchHistory());
    await act(async () => { await result.current.addToHistory('Something'); });
    await act(async () => { await result.current.clearHistory(); });

    expect(result.current.history).toHaveLength(0);
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });
});
```

---

## `src/hooks/__tests__/useSearch.test.ts`

```typescript
jest.mock('@/lib/supabase',  () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',    () => ({ captureException: jest.fn() }));
jest.mock('@/lib/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getLastKnownPositionAsync:     jest.fn().mockResolvedValue({
    coords: { latitude: 47.6, longitude: -122.3 },
  }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn(() => Promise.resolve(null)),
  setItem:    jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearch, useCityBrowse } from '@/hooks/useSearch';
import { supabase, resetSupabaseMocks } from 'src/__mocks__/supabase';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const mockResult = {
  id: 'b-1', place_name: 'Pike Place Restroom',
  address_line1: '85 Pike St', city: 'Seattle', state: 'WA',
  latitude: 47.6097, longitude: -122.3331,
  is_locked: false, is_accessible: true, is_customer_only: false,
  hours_json: null, distance_meters: 500, has_code: true,
  confidence_score: 80, last_verified_at: null, rank: 0.9,
};

describe('useSearch', () => {
  beforeEach(() => resetSupabaseMocks());

  it('starts with empty query and no results', () => {
    const { result } = renderHook(() => useSearch(), { wrapper: makeWrapper() });
    expect(result.current.query).toBe('');
    expect(result.current.results).toHaveLength(0);
    expect(result.current.isSearching).toBe(false);
  });

  it('does not search when query < 2 chars', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: makeWrapper() });
    act(() => result.current.setQuery('a'));
    await new Promise((r) => setTimeout(r, 400)); // wait for debounce
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('searches after debounce when query >= 2 chars', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [mockResult], error: null });

    const { result } = renderHook(() => useSearch(), { wrapper: makeWrapper() });

    act(() => result.current.setQuery('pike'));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith(
      'search_bathrooms',
      expect.objectContaining({ p_query: 'pike' }),
    ), { timeout: 1000 });

    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(result.current.results[0].place_name).toBe('Pike Place Restroom');
  });

  it('clears results and query on clearQuery()', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: makeWrapper() });
    act(() => result.current.setQuery('pike'));
    act(() => result.current.clearQuery());
    expect(result.current.query).toBe('');
  });

  it('returns empty array on RPC error without throwing', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const { result } = renderHook(() => useSearch(), { wrapper: makeWrapper() });
    act(() => result.current.setQuery('seattle'));

    await waitFor(() => expect(result.current.error).not.toBeNull(), { timeout: 1000 });
  });
});

describe('useCityBrowse', () => {
  beforeEach(() => resetSupabaseMocks());

  it('returns city list on success', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [{ city: 'Seattle', state: 'WA', bathroom_count: 42 }],
      error: null,
    });

    const { result } = renderHook(() => useCityBrowse(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].city).toBe('Seattle');
  });
});
```

---

## `src/components/search/__tests__/SearchBar.test.tsx`

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchBar } from '../SearchBar';

describe('SearchBar', () => {
  it('renders placeholder text', () => {
    render(
      <SearchBar value="" onChangeText={jest.fn()} onClear={jest.fn()} testID="bar" />,
    );
    expect(screen.getByTestId('search-input').props.placeholder).toContain('Search');
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    render(
      <SearchBar value="" onChangeText={onChangeText} onClear={jest.fn()} testID="bar" />,
    );
    fireEvent.changeText(screen.getByTestId('search-input'), 'pike place');
    expect(onChangeText).toHaveBeenCalledWith('pike place');
  });

  it('shows clear button when value is non-empty', () => {
    render(
      <SearchBar value="test" onChangeText={jest.fn()} onClear={jest.fn()} testID="bar" />,
    );
    expect(screen.getByTestId('search-clear')).toBeTruthy();
  });

  it('hides clear button when value is empty', () => {
    render(
      <SearchBar value="" onChangeText={jest.fn()} onClear={jest.fn()} testID="bar" />,
    );
    expect(screen.queryByTestId('search-clear')).toBeNull();
  });

  it('calls onClear when clear button pressed', () => {
    const onClear = jest.fn();
    render(
      <SearchBar value="test" onChangeText={jest.fn()} onClear={onClear} testID="bar" />,
    );
    fireEvent.press(screen.getByTestId('search-clear'));
    expect(onClear).toHaveBeenCalled();
  });

  it('shows ActivityIndicator when isLoading=true', () => {
    render(
      <SearchBar
        value="pike"
        onChangeText={jest.fn()}
        onClear={jest.fn()}
        isLoading
        testID="bar"
      />,
    );
    expect(screen.getByTestId('search-spinner')).toBeTruthy();
    expect(screen.queryByText('🔍')).toBeNull();
  });
});
```

---

## `src/components/search/__tests__/SearchResultItem.test.tsx`

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchResultItem } from '../SearchResultItem';
import type { SearchResult } from '@/types';

const freeResult: SearchResult = {
  id: 'r-1', place_name: 'City Hall Restroom',
  address_line1: '1 City Hall Sq', city: 'Seattle', state: 'WA',
  latitude: 47.6, longitude: -122.3,
  is_locked: false, is_accessible: true, is_customer_only: false,
  hours_json: null, distance_meters: 200, has_code: false,
  confidence_score: null, last_verified_at: null, rank: 0.8,
};

const lockedWithCode: SearchResult = {
  ...freeResult, id: 'r-2', is_locked: true, has_code: true,
  confidence_score: 75,
};

describe('SearchResultItem', () => {
  it('renders place name and address', () => {
    render(<SearchResultItem result={freeResult} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('result-name')).toHaveTextContent('City Hall Restroom');
    expect(screen.getByTestId('result-address')).toHaveTextContent('1 City Hall Sq, Seattle, WA');
  });

  it('shows 🔓 for unlocked bathroom', () => {
    render(<SearchResultItem result={freeResult} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('result-code-status')).toHaveTextContent('🔓');
  });

  it('shows 🔑 for locked + code available', () => {
    render(<SearchResultItem result={lockedWithCode} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('result-code-status')).toHaveTextContent('🔑');
  });

  it('shows 🔒 for locked + no code', () => {
    const noCode = { ...freeResult, is_locked: true, has_code: false };
    render(<SearchResultItem result={noCode} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('result-code-status')).toHaveTextContent('🔒');
  });

  it('shows accessible tag when is_accessible=true', () => {
    render(<SearchResultItem result={freeResult} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('tag-accessible')).toBeTruthy();
  });

  it('shows distance tag when distance_meters is present', () => {
    render(<SearchResultItem result={freeResult} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('tag-distance')).toBeTruthy();
  });

  it('calls onPress with the result when tapped', () => {
    const onPress = jest.fn();
    render(<SearchResultItem result={freeResult} onPress={onPress} testID="item" />);
    fireEvent.press(screen.getByTestId('item'));
    expect(onPress).toHaveBeenCalledWith(freeResult);
  });
});
```

---

## `src/components/search/__tests__/RecentSearches.test.tsx`

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RecentSearches } from '../RecentSearches';
import type { SearchHistoryItem } from '@/types';

const history: SearchHistoryItem[] = [
  { query: 'Pike Place', searched_at: new Date().toISOString() },
  { query: 'City Hall',  searched_at: new Date().toISOString() },
];

describe('RecentSearches', () => {
  it('renders nothing when history is empty', () => {
    const { toJSON } = render(
      <RecentSearches history={[]} onSelect={jest.fn()} onRemove={jest.fn()} onClearAll={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders history items', () => {
    render(
      <RecentSearches history={history} onSelect={jest.fn()} onRemove={jest.fn()} onClearAll={jest.fn()} testID="recent" />,
    );
    expect(screen.getByTestId('history-item-Pike Place')).toBeTruthy();
    expect(screen.getByTestId('history-item-City Hall')).toBeTruthy();
  });

  it('calls onSelect with query when item pressed', () => {
    const onSelect = jest.fn();
    render(
      <RecentSearches history={history} onSelect={onSelect} onRemove={jest.fn()} onClearAll={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('history-item-Pike Place'));
    expect(onSelect).toHaveBeenCalledWith('Pike Place');
  });

  it('calls onRemove when remove button pressed', () => {
    const onRemove = jest.fn();
    render(
      <RecentSearches history={history} onSelect={jest.fn()} onRemove={onRemove} onClearAll={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('history-remove-Pike Place'));
    expect(onRemove).toHaveBeenCalledWith('Pike Place');
  });

  it('calls onClearAll when "Clear all" pressed', () => {
    const onClearAll = jest.fn();
    render(
      <RecentSearches history={history} onSelect={jest.fn()} onRemove={jest.fn()} onClearAll={onClearAll} />,
    );
    fireEvent.press(screen.getByTestId('clear-all-history'));
    expect(onClearAll).toHaveBeenCalled();
  });
});
```

---

## `src/components/search/__tests__/SearchFilters.test.tsx`

```typescript
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn(() => Promise.resolve(null)),
  setItem:    jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchFilters } from '../SearchFilters';
import { useMapStore } from '@/stores/map.store';

describe('SearchFilters', () => {
  beforeEach(() => useMapStore.getState().resetFilters());

  it('renders all three filter chips', () => {
    render(<SearchFilters testID="filters" />);
    expect(screen.getByTestId('search-filter-openNow')).toBeTruthy();
    expect(screen.getByTestId('search-filter-accessibleOnly')).toBeTruthy();
    expect(screen.getByTestId('search-filter-noCodeRequired')).toBeTruthy();
  });

  it('toggles openNow filter on press', () => {
    render(<SearchFilters />);
    fireEvent.press(screen.getByTestId('search-filter-openNow'));
    expect(useMapStore.getState().filters.openNow).toBe(true);
    fireEvent.press(screen.getByTestId('search-filter-openNow'));
    expect(useMapStore.getState().filters.openNow).toBe(false);
  });

  it('shows reset chip when filters are active', () => {
    useMapStore.getState().setFilter('openNow', true);
    render(<SearchFilters />);
    expect(screen.getByTestId('search-filter-reset')).toBeTruthy();
  });

  it('reset chip clears all filters', () => {
    useMapStore.getState().setFilter('openNow', true);
    useMapStore.getState().setFilter('accessibleOnly', true);
    render(<SearchFilters />);
    fireEvent.press(screen.getByTestId('search-filter-reset'));
    expect(useMapStore.getState().filters.openNow).toBe(false);
    expect(useMapStore.getState().filters.accessibleOnly).toBe(false);
  });

  it('does not show reset chip when no filters active', () => {
    render(<SearchFilters />);
    expect(screen.queryByTestId('search-filter-reset')).toBeNull();
  });
});
```

---

## Security Validation SQL

```sql
-- ============================================================================
-- Search Security & Performance Tests
-- ============================================================================

-- 1. search_bathrooms never returns non-active bathrooms
select distinct moderation_status
from public.bathrooms
where id in (
  select id from public.search_bathrooms('bathroom', null, null, 50)
);
-- Expected: only 'active'

-- 2. SQL injection resistance via plainto_tsquery
-- plainto_tsquery sanitizes input — no raw SQL injection possible
select public.search_bathrooms(
  $$'; drop table bathrooms; --$$,  -- injection attempt
  null, null, 5
);
-- Expected: returns empty results, no error, no damage

-- 3. Verify GIN index is used for full-text search (run in Supabase Dashboard)
explain analyze
select * from public.search_bathrooms('seattle', 47.6, -122.3, 10);
-- Look for: "Bitmap Index Scan on idx_bathrooms_search_vector"
-- NOT "Seq Scan on bathrooms"

-- 4. search_vector column is populated for existing rows
select count(*) from public.bathrooms where search_vector is null;
-- Expected: 0 (update statement in migration populated all rows)

-- 5. Trigger keeps search_vector in sync after update
-- Update a bathroom name
update public.bathrooms
set place_name = 'Updated Restroom Name'
where id = 'VALID-BATHROOM-ID';

-- Verify search_vector was updated
select search_vector
from public.bathrooms
where id = 'VALID-BATHROOM-ID';
-- Expected: contains lexeme for 'updated', 'restroom', 'name'

-- 6. get_city_browse: only includes active bathrooms in count
select city, state, bathroom_count
from public.get_city_browse(5)
where bathroom_count = 0;
-- Expected: 0 rows (cities with 0 active bathrooms are filtered out by GROUP BY)
```

---

## Performance Notes

- **GIN index on `search_vector`** — PostgreSQL uses bitmap index scans for `@@` queries against GIN. For a table with thousands of bathrooms, this is O(log n) vs O(n) for a seq scan. The `EXPLAIN ANALYZE` check in the security validation block verifies this is working. ✅
- **`plainto_tsquery`** is used instead of `to_tsquery` — it sanitizes free-form user input without crashing on punctuation or SQL-like strings. `to_tsquery('pike & place')` would require users to know tsquery syntax; `plainto_tsquery('pike place')` just works. ✅
- **Debounce at 350ms** — The React state update and Supabase RPC are only triggered after the user pauses typing for 350ms. A fast typist entering "seattle city hall" generates ~1 RPC call instead of 15. The `debounceRef.current` is cleared on each keystroke and the `useRef` cleanup avoids stale closure issues. ✅
- **`placeholderData: (prev) => prev`** — TanStack Query v5 syntax for `keepPreviousData`. Results from the last valid query stay visible while the new query is in-flight. No flash of empty state between keystrokes. ✅
- **`memo()` on `SearchResultItem`** — FlatList re-renders individual items only when their `result` prop reference changes. Since the array is rebuilt on each query response, all items re-render on new search — `memo` prevents re-renders when the parent updates for unrelated reasons (e.g. filter chip toggle). ✅
- **City browse `staleTime: 15min`** — City counts change slowly. This data is fetched once and served from cache for the tab's lifetime in most sessions. ✅

---

## Section 5 Checklist

| Feature | DB | Hook | UI | Tests |
|---------|----|----|------|----|
| Full-text search (`tsvector` + GIN index) | ✅ | ✅ | — | ✅ SQL |
| Proximity-biased ranking | ✅ | ✅ | — | ✅ |
| Debounced search (350ms) | — | ✅ | — | ✅ |
| Search result list (loading/empty/error) | — | — | ✅ | — |
| Color-coded result items | — | — | ✅ | ✅ |
| Select → zoom map + open detail sheet | — | ✅ | ✅ | — |
| Search history (10 items, deduplicated) | — | ✅ | ✅ | ✅ |
| History persistence (AsyncStorage) | — | ✅ | — | ✅ |
| Filter chips (shared with MapStore) | — | — | ✅ | ✅ |
| City browse (no query state) | ✅ | ✅ | ✅ | ✅ |
| SQL injection resistance | ✅ | — | — | ✅ SQL |
| `app/(tabs)/search.tsx` Phase 4 | — | — | ✅ | — |

**Section 5: The Search Tab is complete. Say "Next" for Section 6: The Favorites Tab + Profile Tab, or "Integrated" to verify first.**

## Assistant (commentary)

`2026-03-16T12:33:32.854Z`

Using `$staff-mobile-engineer` again for Section 5. I’m checking the existing search tab, bathroom search API, and filter state so I can integrate this against the current repo instead of layering a second search architecture on top.

## Assistant (commentary)

`2026-03-16T12:34:29.793Z`

Using `$staff-mobile-engineer` again for Section 5. I’m checking the current search tab, bathroom search API, and filter state first so the integration matches this repo’s actual architecture instead of the reference shape.

## Assistant (commentary)

`2026-03-16T12:34:36.025Z`

I’ve got the mobile-engineering constraints loaded. Next I’m reading the existing search screen, bathroom API, and filter store to map the sample onto the code that’s already here.

## Assistant (commentary)

`2026-03-16T12:34:46.945Z`

The current search surface is already wired through `useFilterStore`, `useMapStore`, `searchBathrooms`, and `BathroomCard`. I’m pulling the rest of that path now so I can extend it instead of replacing it with the reference’s alternate store/API stack.

## Assistant (commentary)

`2026-03-16T12:34:56.470Z`

The existing repo already has a basic search implementation plus cache fallback, but it’s still doing `ilike` against the public view and the current Jest setup is pure `ts-jest` on `node`, not RN rendering. I’m checking the bathroom mapping/util layer and migration numbering next so I can ship the new search behavior without breaking the current cache/test harness.

## Assistant (commentary)

`2026-03-16T12:39:21.268Z`

I have the integration points now. The repo already has a search hook, cache layer, shared filters, and a map-selection flow, so I’m keeping those and layering in the new pieces this way:

- Upgrade the data path:
  - add a new `009_search.sql` migration with `search_vector`, `search_bathrooms`, and `get_city_browse`
  - extend Supabase types/parsers so search RPC rows plug into the existing bathroom mapping utilities

- Adapt the client architecture instead of replacing it:
  - keep `useFilterStore` and `useMapStore`
  - upgrade `src/api/bathrooms.ts` and `src/hooks/useSearch.ts` to use the new RPCs with fallback to the current `ilike` path if the migration is not applied yet
  - add recent-search persistence and city-browse hooks that fit the existing storage/query stack

- Rebuild the search tab in repo style:
  - NativeWind-based search components
  - idle state with recent searches plus city browse
  - result selection will set the map region, mark the active bathroom, and route back to the map tab so the bottom sheet can open on that location

- Validate with the current harness:
  - add node/Jest tests for search history helpers and the bathroom search API path
  - then run `npm run type-check`, `npm run lint`, and `npm test -- --runInBand`

## Assistant (commentary)

`2026-03-16T12:39:23.029Z`

I’m starting the code changes now. First pass is schema/types/api/search-history so the screen components land on top of a working data layer instead of introducing UI against missing contracts.

## Assistant (commentary)

`2026-03-16T12:41:50.282Z`

The first patch was too broad against a few files that have drifted since the earlier sections. I’m splitting the edits into smaller atomic patches so I can land the data-layer changes cleanly without clobbering unrelated work.

## Assistant (commentary)

`2026-03-16T12:44:11.471Z`

I’m on the UI layer now. The repo’s search tab already uses NativeWind cards and shared stores, so these new components are being built in that style rather than the sample’s `StyleSheet`/alternate-store approach.

## Assistant (commentary)

`2026-03-16T12:45:43.586Z`

I’ve landed the new search screen and components on top of the upgraded data path. I’m doing a cleanup pass now for interaction edge cases and type-level issues before I run the full validation commands.

## Assistant (commentary)

`2026-03-16T12:46:18.492Z`

The runtime layer is in place. I’m adding pure-node Jest coverage now for the new search utilities, storage-backed history, and the API fallback/RPC paths, because this repo’s current harness doesn’t support the RN component tests from the reference block.

## Assistant (commentary)

`2026-03-16T12:47:14.409Z`

The search code is all in. I’m running type-check now to catch integration mismatches before lint/tests, then I’ll fix whatever the compiler surfaces.

## Assistant (commentary)

`2026-03-16T12:48:11.518Z`

Type-check is clean. I’m running lint next; after that I’ll run the full Jest suite and fix whatever integration issues show up there.

## Assistant (commentary)

`2026-03-16T12:48:59.908Z`

The compiler and tests are both green. I’m making one last small robustness tweak in `useSearchHistory` so fast repeated updates cannot race on stale state, then I’ll re-run the checks quickly.

## Assistant (final_answer)

`2026-03-16T12:50:21.895Z`

Section 5 is integrated against the current repo shape, not the sample’s alternate store/API layout.

The main changes are in [search.tsx](C:\Users\T\Desktop\PeeDom\app\(tabs)\search.tsx), [bathrooms.ts](C:\Users\T\Desktop\PeeDom\src\api\bathrooms.ts), [useSearch.ts](C:\Users\T\Desktop\PeeDom\src\hooks\useSearch.ts), and the new search UI under [src/components/search](C:\Users\T\Desktop\PeeDom\src\components\search). The tab now supports recent-search persistence, city browse when idle, shared filter chips, and result selection that recenters the map and reopens the map flow on the selected bathroom. I kept the existing `useFilterStore` / `useMapStore` / favorites architecture instead of introducing a parallel search stack.

On the data side, I added [009_search.sql](C:\Users\T\Desktop\PeeDom\supabase\migrations\009_search.sql) because this repo already had migrations through `008`. That migration adds `search_vector`, a proximity-biased `search_bathrooms` RPC, and `get_city_browse`. The client path is defensive: [bathrooms.ts](C:\Users\T\Desktop\PeeDom\src\api\bathrooms.ts) uses the new RPCs when present and falls back to the existing `ilike`/grouping behavior if the migration has not been applied yet. History storage and validation live in [search-history.ts](C:\Users\T\Desktop\PeeDom\src\lib\search-history.ts), [search.ts](C:\Users\T\Desktop\PeeDom\src\utils\search.ts), and [src/lib/validators](C:\Users\T\Desktop\PeeDom\src\lib\validators).

Validation passed:
- `npm run type-check`
- `npm run lint`
- `npm test -- --runInBand`

If you want the DB side live, the remaining step is applying [009_search.sql](C:\Users\T\Desktop\PeeDom\supabase\migrations\009_search.sql).

## User

`2026-03-19T07:09:01.829Z`

<environment_context>
  <shell>powershell</shell>
  <current_date>2026-03-19</current_date>
  <timezone>America/Los_Angeles</timezone>
</environment_context>

## User

`2026-03-19T07:09:01.831Z`

alright continue

## Assistant (final_answer)

`2026-03-19T07:09:16.918Z`

Send the Section 6 block and I’ll continue integrating it against the current repo.

## User

`2026-03-19T07:10:36.053Z`

Clean. No conflicts. Beginning output.

---

# Section 6: Favorites Tab + Profile Tab

## Terminal Commands

```bash
# No new packages needed
```

---

## 1. Database — `supabase/migrations/008_favorites_profile.sql`

```sql
-- ============================================================================
-- PeeDom Favorites & Profile Migration
-- 008_favorites_profile.sql
-- ============================================================================

-- ─── RPC: get_user_favorites ─────────────────────────────────────────────────
-- Returns user's favorited bathrooms with code summary and distance.
-- Distance is null when no coordinates provided.

create or replace function public.get_user_favorites(
  p_user_lat double precision default null,
  p_user_lng double precision default null
)
returns table (
  bathroom_id      uuid,
  place_name       text,
  address_line1    text,
  city             text,
  state            text,
  latitude         double precision,
  longitude        double precision,
  is_locked        boolean,
  is_accessible    boolean,
  is_customer_only boolean,
  hours_json       jsonb,
  distance_meters  double precision,
  has_code         boolean,
  confidence_score numeric,
  last_verified_at timestamptz,
  favorited_at     timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with user_favs as (
    select
      f.bathroom_id,
      f.created_at as favorited_at
    from public.favorites f
    where f.user_id = auth.uid()
  ),
  code_summary as (
    select distinct on (bac.bathroom_id)
      bac.bathroom_id,
      true                   as has_code,
      bac.confidence_score,
      bac.last_verified_at
    from public.bathroom_access_codes bac
    where bac.visibility_status = 'visible'
      and bac.lifecycle_status  = 'active'
    order by bac.bathroom_id, bac.confidence_score desc, bac.last_verified_at desc nulls last
  )
  select
    b.id                                                  as bathroom_id,
    b.place_name,
    b.address_line1,
    b.city,
    b.state,
    b.latitude,
    b.longitude,
    b.is_locked,
    b.is_accessible,
    b.is_customer_only,
    b.hours_json,
    case
      when p_user_lat is not null and p_user_lng is not null then
        ST_Distance(
          b.geom,
          ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
        )
      else null
    end                                                   as distance_meters,
    coalesce(cs.has_code, false)                          as has_code,
    cs.confidence_score,
    cs.last_verified_at,
    uf.favorited_at
  from user_favs uf
  join public.bathrooms b on b.id = uf.bathroom_id
    and b.moderation_status = 'active'
  left join code_summary cs on cs.bathroom_id = b.id
  order by uf.favorited_at desc;
$$;

-- ─── RPC: update_notification_prefs ──────────────────────────────────────────

create or replace function public.update_notification_prefs(
  p_prefs jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set notification_prefs = p_prefs,
      updated_at          = now()
  where id = auth.uid();
$$;

-- ─── RPC: update_display_name ────────────────────────────────────────────────

create or replace function public.update_display_name(
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if length(trim(p_display_name)) < 2 then
    return jsonb_build_object('success', false, 'error', 'name_too_short');
  end if;

  if length(trim(p_display_name)) > 50 then
    return jsonb_build_object('success', false, 'error', 'name_too_long');
  end if;

  update public.profiles
  set display_name = trim(p_display_name),
      updated_at   = now()
  where id = auth.uid();

  return jsonb_build_object('success', true);
end;
$$;
```

---

## 2. Types — additions to `src/types/index.ts`

```typescript
// ============================================================================
// FAVORITES TYPES
// ============================================================================

export interface FavoriteBathroom {
  bathroom_id:      string;
  place_name:       string;
  address_line1:    string | null;
  city:             string | null;
  state:            string | null;
  latitude:         number;
  longitude:        number;
  is_locked:        boolean | null;
  is_accessible:    boolean | null;
  is_customer_only: boolean;
  hours_json:       HoursData | null;
  distance_meters:  number | null;
  has_code:         boolean;
  confidence_score: number | null;
  last_verified_at: string | null;
  favorited_at:     string;
}

// ─── Profile update types ─────────────────────────────────────────────────────

export interface UpdateDisplayNameResult {
  success: boolean;
  error?:  string;
}
```

---

## 3. `src/hooks/useFavorites.ts` — NEW

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { analytics } from '@/lib/analytics';
import { useRecordContribution } from '@/hooks/usePoints';
import { detailQueryKeys } from '@/hooks/useBathroomDetail';
import type { FavoriteBathroom, NotificationPrefs, UpdateDisplayNameResult } from '@/types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const favoritesQueryKeys = {
  list: (userId: string) => ['favorites', 'list', userId] as const,
};

// ─── Get user's favorite bathrooms ───────────────────────────────────────────

export function useFavorites(userId: string) {
  return useQuery<FavoriteBathroom[], Error>({
    queryKey: favoritesQueryKeys.list(userId),
    queryFn:  async () => {
      // Best-effort location for distance calculation
      let lat: number | null = null;
      let lng: number | null = null;

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getLastKnownPositionAsync();
          if (pos) {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          }
        }
      } catch {
        // Non-blocking — show favorites without distance
      }

      const { data, error } = await supabase.rpc('get_user_favorites', {
        p_user_lat: lat,
        p_user_lng: lng,
      });

      if (error) throw new Error(error.message);
      return (data ?? []) as FavoriteBathroom[];
    },
    enabled:   Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Toggle favorite from the favorites list ─────────────────────────────────

export function useRemoveFavorite(userId: string) {
  const queryClient   = useQueryClient();

  return useMutation<{ success: boolean; favorited: boolean }, Error, { bathroomId: string }>({
    mutationFn: async ({ bathroomId }) => {
      const { data, error } = await supabase.rpc('toggle_favorite', {
        p_bathroom_id: bathroomId,
      });
      if (error) throw new Error(error.message);
      return data as { success: boolean; favorited: boolean };
    },

    // Optimistic removal from list
    onMutate: async ({ bathroomId }) => {
      const listKey = favoritesQueryKeys.list(userId);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<FavoriteBathroom[]>(listKey);

      queryClient.setQueryData<FavoriteBathroom[]>(
        listKey,
        (old) => old?.filter((f) => f.bathroom_id !== bathroomId) ?? [],
      );

      return { previous, listKey };
    },

    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(context.listKey, context.previous);
      captureException(_err, { context: 'useRemoveFavorite' });
    },

    onSuccess: (_result, { bathroomId }) => {
      analytics.track('bathroom_unfavorited');
      // Also update detail cache if it's loaded
      queryClient.setQueryData(
        detailQueryKeys.detail(bathroomId),
        (old: any) => old ? { ...old, is_favorited: false } : old,
      );
    },
  });
}

// ─── Update notification preferences ─────────────────────────────────────────

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { prefs: NotificationPrefs }>({
    mutationFn: async ({ prefs }) => {
      const { error } = await supabase.rpc('update_notification_prefs', {
        p_prefs: prefs,
      });
      if (error) throw new Error(error.message);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },

    onError: (error) => {
      captureException(error, { context: 'useUpdateNotificationPrefs' });
    },
  });
}

// ─── Update display name ──────────────────────────────────────────────────────

export function useUpdateDisplayName() {
  return useMutation<UpdateDisplayNameResult, Error, { displayName: string }>({
    mutationFn: async ({ displayName }) => {
      const { data, error } = await supabase.rpc('update_display_name', {
        p_display_name: displayName,
      });
      if (error) throw new Error(error.message);
      return data as UpdateDisplayNameResult;
    },

    onError: (error) => {
      captureException(error, { context: 'useUpdateDisplayName' });
    },
  });
}
```

---

## 4. Component — `src/components/favorites/FavoriteItem.tsx`

```typescript
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  getMarkerColor,
  getMarkerHex,
  formatDistance,
  isCurrentlyOpen,
  formatSearchAddress,
  type FavoriteBathroom,
} from '@/types';
import { useRemoveFavorite } from '@/hooks/useFavorites';
import { useSessionStore } from '@/stores/session.store';

interface FavoriteItemProps {
  item:     FavoriteBathroom;
  onPress:  (item: FavoriteBathroom) => void;
  testID?:  string;
}

export const FavoriteItem = memo(function FavoriteItem({
  item,
  onPress,
  testID,
}: FavoriteItemProps) {
  const { user }    = useSessionStore();
  const remove      = useRemoveFavorite(user?.id ?? '');

  const color      = getMarkerColor(item);
  const hex        = getMarkerHex(color);
  const openStatus = isCurrentlyOpen(item.hours_json);
  const address    = formatSearchAddress({
    address_line1: item.address_line1,
    city:          item.city,
    state:         item.state,
  } as any);

  const handleRemove = () => {
    Alert.alert(
      'Remove Favorite',
      `Remove ${item.place_name} from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:    'Remove',
          style:   'destructive',
          onPress: () => remove.mutate({ bathroomId: item.bathroom_id }),
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      testID={testID}
    >
      {/* Color indicator */}
      <View style={[styles.indicator, { backgroundColor: hex }]} />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1} testID="fav-name">
          {item.place_name}
        </Text>

        {address.length > 0 && (
          <Text style={styles.address} numberOfLines={1} testID="fav-address">
            {address}
          </Text>
        )}

        {/* Tags */}
        <View style={styles.tags}>
          {item.distance_meters !== null && (
            <Tag label={formatDistance(item.distance_meters)} color="#2563eb" testID="fav-distance" />
          )}
          {openStatus === true  && <Tag label="Open Now" color="#16a34a" testID="fav-open" />}
          {openStatus === false && <Tag label="Closed"   color="#dc2626" testID="fav-closed" />}
          {item.is_accessible   && <Tag label="♿"        color="#7c3aed" testID="fav-accessible" />}

          {/* Code status */}
          {item.is_locked === false ? (
            <Tag label="🔓 Free" color="#16a34a" testID="fav-free" />
          ) : item.has_code ? (
            <Tag label="🔑 Code" color="#d97706" testID="fav-code" />
          ) : (
            <Tag label="🔒 No code" color="#9ca3af" testID="fav-nocode" />
          )}
        </View>
      </View>

      {/* Remove button */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={handleRemove}
        disabled={remove.isPending}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID="fav-remove"
      >
        <Text style={styles.removeIcon}>❤️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

function Tag({ label, color, testID }: { label: string; color: string; testID?: string }) {
  return (
    <View style={[styles.tag, { borderColor: color + '40' }]} testID={testID}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical:   14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
    backgroundColor: '#ffffff',
  },
  indicator: {
    width:        4,
    height:       48,
    borderRadius: 2,
    flexShrink:   0,
  },
  info: { flex: 1, gap: 4 },
  name: {
    fontSize:   15,
    fontWeight: '600',
    color:      '#111827',
  },
  address: {
    fontSize: 12,
    color:    '#6b7280',
  },
  tags: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           5,
    marginTop:     2,
  },
  tag: {
    borderWidth:       1,
    borderRadius:      999,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
  removeButton: {
    padding: 4,
  },
  removeIcon: { fontSize: 22 },
});
```

---

## 5. Component — `src/components/favorites/FavoritesEmptyState.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface FavoritesEmptyStateProps {
  isGuest: boolean;
  testID?: string;
}

export function FavoritesEmptyState({ isGuest, testID }: FavoritesEmptyStateProps) {
  const router = useRouter();

  if (isGuest) {
    return (
      <View style={styles.container} testID={testID}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>Sign in to save favorites</Text>
        <Text style={styles.subtitle}>
          Keep track of your go-to bathrooms by signing in to your account.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(auth)/login')}
          testID="sign-in-cta"
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.emoji}>🤍</Text>
      <Text style={styles.title}>No favorites yet</Text>
      <Text style={styles.subtitle}>
        Tap the ♡ on any bathroom to save it here for quick access.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(tabs)/')}
        testID="explore-map-cta"
      >
        <Text style={styles.buttonText}>Explore the Map</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom:  60,
  },
  emoji:    { fontSize: 56, marginBottom: 16 },
  title:    { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  button: {
    backgroundColor:   '#2563eb',
    paddingHorizontal: 28,
    paddingVertical:   13,
    borderRadius:      10,
  },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
```

---

## 6. Component — `src/components/favorites/FavoritesListHeader.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FavoritesListHeaderProps {
  count: number;
  testID?: string;
}

export function FavoritesListHeader({ count, testID }: FavoritesListHeaderProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.count} testID="favorites-count">
        {count} saved {count === 1 ? 'bathroom' : 'bathrooms'}
      </Text>
      <Text style={styles.hint}>Tap to open on map • ❤️ to remove</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical:   12,
    backgroundColor:   '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  count: { fontSize: 13, fontWeight: '700', color: '#374151' },
  hint:  { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});
```

---

## 7. Barrel — `src/components/favorites/index.ts`

```typescript
export { FavoriteItem }          from './FavoriteItem';
export { FavoritesEmptyState }   from './FavoritesEmptyState';
export { FavoritesListHeader }   from './FavoritesListHeader';
```

---

## 8. `app/(tabs)/favorites.tsx` — FULL REPLACEMENT

```typescript
import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/stores/session.store';
import { useFavorites } from '@/hooks/useFavorites';
import { useMapStore } from '@/stores/map.store';
import { analytics } from '@/lib/analytics';
import {
  FavoriteItem,
  FavoritesEmptyState,
  FavoritesListHeader,
} from '@/components/favorites';
import type { FavoriteBathroom } from '@/types';

export default function FavoritesTab() {
  const router = useRouter();
  const { isAuthenticated, isGuest } = useAuth();
  const { user } = useSessionStore();
  const { setSelectedBathroom, setRegion } = useMapStore();

  const {
    data: favorites,
    isLoading,
    refetch,
    isRefetching,
  } = useFavorites(user?.id ?? '');

  const handleSelect = useCallback((item: FavoriteBathroom) => {
    analytics.track('search_result_tapped');

    // Zoom map to bathroom and open detail sheet
    setRegion({
      latitude:       item.latitude,
      longitude:      item.longitude,
      latitudeDelta:  0.005,
      longitudeDelta: 0.005,
    });
    setSelectedBathroom(item.bathroom_id);

    // Navigate to map tab
    router.push('/(tabs)/');
  }, [setRegion, setSelectedBathroom, router]);

  // ── Guest / unauthenticated ───────────────────────────────────────────────

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="favorites-tab">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Favorites</Text>
        </View>
        <FavoritesEmptyState isGuest testID="empty-state" />
      </SafeAreaView>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="favorites-tab">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Favorites</Text>
        </View>
        <View style={styles.center} testID="favorites-loading">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty (authenticated) ─────────────────────────────────────────────────

  const isEmpty = !favorites || favorites.length === 0;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
      testID="favorites-tab"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      {isEmpty ? (
        <FavoritesEmptyState isGuest={false} testID="empty-state" />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.bathroom_id}
          ListHeaderComponent={
            <FavoritesListHeader
              count={favorites.length}
              testID="list-header"
            />
          }
          renderItem={({ item, index }) => (
            <FavoriteItem
              item={item}
              onPress={handleSelect}
              testID={`favorite-item-${index}`}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2563eb"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          testID="favorites-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize:   22,
    fontWeight: '800',
    color:      '#111827',
  },
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
});
```

---

## 9. Component — `src/components/profile/ProfileHeader.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useUpdateDisplayName } from '@/hooks/useFavorites';
import { useUIStore } from '@/stores/ui.store';
import { LevelProgressBar } from '@/components/gamification/LevelProgressBar';
import { StreakBadge } from '@/components/gamification/StreakBadge';
import type { UserProfile } from '@/types';

interface ProfileHeaderProps {
  profile:       UserProfile;
  currentStreak: number;
  testID?:       string;
}

export function ProfileHeader({ profile, currentStreak, testID }: ProfileHeaderProps) {
  const [isEditing,    setEditing]     = useState(false);
  const [draftName,    setDraftName]   = useState(profile.display_name ?? '');
  const updateName     = useUpdateDisplayName();
  const { showToast }  = useUIStore();

  const handleSaveName = async () => {
    if (draftName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Display name must be at least 2 characters.');
      return;
    }

    const result = await updateName.mutateAsync({ displayName: draftName.trim() });

    if (result.success) {
      showToast('Display name updated!', 'success');
      setEditing(false);
    } else {
      showToast(result.error ?? 'Update failed', 'error');
    }
  };

  const initials = (profile.display_name ?? profile.email ?? '?')
    .split(' ')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);

  return (
    <View style={styles.container} testID={testID}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar} testID="profile-avatar">
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {profile.is_premium && (
          <View style={styles.premiumBadge} testID="premium-badge">
            <Text style={styles.premiumText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Name */}
      {isEditing ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.nameInput}
            value={draftName}
            onChangeText={setDraftName}
            autoFocus
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={handleSaveName}
            testID="display-name-input"
          />
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveName}
            disabled={updateName.isPending}
            testID="save-name-button"
          >
            {updateName.isPending
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <Text style={styles.saveText}>Save</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setEditing(false); setDraftName(profile.display_name ?? ''); }}
            testID="cancel-edit-button"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.nameRow}
          onPress={() => setEditing(true)}
          testID="edit-name-button"
        >
          <Text style={styles.name} testID="display-name">
            {profile.display_name ?? 'Set your name'}
          </Text>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
      )}

      {/* Email */}
      <Text style={styles.email} testID="profile-email">
        {profile.email ?? ''}
      </Text>

      {/* Role badge */}
      {profile.role !== 'user' && (
        <View style={[styles.roleBadge, profile.role === 'admin' && styles.roleAdmin]}>
          <Text style={styles.roleText}>
            {profile.role === 'admin' ? '🛡️ Admin' : '🏢 Business'}
          </Text>
        </View>
      )}

      {/* Streak */}
      <View style={styles.streakRow}>
        <StreakBadge streak={currentStreak} testID="streak-badge" />
      </View>

      {/* Level progress */}
      <View style={styles.levelRow}>
        <LevelProgressBar
          points={profile.points_balance}
          testID="level-bar"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems:        'center',
    paddingVertical:   24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor:   '#ffffff',
  },
  // Avatar
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: '#2563eb',
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  premiumBadge: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    backgroundColor: '#d97706',
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:    999,
    borderWidth:     2,
    borderColor:     '#ffffff',
  },
  premiumText: { fontSize: 9, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  // Name
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  4,
  },
  name:     { fontSize: 22, fontWeight: '800', color: '#111827' },
  editIcon: { fontSize: 14 },
  // Edit row
  editRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    marginBottom:  4,
    width:         '100%',
  },
  nameInput: {
    flex:            1,
    fontSize:        18,
    fontWeight:      '700',
    color:           '#111827',
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingVertical: 4,
  },
  saveButton: {
    backgroundColor:   '#2563eb',
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      8,
  },
  saveText:   { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  cancelText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  // Email + role
  email: { fontSize: 13, color: '#9ca3af', marginBottom: 8 },
  roleBadge: {
    backgroundColor:   '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderRadius:      999,
    marginBottom:      12,
  },
  roleAdmin: { backgroundColor: '#fee2e2' },
  roleText:  { fontSize: 12, fontWeight: '700', color: '#374151' },
  // Streak + level
  streakRow: { marginBottom: 14 },
  levelRow:  { width: '100%' },
});
```

---

## 10. Component — `src/components/profile/StatsGrid.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { UserStats } from '@/types';

interface StatsGridProps {
  stats:  UserStats;
  testID?: string;
}

interface StatCell {
  label: string;
  emoji: string;
  value: (s: UserStats) => number | string;
  testID: string;
}

const STAT_CELLS: StatCell[] = [
  { label: 'Bathrooms\nAdded',     emoji: '🚽', value: (s) => s.bathrooms_added,    testID: 'stat-bathrooms'   },
  { label: 'Codes\nSubmitted',     emoji: '🔑', value: (s) => s.codes_submitted,    testID: 'stat-codes'       },
  { label: 'Codes\nVerified',      emoji: '✅', value: (s) => s.codes_verified,     testID: 'stat-verified'    },
  { label: 'Photos\nUploaded',     emoji: '📸', value: (s) => s.photos_uploaded,    testID: 'stat-photos'      },
  { label: 'Votes\nCast',          emoji: '🗳️', value: (s) => s.votes_cast,         testID: 'stat-votes'       },
  { label: 'Reports\nSubmitted',   emoji: '📋', value: (s) => s.reports_submitted,  testID: 'stat-reports'     },
  { label: 'Total\nContributions', emoji: '⭐', value: (s) => s.total_contributions, testID: 'stat-total'      },
  { label: 'Badges\nEarned',       emoji: '🏅', value: (s) => s.badges_earned,      testID: 'stat-badges'      },
];

export function StatsGrid({ stats, testID }: StatsGridProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.sectionTitle}>Contributions</Text>
      <View style={styles.grid}>
        {STAT_CELLS.map((cell) => (
          <View key={cell.testID} style={styles.cell} testID={cell.testID}>
            <Text style={styles.cellEmoji}>{cell.emoji}</Text>
            <Text style={styles.cellValue}>
              {cell.value(stats).toLocaleString()}
            </Text>
            <Text style={styles.cellLabel}>{cell.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical:   20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize:      14,
    fontWeight:    '700',
    color:         '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           1,
    backgroundColor: '#f1f5f9',
    borderRadius:    12,
    overflow:        'hidden',
  },
  cell: {
    width:           '25%',
    alignItems:      'center',
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    gap:             4,
  },
  cellEmoji: { fontSize: 22 },
  cellValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  cellLabel: { fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 13 },
});
```

---

## 11. Component — `src/components/profile/BadgesGrid.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useUserBadges, useBadgeDefinitions } from '@/hooks/useBadges';
import type { BadgeDefinition } from '@/types';

interface BadgesGridProps {
  userId: string;
  testID?: string;
}

export function BadgesGrid({ userId, testID }: BadgesGridProps) {
  const { data: userBadges, isLoading: loadingEarned } = useUserBadges(userId);
  const { data: allBadges, isLoading: loadingDefs }    = useBadgeDefinitions();
  const [selectedBadge, setSelectedBadge]              = useState<BadgeDefinition | null>(null);

  if (loadingEarned || loadingDefs) {
    return (
      <View style={styles.center} testID={testID}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  const earnedIds  = new Set(userBadges?.map((b) => b.badge_id) ?? []);
  const sortedBadges = (allBadges ?? []).sort((a, b) => {
    // Earned badges first
    const aEarned = earnedIds.has(a.id) ? 0 : 1;
    const bEarned = earnedIds.has(b.id) ? 0 : 1;
    return aEarned - bEarned;
  });

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.sectionTitle}>
        Badges
        <Text style={styles.count}> {earnedIds.size}/{allBadges?.length ?? 0}</Text>
      </Text>

      <FlatList
        data={sortedBadges}
        keyExtractor={(item) => item.id}
        numColumns={4}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const earned = earnedIds.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.badge, !earned && styles.badgeLocked]}
              onPress={() => setSelectedBadge(item)}
              testID={`badge-${item.id}`}
            >
              <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>
                {earned ? item.emoji : '🔒'}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Badge detail modal */}
      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
        testID="badge-detail-modal"
      >
        <Pressable style={styles.backdrop} onPress={() => setSelectedBadge(null)}>
          <Pressable style={styles.detailCard} onPress={() => {}}>
            {selectedBadge && (
              <>
                <Text style={styles.detailEmoji}>
                  {earnedIds.has(selectedBadge.id) ? selectedBadge.emoji : '🔒'}
                </Text>
                <Text style={styles.detailName} testID="badge-detail-name">
                  {selectedBadge.name}
                </Text>
                <Text style={styles.detailDesc} testID="badge-detail-description">
                  {selectedBadge.description}
                </Text>
                {selectedBadge.bonus_points > 0 && (
                  <Text style={styles.detailBonus}>
                    +{selectedBadge.bonus_points} bonus points
                  </Text>
                )}
                {!earnedIds.has(selectedBadge.id) && (
                  <Text style={styles.detailLocked}>Not yet earned</Text>
                )}
                <TouchableOpacity
                  style={styles.detailClose}
                  onPress={() => setSelectedBadge(null)}
                  testID="badge-detail-close"
                >
                  <Text style={styles.detailCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical:   20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  center: { paddingVertical: 20, alignItems: 'center' },
  sectionTitle: {
    fontSize:      14,
    fontWeight:    '700',
    color:         '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  16,
  },
  count: { color: '#2563eb' },
  row:   { gap: 8, marginBottom: 8 },
  badge: {
    width:          72,
    height:         72,
    borderRadius:   16,
    backgroundColor: '#f1f5f9',
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    2,
    borderColor:    '#e2e8f0',
  },
  badgeLocked: { opacity: 0.4 },
  badgeEmoji:       { fontSize: 32 },
  badgeEmojiLocked: { fontSize: 28 },
  // Modal
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         32,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius:    20,
    padding:         28,
    alignItems:      'center',
    width:           '100%',
    maxWidth:        300,
  },
  detailEmoji:  { fontSize: 52, marginBottom: 12 },
  detailName:   { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6, textAlign: 'center' },
  detailDesc:   { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  detailBonus:  { fontSize: 13, color: '#16a34a', fontWeight: '700', marginBottom: 12 },
  detailLocked: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginBottom: 12 },
  detailClose: {
    backgroundColor:   '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical:   9,
    borderRadius:      8,
    marginTop:         4,
  },
  detailCloseText: { color: '#374151', fontWeight: '600', fontSize: 14 },
});
```

---

## 12. Component — `src/components/profile/PointsHistoryList.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { usePointHistory } from '@/hooks/usePoints';
import type { PointEvent, PointEventType } from '@/types';

const EVENT_LABELS: Record<PointEventType, { label: string; emoji: string }> = {
  add_bathroom:             { label: 'Added bathroom',    emoji: '🚽' },
  code_submitted:           { label: 'Code submitted',    emoji: '🔑' },
  code_verified_by_others:  { label: 'Code verified',     emoji: '✅' },
  code_vote_cast:           { label: 'Code verified',     emoji: '✅' },
  photo_uploaded:           { label: 'Photo uploaded',    emoji: '📸' },
  report_submitted:         { label: 'Report submitted',  emoji: '📋' },
  cleanliness_rated:        { label: 'Cleanliness rated', emoji: '⭐' },
  favorite_added:           { label: 'Bathroom favorited',emoji: '❤️' },
  streak_bonus:             { label: 'Streak bonus!',     emoji: '🔥' },
  badge_bonus:              { label: 'Badge earned!',     emoji: '🏅' },
  premium_purchase:         { label: 'Premium activated', emoji: '👑' },
  admin_adjustment:         { label: 'Adjustment',        emoji: '⚙️' },
};

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86_400_000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface PointsHistoryListProps {
  userId: string;
  testID?: string;
}

export function PointsHistoryList({ userId, testID }: PointsHistoryListProps) {
  const { data: events, isLoading } = usePointHistory(userId);

  if (isLoading) {
    return (
      <View style={styles.center} testID={testID}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!events || events.length === 0) {
    return (
      <View style={styles.empty} testID={testID}>
        <Text style={styles.emptyText}>
          No point history yet — start contributing to earn points!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.sectionTitle}>Recent Points</Text>
      <FlatList
        data={events.slice(0, 20)}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => <PointEventRow event={item} />}
      />
    </View>
  );
}

function PointEventRow({ event }: { event: PointEvent }) {
  const info = EVENT_LABELS[event.event_type as PointEventType] ?? {
    label: event.event_type,
    emoji: '⭐',
  };

  return (
    <View style={styles.row} testID={`point-event-${event.id}`}>
      <Text style={styles.rowEmoji}>{info.emoji}</Text>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{info.label}</Text>
        <Text style={styles.rowDate}>{formatEventDate(event.created_at)}</Text>
      </View>
      <Text
        style={[styles.rowPoints, event.points < 0 && styles.rowPointsNeg]}
        testID="event-points"
      >
        {event.points > 0 ? '+' : ''}{event.points}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical:   20,
  },
  center: { paddingVertical: 24, alignItems: 'center' },
  empty: {
    paddingHorizontal: 16,
    paddingVertical:   20,
  },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' },
  sectionTitle: {
    fontSize:      14,
    fontWeight:    '700',
    color:         '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  12,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  rowEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  rowInfo:  { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  rowDate:  { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  rowPoints: {
    fontSize:   15,
    fontWeight: '800',
    color:      '#16a34a',
  },
  rowPointsNeg: { color: '#dc2626' },
});
```

---

## 13. Component — `src/components/profile/NotificationPrefsCard.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useUpdateNotificationPrefs } from '@/hooks/useFavorites';
import { useUIStore } from '@/stores/ui.store';
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@/types';

interface NotificationPrefsCardProps {
  currentPrefs?: NotificationPrefs | null;
  testID?:       string;
}

interface PrefRow {
  key:         keyof NotificationPrefs;
  label:       string;
  description: string;
  emoji:       string;
}

const PREF_ROWS: PrefRow[] = [
  {
    key:         'code_verified',
    label:       'Code Verified',
    description: 'When your submitted codes get verified',
    emoji:       '✅',
  },
  {
    key:         'favorite_update',
    label:       'Favorite Updates',
    description: 'New codes for your saved bathrooms',
    emoji:       '❤️',
  },
  {
    key:         'streak_reminder',
    label:       'Streak Reminder',
    description: 'Daily nudge to keep your streak going',
    emoji:       '🔥',
  },
  {
    key:         'nearby_new',
    label:       'Nearby New Bathrooms',
    description: 'When new bathrooms are added near you',
    emoji:       '📍',
  },
];

export function NotificationPrefsCard({ currentPrefs, testID }: NotificationPrefsCardProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    currentPrefs ?? DEFAULT_NOTIFICATION_PREFS,
  );
  const updatePrefs  = useUpdateNotificationPrefs();
  const { showToast} = useUIStore();

  const handleToggle = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);  // optimistic

    try {
      await updatePrefs.mutateAsync({ prefs: next });
    } catch {
      setPrefs(prefs); // rollback
      showToast('Failed to update preferences', 'error');
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {updatePrefs.isPending && (
          <ActivityIndicator size="small" color="#2563eb" testID="prefs-saving" />
        )}
      </View>

      {PREF_ROWS.map(({ key, label, description, emoji }) => (
        <View key={key} style={styles.row} testID={`pref-row-${key}`}>
          <Text style={styles.rowEmoji}>{emoji}</Text>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowDesc}>{description}</Text>
          </View>
          <Switch
            value={prefs[key]}
            onValueChange={(v) => handleToggle(key, v)}
            trackColor={{ true: '#2563eb' }}
            thumbColor={Platform.OS === 'ios' ? undefined : '#ffffff'}
            testID={`pref-switch-${key}`}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical:   20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   16,
  },
  title: {
    fontSize:      14,
    fontWeight:    '700',
    color:         '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  rowEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  rowText:  { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowDesc:  { fontSize: 12, color: '#9ca3af', marginTop: 2 },
});
```

---

## 14. Barrel — `src/components/profile/index.ts`

```typescript
export { ProfileHeader }         from './ProfileHeader';
export { StatsGrid }             from './StatsGrid';
export { BadgesGrid }            from './BadgesGrid';
export { PointsHistoryList }     from './PointsHistoryList';
export { NotificationPrefsCard } from './NotificationPrefsCard';
```

---

## 15. `app/(tabs)/profile.tsx` — FULL REPLACEMENT

```typescript
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/stores/session.store';
import { useUserStats } from '@/hooks/usePoints';
import { useUserStreak } from '@/hooks/useStreak';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { analytics } from '@/lib/analytics';
import {
  ProfileHeader,
  StatsGrid,
  BadgesGrid,
  PointsHistoryList,
  NotificationPrefsCard,
} from '@/components/profile';
import { LeaderboardRow } from '@/components/gamification/LeaderboardRow';
import { useRouter } from 'expo-router';

export default function ProfileTab() {
  const router = useRouter();
  const { isAuthenticated, isGuest, signOut, profile } = useAuth();
  const { user } = useSessionStore();

  const { data: stats,   isLoading: loadingStats,  refetch: refetchStats  } = useUserStats(user?.id ?? '');
  const { data: streak,  isLoading: loadingStreak                          } = useUserStreak(user?.id ?? '');
  const { data: leaders, isLoading: loadingLeaders                         } = useLeaderboard('global', 'weekly');

  const isLoading = loadingStats || loadingStreak;

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:    'Sign Out',
          style:   'destructive',
          onPress: async () => {
            analytics.track('auth_sign_out');
            await signOut();
          },
        },
      ],
    );
  }, [signOut]);

  // ── Guest state ───────────────────────────────────────────────────────────

  if (isGuest || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="profile-tab">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.guestContainer} testID="guest-state">
          <Text style={styles.guestEmoji}>👤</Text>
          <Text style={styles.guestTitle}>Join PeeDom</Text>
          <Text style={styles.guestSubtitle}>
            Create an account to track your contributions,
            earn badges, and help your community.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/register')}
            testID="create-account-button"
          >
            <Text style={styles.signInButtonText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            testID="sign-in-link"
          >
            <Text style={styles.signInLink}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard preview for guests */}
        {!loadingLeaders && leaders && leaders.length > 0 && (
          <View style={styles.leaderboardPreview} testID="leaderboard-preview">
            <Text style={styles.leaderboardTitle}>🏆 Weekly Leaderboard</Text>
            {leaders.slice(0, 5).map((entry) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                isCurrentUser={false}
                testID={`leader-row-${entry.rank}`}
              />
            ))}
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="profile-tab">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.center} testID="profile-loading">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  // ── My rank in leaderboard ────────────────────────────────────────────────

  const myLeaderboardEntry = leaders?.find((l) => l.user_id === user?.id);

  // ── Authenticated profile ─────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="profile-tab">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          onPress={handleSignOut}
          testID="sign-out-button"
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetchStats}
            tintColor="#2563eb"
          />
        }
        testID="profile-scroll"
      >
        {/* Profile header */}
        <ProfileHeader
          profile={profile}
          currentStreak={streak?.current_streak ?? 0}
          testID="profile-header"
        />

        {/* Leaderboard rank */}
        {myLeaderboardEntry && (
          <View style={styles.rankCard} testID="rank-card">
            <Text style={styles.rankLabel}>Your weekly rank</Text>
            <LeaderboardRow
              entry={myLeaderboardEntry}
              isCurrentUser
              testID="my-rank-row"
            />
            <TouchableOpacity
              style={styles.fullLeaderboardLink}
              onPress={() => Alert.alert('Leaderboard', 'Full leaderboard coming soon!')}
            >
              <Text style={styles.fullLeaderboardText}>View full leaderboard →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        {stats && <StatsGrid stats={stats} testID="stats-grid" />}

        {/* Badges */}
        <BadgesGrid userId={user?.id ?? ''} testID="badges-grid" />

        {/* Notification prefs */}
        <NotificationPrefsCard
          currentPrefs={profile.notification_prefs as any}
          testID="notification-prefs"
        />

        {/* Points history */}
        <PointsHistoryList
          userId={user?.id ?? ''}
          testID="points-history"
        />

        {/* Bottom padding */}
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: '#111827' },
  signOutText:  { fontSize: 14, color: '#dc2626', fontWeight: '600' },
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  // Guest
  guestContainer: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 40,
    paddingBottom:     40,
  },
  guestEmoji:    { fontSize: 64, marginBottom: 16 },
  guestTitle:    { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  guestSubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  signInButton: {
    backgroundColor:   '#2563eb',
    paddingHorizontal: 28,
    paddingVertical:   13,
    borderRadius:      10,
    marginBottom:      12,
    width:             '100%',
    alignItems:        'center',
  },
  signInButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  signInLink:       { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  // Leaderboard preview (guest)
  leaderboardPreview: {
    borderTopWidth:  1,
    borderTopColor:  '#f1f5f9',
    paddingBottom:   20,
  },
  leaderboardTitle: {
    fontSize:          16,
    fontWeight:        '700',
    color:             '#111827',
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  // Rank card
  rankCard: {
    marginHorizontal:  16,
    marginVertical:    12,
    borderRadius:      12,
    borderWidth:       1,
    borderColor:       '#e2e8f0',
    overflow:          'hidden',
  },
  rankLabel: {
    fontSize:          12,
    fontWeight:        '700',
    color:             '#6b7280',
    textTransform:     'uppercase',
    letterSpacing:     0.5,
    paddingHorizontal: 16,
    paddingTop:        12,
    paddingBottom:     4,
  },
  fullLeaderboardLink: {
    paddingHorizontal: 16,
    paddingVertical:   10,
    borderTopWidth:    1,
    borderTopColor:    '#f1f5f9',
  },
  fullLeaderboardText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  bottomPad: { height: 32 },
});
```

---

# Validation Block — SDET

## `src/hooks/__tests__/useFavorites.test.ts`

```typescript
jest.mock('@/lib/supabase',  () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',    () => ({ captureException: jest.fn() }));
jest.mock('@/lib/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/hooks/usePoints', () => ({
  useRecordContribution: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/hooks/useBathroomDetail', () => ({
  detailQueryKeys: { detail: (id: string) => ['bathrooms', 'detail', id] },
}));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getLastKnownPositionAsync:     jest.fn().mockResolvedValue({
    coords: { latitude: 47.6, longitude: -122.3 },
  }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn(() => Promise.resolve(null)),
  setItem:    jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFavorites,
  useRemoveFavorite,
  useUpdateNotificationPrefs,
  useUpdateDisplayName,
} from '@/hooks/useFavorites';
import { supabase, resetSupabaseMocks } from 'src/__mocks__/supabase';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const USER_ID     = '550e8400-e29b-41d4-a716-446655440000';
const BATHROOM_ID = '660e8400-e29b-41d4-a716-446655440001';

const mockFavorite = {
  bathroom_id: BATHROOM_ID, place_name: 'Pike Place Restroom',
  address_line1: '85 Pike St', city: 'Seattle', state: 'WA',
  latitude: 47.6097, longitude: -122.3331,
  is_locked: false, is_accessible: true, is_customer_only: false,
  hours_json: null, distance_meters: 300, has_code: true,
  confidence_score: 80, last_verified_at: null,
  favorited_at: new Date().toISOString(),
};

describe('useFavorites', () => {
  beforeEach(() => resetSupabaseMocks());

  it('returns favorites on success', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [mockFavorite], error: null });

    const { result } = renderHook(() => useFavorites(USER_ID), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].place_name).toBe('Pike Place Restroom');
  });

  it('is disabled when userId is empty', () => {
    const { result } = renderHook(() => useFavorites(''), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns empty array when no favorites', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(() => useFavorites(USER_ID), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('throws on RPC error', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const { result } = renderHook(() => useFavorites(USER_ID), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useRemoveFavorite', () => {
  beforeEach(() => resetSupabaseMocks());

  it('calls toggle_favorite RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { success: true, favorited: false }, error: null,
    });

    const { result } = renderHook(() => useRemoveFavorite(USER_ID), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ bathroomId: BATHROOM_ID });
    });

    expect(supabase.rpc).toHaveBeenCalledWith('toggle_favorite', {
      p_bathroom_id: BATHROOM_ID,
    });
  });

  it('optimistically removes item from cache', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { favoritesQueryKeys } = await import('@/hooks/useFavorites');

    // Seed cache
    qc.setQueryData(favoritesQueryKeys.list(USER_ID), [mockFavorite]);

    supabase.rpc.mockResolvedValueOnce({
      data: { success: true, favorited: false }, error: null,
    });

    const { result } = renderHook(
      () => useRemoveFavorite(USER_ID),
      { wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider> },
    );

    act(() => {
      result.current.mutate({ bathroomId: BATHROOM_ID });
    });

    // Optimistic update: item removed before RPC completes
    const cached = qc.getQueryData<any[]>(favoritesQueryKeys.list(USER_ID));
    expect(cached?.find((f) => f.bathroom_id === BATHROOM_ID)).toBeUndefined();
  });
});

describe('useUpdateNotificationPrefs', () => {
  beforeEach(() => resetSupabaseMocks());

  it('calls update_notification_prefs RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useUpdateNotificationPrefs(), { wrapper: makeWrapper() });

    const prefs = {
      code_verified: true, favorite_update: false,
      nearby_new: false, streak_reminder: true,
    };

    await act(async () => {
      await result.current.mutateAsync({ prefs });
    });

    expect(supabase.rpc).toHaveBeenCalledWith('update_notification_prefs', { p_prefs: prefs });
  });
});

describe('useUpdateDisplayName', () => {
  beforeEach(() => resetSupabaseMocks());

  it('calls update_display_name RPC', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    const { result } = renderHook(() => useUpdateDisplayName(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ displayName: 'John Doe' });
    });

    expect(supabase.rpc).toHaveBeenCalledWith('update_display_name', {
      p_display_name: 'John Doe',
    });
  });
});
```

---

## `src/components/favorites/__tests__/FavoriteItem.test.tsx`

```typescript
jest.mock('@/lib/supabase',  () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',    () => ({ captureException: jest.fn() }));
jest.mock('@/lib/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/hooks/useFavorites', () => ({
  useRemoveFavorite: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('@/stores/session.store', () => ({
  useSessionStore: () => ({ user: { id: 'user-123' } }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FavoriteItem } from '../FavoriteItem';
import type { FavoriteBathroom } from '@/types';

const mockFav: FavoriteBathroom = {
  bathroom_id: 'b-1', place_name: 'Pike Place Restroom',
  address_line1: '85 Pike St', city: 'Seattle', state: 'WA',
  latitude: 47.6097, longitude: -122.3331,
  is_locked: false, is_accessible: true, is_customer_only: false,
  hours_json: null, distance_meters: 200, has_code: false,
  confidence_score: null, last_verified_at: null,
  favorited_at: new Date().toISOString(),
};

describe('FavoriteItem', () => {
  it('renders name and address', () => {
    render(<FavoriteItem item={mockFav} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('fav-name')).toHaveTextContent('Pike Place Restroom');
    expect(screen.getByTestId('fav-address')).toHaveTextContent('85 Pike St, Seattle, WA');
  });

  it('shows Free tag for unlocked bathroom', () => {
    render(<FavoriteItem item={mockFav} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('fav-free')).toBeTruthy();
  });

  it('shows Code tag for locked + has code', () => {
    const locked = { ...mockFav, is_locked: true, has_code: true };
    render(<FavoriteItem item={locked} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('fav-code')).toBeTruthy();
  });

  it('shows No code tag for locked + no code', () => {
    const noCode = { ...mockFav, is_locked: true, has_code: false };
    render(<FavoriteItem item={noCode} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('fav-nocode')).toBeTruthy();
  });

  it('shows accessible tag when is_accessible=true', () => {
    render(<FavoriteItem item={mockFav} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('fav-accessible')).toBeTruthy();
  });

  it('calls onPress with the item when tapped', () => {
    const onPress = jest.fn();
    render(<FavoriteItem item={mockFav} onPress={onPress} testID="item" />);
    fireEvent.press(screen.getByTestId('item'));
    expect(onPress).toHaveBeenCalledWith(mockFav);
  });

  it('renders remove button', () => {
    render(<FavoriteItem item={mockFav} onPress={jest.fn()} testID="item" />);
    expect(screen.getByTestId('fav-remove')).toBeTruthy();
  });
});
```

---

## `src/components/profile/__tests__/StatsGrid.test.tsx`

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatsGrid } from '../StatsGrid';
import type { UserStats } from '@/types';

const mockStats: UserStats = {
  user_id: 'u-1', points_balance: 500, is_premium: false,
  bathrooms_added: 3, codes_submitted: 7, codes_verified: 12,
  votes_cast: 25, photos_uploaded: 4, reports_submitted: 2,
  current_streak: 5, longest_streak: 14, total_contributions: 53,
  badges_earned: 3,
};

describe('StatsGrid', () => {
  it('renders all stat cells', () => {
    render(<StatsGrid stats={mockStats} testID="grid" />);

    expect(screen.getByTestId('stat-bathrooms')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-codes')).toHaveTextContent('7');
    expect(screen.getByTestId('stat-verified')).toHaveTextContent('12');
    expect(screen.getByTestId('stat-photos')).toHaveTextContent('4');
    expect(screen.getByTestId('stat-votes')).toHaveTextContent('25');
    expect(screen.getByTestId('stat-reports')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-total')).toHaveTextContent('53');
    expect(screen.getByTestId('stat-badges')).toHaveTextContent('3');
  });

  it('formats large numbers with locale separators', () => {
    const bigStats = { ...mockStats, total_contributions: 1234 };
    render(<StatsGrid stats={bigStats} testID="grid" />);
    expect(screen.getByTestId('stat-total')).toHaveTextContent('1,234');
  });
});
```

---

## `src/components/profile/__tests__/NotificationPrefsCard.test.tsx`

```typescript
jest.mock('@/lib/supabase',   () => require('src/__mocks__/supabase'));
jest.mock('@/lib/sentry',     () => ({ captureException: jest.fn() }));
jest.mock('@/hooks/useFavorites', () => ({
  useUpdateNotificationPrefs: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending:   false,
  }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NotificationPrefsCard } from '../NotificationPrefsCard';
import { DEFAULT_NOTIFICATION_PREFS } from '@/types';

describe('NotificationPrefsCard', () => {
  it('renders all preference rows', () => {
    render(<NotificationPrefsCard currentPrefs={DEFAULT_NOTIFICATION_PREFS} testID="prefs" />);
    expect(screen.getByTestId('pref-row-code_verified')).toBeTruthy();
    expect(screen.getByTestId('pref-row-favorite_update')).toBeTruthy();
    expect(screen.getByTestId('pref-row-streak_reminder')).toBeTruthy();
    expect(screen.getByTestId('pref-row-nearby_new')).toBeTruthy();
  });

  it('switches reflect current pref values', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, code_verified: false };
    render(<NotificationPrefsCard currentPrefs={prefs} testID="prefs" />);

    expect(screen.getByTestId('pref-switch-code_verified').props.value).toBe(false);
    expect(screen.getByTestId('pref-switch-favorite_update').props.value).toBe(true);
  });

  it('toggles a preference on switch change', async () => {
    const { useUpdateNotificationPrefs } = require('@/hooks/useFavorites');
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    useUpdateNotificationPrefs.mockReturnValue({ mutateAsync, isPending: false });

    render(<NotificationPrefsCard currentPrefs={DEFAULT_NOTIFICATION_PREFS} testID="prefs" />);

    fireEvent(screen.getByTestId('pref-switch-code_verified'), 'valueChange', false);

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        prefs: expect.objectContaining({ code_verified: false }),
      }),
    );
  });

  it('renders without currentPrefs (uses defaults)', () => {
    render(<NotificationPrefsCard testID="prefs" />);
    expect(screen.getByTestId('pref-switch-code_verified').props.value).toBe(
      DEFAULT_NOTIFICATION_PREFS.code_verified,
    );
  });
});
```

---

## `src/components/favorites/__tests__/FavoritesEmptyState.test.tsx`

```typescript
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FavoritesEmptyState } from '../FavoritesEmptyState';

describe('FavoritesEmptyState', () => {
  it('shows sign-in CTA for guest users', () => {
    render(<FavoritesEmptyState isGuest testID="empty" />);
    expect(screen.getByText('Sign in to save favorites')).toBeTruthy();
    expect(screen.getByTestId('sign-in-cta')).toBeTruthy();
  });

  it('shows explore CTA for authenticated users with no favorites', () => {
    render(<FavoritesEmptyState isGuest={false} testID="empty" />);
    expect(screen.getByText('No favorites yet')).toBeTruthy();
    expect(screen.getByTestId('explore-map-cta')).toBeTruthy();
  });

  it('calls router.push to login for guest sign-in CTA', () => {
    const push = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockReturnValue({ push });

    render(<FavoritesEmptyState isGuest />);
    fireEvent.press(screen.getByTestId('sign-in-cta'));
    expect(push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('calls router.push to map for explore CTA', () => {
    const push = jest.fn();
    const { useRouter } = require('expo-router');
    useRouter.mockReturnValue({ push });

    render(<FavoritesEmptyState isGuest={false} />);
    fireEvent.press(screen.getByTestId('explore-map-cta'));
    expect(push).toHaveBeenCalledWith('/(tabs)/');
  });
});
```

---

## Security Validation SQL

```sql
-- ============================================================================
-- Favorites & Profile Security Tests
-- ============================================================================

-- 1. get_user_favorites: only returns authenticated user's favorites
-- Run as user A — should only see user A's favorites
select count(*) from public.get_user_favorites(null, null);
-- All returned rows should have user_id = auth.uid() (enforced by the RPC query)

-- 2. get_user_favorites: never returns deleted/hidden bathrooms
select distinct b.moderation_status
from public.bathrooms b
where b.id in (
  select bathroom_id from public.get_user_favorites(null, null)
);
-- Expected: only 'active'

-- 3. update_display_name: rejects names < 2 chars
select public.update_display_name('a');
-- Expected: {"success": false, "error": "name_too_short"}

-- 4. update_display_name: rejects names > 50 chars
select public.update_display_name(repeat('a', 51));
-- Expected: {"success": false, "error": "name_too_long"}

-- 5. update_display_name: unauthenticated → error
-- Run as anon:
select public.update_display_name('Test Name');
-- Expected: {"success": false, "error": "not_authenticated"}

-- 6. update_notification_prefs: only affects authenticated user's row
-- Run as authenticated user:
select public.update_notification_prefs(
  '{"code_verified": false, "favorite_update": true, "nearby_new": false, "streak_reminder": false}'::jsonb
);
-- Verify: other users' notification_prefs are unchanged

-- 7. favorites RLS: user cannot see another user's favorites
-- Run as user A — should return 0 rows that belong to user B
select count(*)
from public.favorites
where user_id != auth.uid();
-- Expected: 0

-- 8. Verify get_user_favorites uses proper join (no data leak)
-- Confirm RPC only queries favorites for auth.uid()
explain
select * from public.get_user_favorites(null, null);
-- Look for: filter on f.user_id = auth.uid()
```

---

## Performance Notes

- **`get_user_favorites` RPC** uses `idx_favorites_user` (created in migration 001) for the `favorites` table scan, then joins to `bathrooms` by PK. The `code_summary` CTE hits `idx_codes_bathroom`. All indexed — no seq scans at scale. ✅
- **`FavoriteItem` is `memo()`-wrapped** — the FlatList re-renders items only when the `item` prop reference changes. Optimistic removal via cache update changes the array reference, triggering a correct re-render of remaining items only. ✅
- **`useRemoveFavorite` optimistic update** — removes the item from cache before the RPC responds. If the RPC fails, it restores the previous list from the `onMutate` snapshot. The `Alert.alert` confirmation gate prevents accidental removes during this window. ✅
- **Notification prefs toggle** — each toggle calls `mutateAsync` directly (no debounce). Given typical UX (user flips 1-2 toggles, pauses), this is acceptable. If UX testing reveals rapid multi-toggle behavior, add a 500ms debounce around `mutateAsync`. ✅
- **Profile scroll** — `PointsHistoryList` and `BadgesGrid` are sliced/limited to 20 and all badges respectively, so the ScrollView content height is bounded. For production with many badges/events, consider a `VirtualizedList` approach. ✅
- **Memory leak check** — No Realtime subscriptions in this section. All `useMutation` and `useQuery` hooks clean up via TanStack's built-in lifecycle. No custom subscriptions to unsubscribe. ✅

---

## Section 6 Checklist

| Feature | DB | Hook | UI | Tests |
|---------|----|----|------|----|
| `get_user_favorites` RPC (with distance) | ✅ | ✅ | ✅ | ✅ |
| Optimistic favorite removal | — | ✅ | ✅ | ✅ |
| Favorites list (loading/empty/list states) | — | — | ✅ | ✅ |
| Guest state (sign-in CTA) | — | — | ✅ | ✅ |
| Favorites → zoom map + open detail | — | ✅ | ✅ | — |
| Profile header + editable display name | ✅ | ✅ | ✅ | ✅ |
| Level progress bar | — | — | ✅ | — |
| Streak badge | — | — | ✅ | — |
| Stats grid (8 cells) | — | — | ✅ | ✅ |
| Badges grid + detail modal | — | — | ✅ | — |
| Points history list (20 items) | — | — | ✅ | — |
| Notification prefs card | ✅ | ✅ | ✅ | ✅ |
| Leaderboard rank card | — | — | ✅ | — |
| Guest profile (leaderboard preview) | — | — | ✅ | — |
| Sign out with confirmation | — | — | ✅ | — |
| `app/(tabs)/favorites.tsx` Phase 4 | — | — | ✅ | ✅ |
| `app/(tabs)/profile.tsx` Phase 4 | — | — | ✅ | ✅ |

**Section 6: Favorites Tab + Profile Tab is complete. Say "Next" for Section 7: The Premium Tier + Business Tab, or "Integrated" to verify first.**

## Assistant (commentary)

`2026-03-19T07:10:44.200Z`

Using `$staff-mobile-engineer` for Section 6 as well. I’m checking the current favorites/profile tabs, the existing `useFavorites` implementation, and the available profile/gamification hooks first so I can extend the repo’s current auth/offline flow instead of overwriting it with the sample’s different store setup.

## Assistant (commentary)

`2026-03-19T07:10:54.381Z`

The repo already has substantial favorites and profile logic: favorites uses auth intents plus offline queue, and profile already has a gamification dashboard plus notification settings. I’m pulling those supporting hooks/components now to see which Section 6 pieces are already present and which ones still need to be added or merged.

## Assistant (commentary)

`2026-03-19T07:11:03.586Z`

The profile tab already has the gamification data path, but it’s still using a monolithic screen and the repo doesn’t even have the sample’s `src/components/gamification` path. I’m checking the current component inventory and the gamification API/types next so I can add the missing profile/favorites modules without duplicating or breaking the existing dashboard contract.

## Assistant (commentary)

`2026-03-19T07:11:59.916Z`

I’ve got the integration surface mapped. The sample can’t be applied literally because this repo already has different production-safe contracts for favorites, notifications, badges, and profile state.

Plan:
- Extend the data layer without regressing current flows:
  - add a new `010_favorites_profile.sql` migration for `get_user_favorites` and `update_display_name`
  - keep the existing `update_notification_settings` path instead of replacing it with a narrower prefs RPC
  - add profile/favorites API helpers and parser types that match the current schema, including the current point-event and badge shapes

- Upgrade favorites without breaking offline/auth behavior:
  - keep the existing `useFavorites` auth-intent and offline-queue mutation flow
  - switch favorites loading to a new RPC with fallback to the current table + join path if the migration is not applied yet
  - rebuild the favorites tab into a lighter list that recenters the map and opens the map sheet, while preserving destructive-confirm removal

- Break the profile tab into components while preserving existing capabilities:
  - add an editable profile header with display-name update wired through `AuthContext.refreshProfile`
  - add reusable stats, badge, points-history, notification, and leaderboard sections using the current gamification dashboard and notification hooks
  - keep the working premium/leaderboard surfaces that already exist here rather than deleting them

- Validate with the repo’s actual test stack:
  - add node/Jest coverage for the new profile/favorites APIs and utility transformations
  - run `npm run type-check`, `npm run lint`, and `npm test -- --runInBand`

## Assistant (commentary)

`2026-03-19T07:14:27.468Z`

I’m landing the DB contract first: favorites RPC, display-name update, and the public weekly leaderboard preview permission. After that I’ll switch the current hooks over with a migration-safe fallback so the app still works if the new SQL hasn’t been applied yet.

## Assistant (commentary)

`2026-03-19T07:17:06.311Z`

Integrating Section 6 against the repo’s existing favorites, auth, notifications, and gamification flows. I’m using `staff-mobile-engineer` and `peedom-core-architect` to keep the implementation aligned with the current mobile architecture before I finish the remaining UI, hook, and validation work.

## Assistant (commentary)

`2026-03-19T07:17:15.937Z`

I’ve got the architecture constraints back in view. Next I’m reading the live favorites/profile screens and the in-flight data-layer changes so I can finish the UI refactor without breaking the current offline, guest, and gamification behavior.

## Assistant (commentary)

`2026-03-19T07:17:28.228Z`

The data layer is already partly wired for the new favorites RPC. I’m checking the live domain types and gamification models now so the new profile components match this repo’s actual badge, points, and leaderboard schema instead of the sample’s mismatched one.

## Assistant (commentary)

`2026-03-19T07:17:52.262Z`

The repo doesn’t currently have the sample’s `src/components/gamification` surface; it’s using a flatter component layout. I’m switching to the existing file set and locating the live leaderboard/points UI pieces before I wire in the new profile modules.

## Assistant (commentary)

`2026-03-19T07:19:07.196Z`

I have the live surfaces and the schema mismatch mapped now. I’m moving into file edits: first the remaining favorites hook integration, then the new favorites/profile components and tab rewrites, and finally a small leaderboard-query change so the guest preview works without weakening the authenticated flows.

## Assistant (commentary)

`2026-03-19T07:20:17.711Z`

I hit a slower repo-wide scan, so I’m narrowing to `app/` and `src/` only. The next edit batch will also include a small `useGamificationDashboard` refresh surface so the new profile screen can pull everything back into sync in one gesture.

## Assistant (commentary)

`2026-03-19T07:22:34.130Z`

I’ve got enough context to edit safely. This patch batch is wiring the guest-capable leaderboard query, the refresh surface for the profile screen, and the notification hook state I need for the new profile settings card.

## Assistant (commentary)

`2026-03-19T07:23:31.775Z`

I’m in the main UI edit pass now. This batch adds the new favorites/profile component modules in NativeWind style, keeping the current typed data model rather than the sample’s incompatible badge and notification abstractions.

## Assistant (commentary)

`2026-03-19T07:25:22.653Z`

The remaining screen work is the highest-risk part, so I’m replacing the tab files in one controlled pass rather than incrementally splicing them. The goal here is to preserve the existing auth/offline/map behavior while moving the visuals to the new favorites/profile structure.

## Assistant (commentary)

`2026-03-19T07:26:39.557Z`

The screen replacements are in. I’m doing a tight inspection pass now for type mismatches and a couple of likely edge cases around the modal backdrop, notification-row pending states, and the rewritten tab imports before I run the full checks.

## Assistant (commentary)

`2026-03-19T07:26:54.151Z`

I found a couple of cleanup items from the first pass: one mojibake separator from the old file content and a UI-state bug where every notification row would look like it was saving at once. I’m fixing those before I move to tests and validation.

## Assistant (commentary)

`2026-03-19T07:27:30.020Z`

The profile file still has one encoding-corrupted line from the old content that `apply_patch` isn’t matching cleanly. I’m reading it with line numbers and then I’ll patch that function block directly rather than fighting the corrupted bytes.

## Assistant (commentary)

`2026-03-19T07:29:28.844Z`

The data and UI structure are in place. I’m adding repo-native Jest coverage now around the new favorites RPC path and the profile utilities/API, since this workspace still uses node-based `ts-jest` rather than a React Native component harness.

## Assistant (commentary)

`2026-03-19T07:30:16.606Z`

The implementation pass is complete enough to validate. I’m starting with `type-check` to catch any interface drift from the new components and the guest-enabled leaderboard refresh path before I run lint and the Jest suite.

## Assistant (commentary)

`2026-03-19T07:30:43.977Z`

`type-check` exposed a mix of issues: a few from this Section 6 work and a few already sitting in the dirty tree from adjacent sections. I’m fixing the ones that are blocking the shared build cleanly instead of treating them as “someone else’s problem,” because they’re all small enough to resolve without destabilizing the repo.

## Assistant (commentary)

`2026-03-19T07:33:00.975Z`

I’ve cleared the obvious blockers from this pass and normalized the profile payload so the newer notification schema composes cleanly with cached auth state. Running `type-check` again now to see what remains before I touch lint.

## Assistant (commentary)

`2026-03-19T07:33:32.942Z`

The remaining compiler noise is all coming from one place: the bathroom-row utility types became too narrow once the repo started mixing raw DB rows, parsed rows, favorite rows, and premium-pack cached rows. I’m widening that shared row contract to the actual fields the mapping/filter helpers need, which is the cleanest way to make the existing data sources agree again.

## Assistant (commentary)

`2026-03-19T07:34:29.353Z`

The shared TypeScript build is clean again. I’m running `lint` next; if that comes back clean, I’ll finish with the Jest suite to make sure the new favorites/profile paths and the surrounding repo still hold together.

## Assistant (final_answer)

`2026-03-19T07:35:19.231Z`

Section 6 is integrated against the current repo architecture. Favorites now uses the new empty/list states and recent save metadata in [favorites.tsx](C:/Users/T/Desktop/PeeDom/app/(tabs)/favorites.tsx) and [src/components/favorites](C:/Users/T/Desktop/PeeDom/src/components/favorites), while still preserving the existing offline/auth-aware toggle flow in [useFavorites.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useFavorites.ts) and the new typed RPC/fallback loading path in [favorites.ts](C:/Users/T/Desktop/PeeDom/src/api/favorites.ts). The database side for this section is in [010_favorites_profile.sql](C:/Users/T/Desktop/PeeDom/supabase/migrations/010_favorites_profile.sql).

Profile is now modularized in [profile.tsx](C:/Users/T/Desktop/PeeDom/app/(tabs)/profile.tsx) and [src/components/profile](C:/Users/T/Desktop/PeeDom/src/components/profile), with editable display name via [profile.ts](C:/Users/T/Desktop/PeeDom/src/api/profile.ts) and [useProfileSettings.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useProfileSettings.ts), guest leaderboard preview and dashboard refresh in [useGamificationDashboard.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useGamificationDashboard.ts), and notification controls reusing the repo’s existing notification settings path instead of duplicating RPCs.

Validation passed: `npm run type-check`, `npm run lint`, `npm test -- --runInBand`.

Manual follow-up: apply [010_favorites_profile.sql](C:/Users/T/Desktop/PeeDom/supabase/migrations/010_favorites_profile.sql) so `get_user_favorites`, `update_display_name`, and the guest leaderboard grant are live.
