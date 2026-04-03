# Add nearby bathrooms feature

- Session ID: `019cf51a-d897-7fc1-ad55-ef3b4d04fc85`
- Source: `transcripts/sessions/2026/03/15/rollout-2026-03-15T22-25-05-019cf51a-d897-7fc1-ad55-ef3b4d04fc85.jsonl`
- Archived: `false`
- Message count: `17`

## User

`2026-03-16T05:25:39.650Z`

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

`2026-03-16T05:25:39.650Z`

is this a feature you could easily implement: 

*[Skill: peedom-architect — Step 0: Context verified]*

**Critical correction from previous response:** I generated a Fastify backend that doesn't exist. PeeDom is Supabase-direct — no separate Node.js server. Previous `.js` files and JWT preHandlers were wrong. Regenerating fully from your actual codebase.

---

**Stack Integrity Check — Confirmed:**
- `expo-location ~18.0.4` ✅ already in `package.json`
- `@tanstack/react-query ^5.28.4` ✅ — using v5 `useQuery` syntax
- `supabase` client → `src/lib/supabase.ts` with `EXPO_PUBLIC_SUPABASE_ANON_KEY` ✅
- PostGIS + `geom` column already live in `001_foundation_schema.sql` ✅
- `is_locked` column already exists on `bathrooms` ✅
- `hours_json` already stored as `jsonb` — `HoursData` type matches `src/types/index.ts` ✅
- `adwall_unlockable` → **new column, requires migration**
- Access codes live in `bathroom_access_codes`, not `bathrooms` — revealed post-ad via direct Supabase query

---

## Closest Open/Locked Bathroom Feature

### Platform: React Native (Supabase-direct)

### Files Created:
- `supabase/migrations/002_nearby_feature.sql` — `adwall_unlockable` column + PostGIS RPC
- `src/hooks/useNearbyBathrooms.ts` — TanStack Query v5 hook, location + Supabase RPC
- `src/components/NearbyBathroomsPanel.tsx` — Native-pure UI component

### 1 field to add manually to `src/types/database.ts` (bathrooms Row/Insert/Update):
```typescript
adwall_unlockable: boolean   // Add to Row, Insert (optional), Update (optional)
```

---

### `supabase/migrations/002_nearby_feature.sql`
```sql
-- ============================================================================
-- PeeDom: Nearby bathrooms feature
-- Adds adwall_unlockable flag + PostGIS RPC for distance queries
-- ============================================================================

-- 1. Add adwall_unlockable column
alter table public.bathrooms
  add column if not exists adwall_unlockable boolean not null default false;

comment on column public.bathrooms.adwall_unlockable is
  'Whether this bathroom''s access code can be revealed by watching an ad';

-- 2. Nearby bathrooms RPC (uses existing geom column + spatial index)
-- Returns up to 20 active bathrooms within radius_meters, sorted by distance.
-- Hours-check and is_locked filtering is done client-side for flexibility.
create or replace function public.get_nearby_bathrooms(
  user_lat      double precision,
  user_lng      double precision,
  radius_meters double precision default 5000
)
returns table (
  id                uuid,
  place_name        text,
  address_line1     text,
  city              text,
  state             text,
  is_locked         boolean,
  is_accessible     boolean,
  is_customer_only  boolean,
  hours_json        jsonb,
  adwall_unlockable boolean,
  distance_meters   double precision
)
language sql
stable
security invoker
as $$
  select
    b.id,
    b.place_name,
    b.address_line1,
    b.city,
    b.state,
    b.is_locked,
    b.is_accessible,
    b.is_customer_only,
    b.hours_json,
    b.adwall_unlockable,
    ST_Distance(
      b.geom,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters
  from public.bathrooms b
  where
    b.moderation_status = 'active'
    and ST_DWithin(
      b.geom,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
  order by distance_meters asc
  limit 20;
$$;
```

---

### `src/hooks/useNearbyBathrooms.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import type { HoursData } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NearbyBathroom {
  id: string;
  place_name: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  is_locked: boolean | null;
  is_accessible: boolean | null;
  is_customer_only: boolean;
  hours_json: HoursData | null;
  adwall_unlockable: boolean;
  distance_meters: number;
}

