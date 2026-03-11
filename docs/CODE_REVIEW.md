# PeeDom Repository Code Review

Date: 2026-03-09
Reviewer: Codex (architecture + quality pass)

## Scope

This review covered repository structure, build/tooling health, TypeScript correctness, security posture, and implementation readiness.

## Executive Summary

The repository is an **Expo React Native** application (not a native Kotlin/Compose Android app), and currently appears to be in scaffold/early-implementation stage. Several blocking quality issues are present:

1. Build verification is not green (`type-check` fails).
2. Linting is not runnable (`eslint` config is missing).
3. There is architectural drift (legacy `App.tsx` + `utils/supabase.ts` path and env mismatches vs router-based app).
4. A non-SQL migration artifact exists under `supabase/migrations`.

## Findings

### 1) TypeScript check is failing (Blocker)
- `npm run type-check` fails with multiple errors, including invalid TS module mode and concrete source errors in `App.tsx` and tab layout.
- This blocks CI confidence and indicates the current branch is not type-safe.

Evidence:
- `package.json` defines `type-check` as `tsc --noEmit`. 
- `App.tsx` has incorrect import path, unknown error typing, and untyped `useState([])` usage.
- `app/(tabs)/_layout.tsx` has an unused `name` prop.

### 2) Linting is not configured (Blocker)
- `npm run lint` executes `eslint .` but there is no ESLint configuration file in the repo root.
- This means the lint gate cannot execute, and style/quality regressions are unguarded.

Evidence:
- Lint script exists in `package.json`.
- No `.eslintrc*` or `eslint.config.*` is present in the tracked file set.

### 3) Dual Supabase clients + inconsistent env variable names (High)
- There are two Supabase client files with different env names:
  - `src/lib/supabase.ts` uses `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  - `utils/supabase.ts` uses `EXPO_PUBLIC_SUPABASE_KEY` and non-null assertions.
- This can cause runtime misconfiguration, and strongly suggests partially-migrated architecture.

Recommendation:
- Keep a single source of truth (`src/lib/supabase.ts`), remove legacy usage, and standardize env names across all files/docs.

### 4) Legacy `App.tsx` conflicts with router-first architecture (High)
- App uses Expo Router layouts under `app/`, but also keeps a root `App.tsx` with a separate Todo demo flow and legacy imports.
- In router-centric apps, keeping this file active or stale increases confusion and creates dead-code/entry ambiguity.

Recommendation:
- Remove or archive demo `App.tsx`; keep app entry aligned to Expo Router conventions only.

### 5) Suspicious migration artifact in SQL migrations folder (High)
- `supabase/migrations/TodoItem.kt` exists in a SQL migrations directory and contains Kotlin code, not SQL.
- This can break migration tooling or indicate accidental commit of wrong file type.

Recommendation:
- Remove this file from migrations and place Kotlin samples in dedicated docs/examples if intentionally kept.

### 6) Security posture: AsyncStorage for sensitive auth/session-adjacent data (Medium)
- Auth client uses AsyncStorage session persistence and app storage utilities are plain AsyncStorage.
- For higher assurance, sensitive artifacts (tokens/session secrets) should be kept in secure storage.

Recommendation:
- Prefer `expo-secure-store` for sensitive keys and keep AsyncStorage for non-sensitive cache only.

### 7) Placeholder UI and icon implementation in primary navigation (Medium)
- Multiple screens are scaffold placeholders.
- Tab icons currently render a generic bullet regardless of selected icon name (`TabBarIcon` ignores `name`).

Recommendation:
- Replace with a real icon set and wire actual feature screens incrementally.

### 8) Minor API hygiene issue: legacy `substr` usage (Low)
- ID generation uses `Math.random().toString(36).substr(...)` in multiple files.
- `substr` is legacy/deprecated in JS style guidance.

Recommendation:
- Use `slice` or a UUID utility.

## Architecture Notes

- This codebase does **not** match native Android Clean Architecture/MVVM + Compose stack; it is React Native + Expo Router + Supabase.
- If Android-native architecture standards are required, decide one of:
  1. Keep RN stack and define equivalent boundaries (feature modules, service/repository layers, typed state containers).
  2. Start a separate Android native module/app with Kotlin + Compose and share backend contracts.

## Prioritized Remediation Plan

1. **Restore CI health first**
   - Add ESLint config and plugins.
   - Fix `tsconfig` / TypeScript compatibility and all `type-check` failures.
2. **Unify app architecture paths**
   - Remove legacy `App.tsx` and duplicate Supabase client.
   - Standardize env variable naming.
3. **Clean repository hygiene**
   - Remove invalid file from migrations (`TodoItem.kt`).
4. **Strengthen security baseline**
   - Move sensitive persistence to SecureStore.
5. **Productize UI scaffold**
   - Replace placeholder tabs/auth screens with minimal working flows and real icons.

## Commands run during this review

- `npm run lint`
- `npm run type-check`
- Multiple read-only source inspections (`nl -ba`, `sed`) over app, src, config, and migrations.
