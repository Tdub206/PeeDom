# StallPass Agent Operating Contract

This repository is a mobile-first application named StallPass.

## Product Scope
StallPass is a restroom-finder mobile application for iOS and Android users. It is built for launch readiness, reliability, offline tolerance, and app-store compliant mobile UX.

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