export interface NearbyBathroomsResult {
  /** Closest bathroom that is unlocked AND currently within operating hours. */
  nearest: NearbyBathroom | null;
  /** All locked bathrooms in range, sorted by distance. */
  locked: NearbyBathroom[];
}

// ─── Hours helper ─────────────────────────────────────────────────────────────

const DAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday',
] as const;

function isCurrentlyOpen(hoursJson: HoursData | null): boolean {
  if (!hoursJson) return true; // No hours set → treat as always open

  const now = new Date();
  const todayKey = DAY_NAMES[now.getDay()];
  const todaySlots = hoursJson[todayKey];

  if (!todaySlots || todaySlots.length === 0) return false; // Closed today

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return todaySlots.some(({ open, close }) => {
    const [openH = 0, openM = 0] = open.split(':').map(Number);
    const [closeH = 0, closeM = 0] = close.split(':').map(Number);
    return (
      currentMinutes >= openH * 60 + openM &&
      currentMinutes < closeH * 60 + closeM
    );
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNearbyBathrooms(radiusMeters = 5000) {
  return useQuery<NearbyBathroomsResult, Error>({
    queryKey: ['nearby-bathrooms', radiusMeters],
    queryFn: async (): Promise<NearbyBathroomsResult> => {
      // 1. Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('LOCATION_DENIED');
      }

      // 2. Get current position
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 3. PostGIS query via Supabase RPC
      const { data, error } = await supabase.rpc('get_nearby_bathrooms', {
        user_lat: coords.latitude,
        user_lng: coords.longitude,
        radius_meters: radiusMeters,
      });

      if (error) throw new Error(error.message);

      const all = (data ?? []) as NearbyBathroom[];

      // 4. Split: nearest open+free vs all locked
      const nearest =
        all.find(
          b => b.is_locked !== true && isCurrentlyOpen(b.hours_json),
        ) ?? null;

      const locked = all.filter(b => b.is_locked === true);

      return { nearest, locked };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, err) => {
      if (err.message === 'LOCATION_DENIED') return false;
      return failureCount < 2;
    },
  });
}

// ─── Utility: fetch access code post-ad ──────────────────────────────────────

/**
 * Fetches the best available active code for a bathroom.
 * Call this after the user has successfully watched an ad.
 * Returns null if no code exists.
 */
export async function fetchBathroomAccessCode(
  bathroomId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('bathroom_access_codes')
    .select('code_value')
    .eq('bathroom_id', bathroomId)
    .eq('visibility_status', 'visible')
    .eq('lifecycle_status', 'active')
    .order('confidence_score', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.code_value ?? null;
}
```

---

### `src/components/NearbyBathroomsPanel.tsx`
```tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useNearbyBathrooms,
  fetchBathroomAccessCode,
  type NearbyBathroom,
} from '@/hooks/useNearbyBathrooms';

// ─── Props ───────────────────────────────────────────────────────────────────

interface NearbyBathroomsPanelProps {
  /**
   * Called when user taps "Watch Ad to Unlock".
   * Wire this to your ad network (AdMob, etc.).
   * Resolve true if the ad completed, false if skipped/failed.
   */
  onWatchAd: (bathroomId: string) => Promise<boolean>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)}m away`
    : `${(meters / 1000).toFixed(1)}km away`;
}

function formatAddress(b: NearbyBathroom): string {
  const parts = [b.address_line1, b.city, b.state].filter(
    (p): p is string => Boolean(p),
  );
  return parts.join(', ') || 'Address unavailable';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface LockedCardProps {
  item: NearbyBathroom;
  unlockedCode: string | undefined;
  isFetching: boolean;
  onNavigate: (id: string) => void;
  onWatchAd: (item: NearbyBathroom) => void;
}

function LockedBathroomCard({
  item,
  unlockedCode,
  isFetching,
  onNavigate,
  onWatchAd,
}: LockedCardProps) {
  return (
    <View style={styles.lockedCard}>
      <TouchableOpacity onPress={() => onNavigate(item.id)} activeOpacity={0.7}>
        <Text style={styles.bathroomName} numberOfLines={1}>
          {item.place_name}
        </Text>
        <Text style={styles.distance}>{formatDistance(item.distance_meters)}</Text>
        <Text style={styles.address} numberOfLines={1}>
          {formatAddress(item)}
        </Text>
      </TouchableOpacity>

      {unlockedCode ? (
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Access Code</Text>
          <Text style={styles.codeValue}>{unlockedCode}</Text>
        </View>
      ) : item.adwall_unlockable ? (
        <TouchableOpacity
          style={[
            styles.adwallButton,
            isFetching && styles.adwallButtonBusy,
          ]}
          onPress={() => onWatchAd(item)}
          disabled={isFetching}
          activeOpacity={0.8}
        >
          {isFetching ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.adwallButtonText}>▶ Watch Ad to Unlock Code</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.noCodeText}>No code available</Text>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NearbyBathroomsPanel({ onWatchAd }: NearbyBathroomsPanelProps) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useNearbyBathrooms();

  const [unlockedCodes, setUnlockedCodes] = useState<Record<string, string>>({});
  const [fetchingCode, setFetchingCode] = useState<Record<string, boolean>>({});

  const handleNavigate = useCallback(
    (bathroomId: string) => {
      router.push(`/bathroom/${bathroomId}`);
    },
    [router],
  );

  const handleWatchAd = useCallback(
    async (bathroom: NearbyBathroom) => {
      setFetchingCode(prev => ({ ...prev, [bathroom.id]: true }));
      try {
        const completed = await onWatchAd(bathroom.id);
        if (!completed) return;

        const code = await fetchBathroomAccessCode(bathroom.id);
        if (code) {
          setUnlockedCodes(prev => ({ ...prev, [bathroom.id]: code }));
        } else {
          Alert.alert(
            'No Code Available',
            'No verified access code found for this bathroom yet.',
          );
        }
      } catch {
        Alert.alert('Error', 'Could not retrieve access code. Please try again.');
      } finally {
        setFetchingCode(prev => ({ ...prev, [bathroom.id]: false }));
      }
    },
    [onWatchAd],
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={styles.loadingText}>Finding nearby bathrooms…</Text>
      </View>
    );
  }

  // ── Error ──
  if (error) {
    const denied = error.message === 'LOCATION_DENIED';
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {denied
            ? 'Location access is required to find nearby bathrooms.'
            : 'Unable to load nearby bathrooms. Please try again.'}
        </Text>
        {!denied && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const nearest = data?.nearest ?? null;
  const locked = data?.locked ?? [];

  // ── Empty state ──
  if (!nearest && locked.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No bathrooms found within 5km.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Nearest open + free ── */}
      <Text style={styles.sectionTitle}>🚻 Nearest Open Bathroom</Text>

      {nearest ? (
        <TouchableOpacity
          style={styles.nearestCard}
          onPress={() => handleNavigate(nearest.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.bathroomName} numberOfLines={1}>
            {nearest.place_name}
          </Text>
          <Text style={styles.distance}>
            {formatDistance(nearest.distance_meters)}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {formatAddress(nearest)}
          </Text>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>🔓 Free Access</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No open, unlocked bathrooms found nearby.
          </Text>
        </View>
      )}

      {/* ── Locked bathrooms ── */}
      {locked.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, styles.lockedSectionTitle]}>
            🔒 Locked Bathrooms Nearby
          </Text>
          <FlatList
            data={locked}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <LockedBathroomCard
                item={item}
                unlockedCode={unlockedCodes[item.id]}
                isFetching={fetchingCode[item.id] ?? false}
                onNavigate={handleNavigate}
                onWatchAd={handleWatchAd}
              />
            )}
          />
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  centered: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  lockedSectionTitle: {
    marginTop: 24,
  },
  // ── Nearest card ──
  nearestCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  freeBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#22c55e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  freeBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Locked card ──
  lockedCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  adwallButton: {
    marginTop: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  adwallButtonBusy: {
    backgroundColor: '#93c5fd',
  },
  adwallButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  codeContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fef9c3',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  codeLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  codeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: 4,
  },
  noCodeText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  // ── Shared ──
  bathroomName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  distance: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
    marginTop: 2,
  },
  address: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
```

---

### Build Checklist

**Database**
- [ ] Run `supabase/migrations/002_nearby_feature.sql` in Supabase dashboard or CLI before any testing
- [ ] Verify `get_nearby_bathrooms` appears in Supabase → Database → Functions

**TypeScript — add 1 field in `src/types/database.ts`**

In `bathrooms.Row`:
```typescript
adwall_unlockable: boolean
```
In `bathrooms.Insert`:
```typescript
adwall_unlockable?: boolean
```
In `bathrooms.Update`:
```typescript
adwall_unlockable?: boolean
```

**React Native**
- [x] `expo-location` ✅ already in `package.json`
- [x] `@tanstack/react-query` v5 ✅ hook uses correct v5 `useQuery` API
- [x] `supabase.rpc()` ✅ uses `src/lib/supabase.ts` client directly — no JWT wiring needed
- [x] `gap: 10` in StyleSheet ✅ supported RN 0.71+, you're on 0.76.5
- [ ] Wire `NearbyBathroomsPanel` into `app/(tabs)/index.tsx` (map tab) — pass your ad-network call as `onWatchAd`
- [ ] Implement `onWatchAd` in the parent screen — resolves `true` when ad completes

**Example usage in `app/(tabs)/index.tsx`:**
```tsx
import { NearbyBathroomsPanel } from '@/components/NearbyBathroomsPanel';

// Stub — replace with your actual ad network SDK call:
async function handleWatchAd(bathroomId: string): Promise<boolean> {
  // e.g. await AdMob.showRewardedAd();
  return true;
}

export default function MapTab() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <NearbyBathroomsPanel onWatchAd={handleWatchAd} />
    </SafeAreaView>
  );
}
```

---

> ⚠️ **Refactor Opportunity (non-blocking)**
> **File:** `supabase/migrations/002_nearby_feature.sql` — `get_nearby_bathrooms` function
> **Issue:** Hours-open check happens client-side after fetching up to 20 rows. If you scale to thousands of bathrooms, a `CURRENT_TIME`-based SQL filter inside the RPC would be more efficient.
> **Suggestion:** Add `is_open_now` SQL logic only once you're seeing query counts that justify the added complexity — for now, client-side is correct and debuggable.

## Assistant (commentary)

`2026-03-16T05:25:46.214Z`

Using `$staff-mobile-engineer` to assess whether this fits the current Expo/Supabase app cleanly. I’m checking the existing navigation, types, Supabase wiring, and map/home screen so I can answer based on the actual codebase rather than the proposed sketch.

## Assistant (commentary)

`2026-03-16T05:27:00.455Z`

The first pass timed out, likely from broad file enumeration. I’m narrowing the inspection to the specific Expo, Supabase, and type files that matter for this feature.

## Assistant (commentary)

`2026-03-16T05:28:38.644Z`

I’ve confirmed it is an Expo-managed app with Supabase already wired. Next I’m checking whether the proposed hook/component match the existing home/map screen, database schema, and type layout, and whether the proposal breaks any current patterns.

## Assistant (commentary)

`2026-03-16T05:30:53.286Z`

I’ve confirmed the Supabase client is typed and the generated `Database` type currently does not include `adwall_unlockable`. I’m now checking the actual map tab and the existing bathroom model so I can judge integration effort and surface-level risks.

## Assistant (commentary)

`2026-03-16T05:32:30.113Z`

The map tab already has a region-based bathroom query, and the detail screen already supports rewarded ad unlocking for codes. I’m checking those internals now, because that affects whether this is an easy additive feature or a duplicate path that should reuse existing code.

## Assistant (commentary)

`2026-03-16T05:33:59.106Z`

There’s already a rewarded-ad code unlock system in the app, which materially changes the implementation shape. I’m checking whether the proposed new `adwall_unlockable` flag is actually needed or whether it would just duplicate existing eligibility logic.

## Assistant (commentary)

`2026-03-16T05:34:55.431Z`

The codebase confirms two important points: `get_bathrooms_near` already exists, and rewarded code unlocks already exist. That means the feature is feasible, but the fastest production-safe version would plug into those existing paths rather than add parallel location and ad logic.

## Assistant (final_answer)

`2026-03-16T05:36:11.566Z`

Yes. In this repo it is an easy-to-moderate feature, not a hard one, because most of the infrastructure already exists: location permissions are configured in [app.config.ts](C:/Users/T/Desktop/PeeDom/app.config.ts), device location is already centralized in [src/contexts/LocationContext.tsx](C:/Users/T/Desktop/PeeDom/src/contexts/LocationContext.tsx), the map tab is already the right integration point in [app/(tabs)/index.tsx](C:/Users/T/Desktop/PeeDom/app/(tabs)/index.tsx), the spatial RPC already exists in [supabase/migrations/002_functions.sql](C:/Users/T/Desktop/PeeDom/supabase/migrations/002_functions.sql), and rewarded code unlock already exists in [src/hooks/useRewardedCodeUnlock.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useRewardedCodeUnlock.ts) and [app/bathroom/[id].tsx](C:/Users/T/Desktop/PeeDom/app/bathroom/[id].tsx).

I would not ship the draft exactly as written, though. The production-safe version should:
- add a new migration after the current sequence, so `005_...`, not `002_...`
- extend the existing `get_bathrooms_near` path in [src/api/bathrooms.ts](C:/Users/T/Desktop/PeeDom/src/api/bathrooms.ts) instead of creating a parallel nearby RPC unless there is a clear product reason
- reuse `useLocation()` and `useRewardedCodeUnlock()` instead of requesting location and handling ad completion separately inside a new query/component
- update generated/view/function typing in [src/types/database.ts](C:/Users/T/Desktop/PeeDom/src/types/database.ts), not just `bathrooms.Row`
- handle overnight hours correctly and add tests under [__tests__](C:/Users/T/Desktop/PeeDom/__tests__)
- match the repo’s NativeWind/UI patterns instead of introducing a standalone `StyleSheet`-driven surface

One important integration gap in the draft: its ad flow bypasses the app’s existing rewarded-unlock state, so a code unlocked from the panel would not automatically stay consistent with the detail screen flow.

So the answer is yes, I could implement this fairly easily, but I’d implement a repo-native version rather than paste in the proposal verbatim. Clean estimate: roughly half a day to a day including migration, UI, typing, and tests.

## User

`2026-03-16T06:51:40.878Z`

okay. hit me with the repo native version

## Assistant (commentary)

`2026-03-16T06:51:53.504Z`

I’m implementing this against the current app architecture, not the earlier sketch. First I’m reading the existing card/button patterns and the database type shape so the new surface reuses the map, query, and rewarded-unlock systems instead of duplicating them.

## Assistant (commentary)

`2026-03-16T06:52:38.313Z`

I’ve got the integration shape: use current location context, current PostGIS RPC, and the existing rewarded unlock path. I’m checking the bottom-sheet and map layout now so I can place the nearby section without shrinking the map into a cramped screen.

## Assistant (commentary)

`2026-03-16T06:53:33.175Z`

I’m going to avoid a schema migration unless the product actually needs per-bathroom ad eligibility. The cleanest version here is to reuse the app’s existing rewarded-unlock rules for any locked bathroom that already has a visible code, which keeps the panel and detail screen consistent.

## Assistant (commentary)

`2026-03-16T06:53:41.360Z`

Plan:
1. Add pure utilities for hours parsing/open-now checks and nearby highlight derivation, with tests.
2. Add a coordinate-based nearby query and a lightweight hook that reuses `useLocation` and the existing Supabase RPC.
3. Build a NativeWind `NearbyBathroomsPanel` that uses the existing rewarded unlock flow and visible-code query.
4. Integrate the panel into the map tab without replacing the current marker/bottom-sheet behavior.
5. Run `npm run lint` and `npm test` and fix anything the new code surfaces.

## Assistant (commentary)

`2026-03-16T06:53:45.865Z`

I’m starting with the pure data layer: a safe hours parser, an open-now evaluator that handles overnight ranges, and a nearby-highlights selector. That gives us something testable before wiring UI and avoids baking business logic into the screen.

## User

`2026-03-16T06:53:50.231Z`

<turn_aborted>
The user interrupted the previous turn on purpose. Any running unified exec processes were terminated. If any tools/commands were aborted, they may have partially executed; verify current state before retrying.
</turn_aborted>
