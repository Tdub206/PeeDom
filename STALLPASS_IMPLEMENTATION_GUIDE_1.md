# StallPass — Acquisition-Grade Implementation Guide

> **Purpose:** Self-contained, zero-context-needed implementation guide. Any coding agent can pick up any section and execute it independently.
>
> **Stack:** Fastify (Node/TS) + PostgreSQL 15+ with PostGIS + React Native (Expo SDK 54+) + TanStack Query v5 + Zustand
>
> **Repo:** `Tdub206/Pee-Dom` — monorepo: `frontend/` + `backend/`
>
> **Domain:** `stallpass.org` | API: `api.stallpass.org`
>
> **Database:** PostgreSQL with PostGIS extension enabled. All geo columns use `GEOGRAPHY(POINT, 4326)`.
>
> **Auth:** JWT with refresh token rotation + mutex handling (already implemented).

---

## DEPENDENCY NOTICE

Sections are designed for parallel execution **except** where noted. The dependency graph is:

```
Section 1 (Schema) ──► Section 2 (Trust) ──► Section 3 (Anti-Sybil)
       │                      │
       ▼                      ▼
Section 4 (Events) ──► Section 5 (Predictions)
       │
       ▼
Section 6 (Business Capture) ──► Section 7 (NFC Schema)
       │
       ▼
Section 8 (Geo Seeding)    [independent]
Section 9 (Copycat UX)     [depends on Section 2]
Section 10 (Urgency DAU)   [depends on Section 4]
Section 11 (Points-Trust)  [depends on Section 2]
```

**Parallel execution groups:**
- **Group A:** Section 1 → Section 2 → Section 3 (must be sequential)
- **Group B:** Section 4 → Section 5 → Section 10 (must be sequential)
- **Group C:** Section 8 (fully independent, can start immediately)
- **Group D:** Section 6 → Section 7 (sequential, but independent of other groups after Section 1)
- **Group E:** Section 9 + Section 11 (both depend on Section 2 completion)

---

# ═══════════════════════════════════════════════════════
# SECTION 1: SCHEMA EXTENSIONS
# ═══════════════════════════════════════════════════════

## Context
Transform the `bathrooms` table from a static location record into a living data node. This migration is the foundation for Sections 2, 5, 6, and 7.

## File to Create
`backend/src/migrations/001_schema_extensions.sql`

## Exact SQL

```sql
-- ============================================================
-- Migration: 001_schema_extensions.sql
-- Purpose: Extend bathrooms table for access intelligence network
-- Run: psql -U <user> -d <db> -f 001_schema_extensions.sql
-- ============================================================

-- Step 1: Create ENUM types
DO $$ BEGIN
    CREATE TYPE access_type_enum AS ENUM (
        'public',
        'code',
        'purchase_required',
        'key',
        'nfc_future'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE integration_status_enum AS ENUM (
        'planned',
        'testing',
        'live'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add columns to bathrooms table
-- NOTE: If column already exists, the IF NOT EXISTS pattern handles it.
DO $$ BEGIN
    ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS access_type access_type_enum DEFAULT 'public';
    ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS hardware_ready BOOLEAN DEFAULT false;
    ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS partner_lock_vendor_id UUID NULL;
    ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS access_code TEXT NULL;
    ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS code_updated_at TIMESTAMPTZ NULL;
    ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS code_confidence FLOAT DEFAULT NULL;
    ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS dwell_time_avg_seconds INT NULL;
    ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS peak_usage_jsonb JSONB DEFAULT '{}';
    ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'community';
    ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS business_id UUID NULL;
END $$;

-- Step 3: Add constraints
ALTER TABLE bathrooms
    ADD CONSTRAINT chk_code_confidence
    CHECK (code_confidence IS NULL OR (code_confidence >= 0.0 AND code_confidence <= 1.0));

-- Step 4: Add indexes
CREATE INDEX IF NOT EXISTS idx_bathrooms_access_type ON bathrooms(access_type);
CREATE INDEX IF NOT EXISTS idx_bathrooms_code_confidence ON bathrooms(code_confidence) WHERE code_confidence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bathrooms_business_id ON bathrooms(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bathrooms_source ON bathrooms(source);

-- Step 5: Add comment annotations for documentation
COMMENT ON COLUMN bathrooms.access_type IS 'Classification of access method: public, code, purchase_required, key, nfc_future';
COMMENT ON COLUMN bathrooms.hardware_ready IS 'Schema placeholder for future NFC/smart-lock hardware integration';
COMMENT ON COLUMN bathrooms.partner_lock_vendor_id IS 'FK placeholder for future hardware vendor partnerships';
COMMENT ON COLUMN bathrooms.code_confidence IS 'Probabilistic truth state [0.0-1.0]. NULL = no code. Fed by trust graph.';
COMMENT ON COLUMN bathrooms.peak_usage_jsonb IS 'Hourly usage histogram: {"0": 5, "1": 2, ..., "23": 18}';
COMMENT ON COLUMN bathrooms.source IS 'Data origin: community | osm | google_places | business_claimed';
```

## Verification Query
After running, confirm:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bathrooms'
ORDER BY ordinal_position;
```

Expected: You should see `access_type`, `hardware_ready`, `partner_lock_vendor_id`, `access_code`, `code_updated_at`, `code_confidence`, `dwell_time_avg_seconds`, `peak_usage_jsonb`, `source`, `business_id` among the columns.

---

# ═══════════════════════════════════════════════════════
# SECTION 2: TRUST GRAPH — User Reputation + Code Confidence
# ═══════════════════════════════════════════════════════

## Context
Every user becomes a weighted node in a trust network. Every contribution is an edge. Code validity becomes a probabilistic truth state. This is the core moat.

## Files to Create
1. `backend/src/migrations/002_trust_graph.sql`
2. `backend/src/plugins/trustEngine.ts`
3. `backend/src/routes/trust.ts`

## Migration: `002_trust_graph.sql`

```sql
-- ============================================================
-- Migration: 002_trust_graph.sql
-- Purpose: Trust graph tables for user reputation + code verification
-- Depends on: 001_schema_extensions.sql
-- ============================================================

-- User trust scores
CREATE TABLE IF NOT EXISTS user_trust (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    trust_score FLOAT NOT NULL DEFAULT 0.5
        CHECK (trust_score >= 0.0 AND trust_score <= 1.0),
    total_contributions INT NOT NULL DEFAULT 0,
    accurate_contributions INT NOT NULL DEFAULT 0,
    flagged_count INT NOT NULL DEFAULT 0,
    shadow_banned BOOLEAN NOT NULL DEFAULT false,
    last_contribution_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying active trusted users
CREATE INDEX IF NOT EXISTS idx_user_trust_score ON user_trust(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_trust_shadow ON user_trust(shadow_banned) WHERE shadow_banned = true;

-- Code verification history (append-only ledger)
CREATE TABLE IF NOT EXISTS code_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bathroom_id UUID NOT NULL REFERENCES bathrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_code TEXT,
    action TEXT NOT NULL CHECK (action IN ('confirm', 'deny', 'update')),
    device_fingerprint TEXT,
    geo_point GEOGRAPHY(POINT, 4326),
    trust_weight FLOAT NOT NULL DEFAULT 0.5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_verifications_bathroom ON code_verifications(bathroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_verifications_user ON code_verifications(user_id, created_at DESC);

-- Auto-initialize trust row on user creation
CREATE OR REPLACE FUNCTION initialize_user_trust()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_trust (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_initialize_user_trust ON users;
CREATE TRIGGER trg_initialize_user_trust
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_trust();

-- Backfill existing users
INSERT INTO user_trust (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Code confidence decay function (run via pg_cron or app-level scheduler)
-- Decays all code-type bathroom confidence by 0.3% per hour
-- A code not re-verified in ~14 days drops below 0.5
CREATE OR REPLACE FUNCTION decay_code_confidence()
RETURNS void AS $$
BEGIN
    UPDATE bathrooms
    SET code_confidence = GREATEST(0.05, code_confidence * 0.997),
        updated_at = NOW()
    WHERE access_type = 'code'
      AND code_confidence IS NOT NULL
      AND code_confidence > 0.05;
END;
$$ LANGUAGE plpgsql;

-- OPTIONAL: If pg_cron is available, schedule hourly:
-- SELECT cron.schedule('decay-code-confidence', '0 * * * *', 'SELECT decay_code_confidence()');
-- If pg_cron is NOT available, call this from a Fastify cron job (see trustEngine.ts).
```

## Trust Engine Plugin: `backend/src/plugins/trustEngine.ts`

```typescript
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// ─── Types ──────────────────────────────────────────────

interface TrustScoreResult {
  user_id: string;
  trust_score: number;
  total_contributions: number;
  accurate_contributions: number;
  shadow_banned: boolean;
}

interface CodeConfidenceUpdate {
  bathroom_id: string;
  action: 'confirm' | 'deny' | 'update';
  reporter_trust_score: number;
  reported_code?: string;
}

// ─── Constants ──────────────────────────────────────────

const CONFIRM_WEIGHT = 0.1;        // How much a confirm nudges confidence up
const DENY_WEIGHT = 0.15;          // How much a deny nudges confidence down (asymmetric — denial is stronger)
const NEW_CODE_BASE_FACTOR = 0.6;  // New code starts at reporter_trust * this factor
const TRUST_DECAY_LAMBDA = 0.01;   // Exponential decay rate for inactive users
const FLAG_PENALTY_PER = 0.05;     // Trust penalty per flag

// ─── Plugin ─────────────────────────────────────────────

const trustEnginePlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  // ── Recalculate a single user's trust score ──
  fastify.decorate('recalculateTrust', async (userId: string): Promise<number> => {
    const { rows } = await fastify.pg.query<TrustScoreResult>(
      `SELECT * FROM user_trust WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) return 0.5;

    const row = rows[0];

    // Base accuracy ratio (avoid division by zero)
    const accuracyRatio = row.total_contributions > 0
      ? row.accurate_contributions / row.total_contributions
      : 0.5;

    // Time decay: inactive users lose trust slowly
    let timeDecay = 1.0;
    if (row.last_contribution_at) {
      const daysSince = (Date.now() - new Date(row.last_contribution_at).getTime()) / (1000 * 60 * 60 * 24);
      timeDecay = Math.exp(-TRUST_DECAY_LAMBDA * daysSince);
    }

    // Flag penalty
    const flagPenalty = Math.min(row.flagged_count * FLAG_PENALTY_PER, 0.5);

    // Final score: clamped [0.0, 1.0]
    const newScore = Math.max(0.0, Math.min(1.0,
      accuracyRatio * timeDecay * (1.0 - flagPenalty)
    ));

    await fastify.pg.query(
      `UPDATE user_trust SET trust_score = $1, updated_at = NOW() WHERE user_id = $2`,
      [newScore, userId]
    );

    return newScore;
  });

  // ── Update code confidence after a verification event ──
  fastify.decorate('updateCodeConfidence', async (update: CodeConfidenceUpdate): Promise<number> => {
    const { bathroom_id, action, reporter_trust_score, reported_code } = update;

    // Get current confidence
    const { rows } = await fastify.pg.query<{ code_confidence: number | null; access_code: string | null }>(
      `SELECT code_confidence, access_code FROM bathrooms WHERE id = $1`,
      [bathroom_id]
    );

    if (rows.length === 0) throw new Error(`Bathroom ${bathroom_id} not found`);

    let currentConfidence = rows[0].code_confidence ?? 0.5;
    let newConfidence: number;
    let newCode = rows[0].access_code;

    switch (action) {
      case 'confirm':
        newConfidence = Math.min(1.0, currentConfidence + (CONFIRM_WEIGHT * reporter_trust_score));
        break;

      case 'deny':
        newConfidence = Math.max(0.0, currentConfidence - (DENY_WEIGHT * reporter_trust_score));
        break;

      case 'update':
        // New code reported: confidence resets proportional to reporter trust
        newConfidence = reporter_trust_score * NEW_CODE_BASE_FACTOR;
        newCode = reported_code ?? newCode;
        break;

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    await fastify.pg.query(
      `UPDATE bathrooms
       SET code_confidence = $1,
           access_code = $2,
           code_updated_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [newConfidence, newCode, bathroom_id]
    );

    return newConfidence;
  });

  // ── Record a contribution and update trust ──
  fastify.decorate('recordContribution', async (
    userId: string,
    accurate: boolean
  ): Promise<void> => {
    const accurateIncrement = accurate ? 1 : 0;

    await fastify.pg.query(
      `UPDATE user_trust
       SET total_contributions = total_contributions + 1,
           accurate_contributions = accurate_contributions + $1,
           last_contribution_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $2`,
      [accurateIncrement, userId]
    );

    // Recalculate after contribution
    await (fastify as any).recalculateTrust(userId);
  });

  // ── Hourly code confidence decay (call from cron) ──
  fastify.decorate('decayAllCodeConfidence', async (): Promise<number> => {
    const result = await fastify.pg.query(
      `UPDATE bathrooms
       SET code_confidence = GREATEST(0.05, code_confidence * 0.997),
           updated_at = NOW()
       WHERE access_type = 'code'
         AND code_confidence IS NOT NULL
         AND code_confidence > 0.05
       RETURNING id`
    );
    return result.rowCount ?? 0;
  });
};

export default fp(trustEnginePlugin, {
  name: 'trustEngine',
  dependencies: ['pg'], // Assumes @fastify/postgres is registered as 'pg'
});
```

## Fastify Type Augmentation: `backend/src/types/fastify.d.ts`

Add these declarations (or merge into existing file):

```typescript
import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    recalculateTrust: (userId: string) => Promise<number>;
    updateCodeConfidence: (update: {
      bathroom_id: string;
      action: 'confirm' | 'deny' | 'update';
      reporter_trust_score: number;
      reported_code?: string;
    }) => Promise<number>;
    recordContribution: (userId: string, accurate: boolean) => Promise<void>;
    decayAllCodeConfidence: () => Promise<number>;
  }
}
```

## API Routes: `backend/src/routes/trust.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface VerifyCodeBody {
  bathroom_id: string;
  action: 'confirm' | 'deny' | 'update';
  reported_code?: string;
  device_fingerprint?: string;
  latitude?: number;
  longitude?: number;
}

export default async function trustRoutes(fastify: FastifyInstance) {

  // POST /api/codes/verify — User confirms, denies, or updates a code
  fastify.post<{ Body: VerifyCodeBody }>(
    '/api/codes/verify',
    {
      preHandler: [fastify.authenticate], // your existing auth hook
      schema: {
        body: {
          type: 'object',
          required: ['bathroom_id', 'action'],
          properties: {
            bathroom_id: { type: 'string', format: 'uuid' },
            action: { type: 'string', enum: ['confirm', 'deny', 'update'] },
            reported_code: { type: 'string', maxLength: 50 },
            device_fingerprint: { type: 'string', maxLength: 256 },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: VerifyCodeBody }>, reply: FastifyReply) => {
      const userId = request.user.id; // from your JWT auth
      const { bathroom_id, action, reported_code, device_fingerprint, latitude, longitude } = request.body;

      // 1. Get reporter's trust score
      const { rows: trustRows } = await fastify.pg.query(
        `SELECT trust_score, shadow_banned FROM user_trust WHERE user_id = $1`,
        [userId]
      );

      const reporterTrust = trustRows[0]?.trust_score ?? 0.5;
      const isShadowBanned = trustRows[0]?.shadow_banned ?? false;

      // 2. Use effective trust weight (shadow banned = 0 weight)
      const effectiveTrust = isShadowBanned ? 0.0 : reporterTrust;

      // 3. Record verification in ledger
      const geoPoint = (latitude && longitude)
        ? `SRID=4326;POINT(${longitude} ${latitude})`
        : null;

      await fastify.pg.query(
        `INSERT INTO code_verifications
           (bathroom_id, user_id, reported_code, action, device_fingerprint, geo_point, trust_weight)
         VALUES ($1, $2, $3, $4, $5, $6::geography, $7)`,
        [bathroom_id, userId, reported_code ?? null, action, device_fingerprint ?? null, geoPoint, effectiveTrust]
      );

      // 4. Update code confidence (only if not shadow banned)
      let newConfidence: number | null = null;
      if (!isShadowBanned) {
        newConfidence = await (fastify as any).updateCodeConfidence({
          bathroom_id,
          action,
          reporter_trust_score: effectiveTrust,
          reported_code,
        });
      }

      // 5. Record contribution for trust recalculation
      // For now, mark all contributions as "accurate" — accuracy is determined
      // later when consensus emerges (see Section 11)
      await (fastify as any).recordContribution(userId, true);

      return reply.code(200).send({
        success: true,
        code_confidence: newConfidence,
        message: action === 'update' ? 'Code updated' : `Code ${action}ed`,
      });
    }
  );

  // GET /api/users/me/trust — User views their own trust score
  fastify.get(
    '/api/users/me/trust',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;

      const { rows } = await fastify.pg.query(
        `SELECT trust_score, total_contributions, accurate_contributions, last_contribution_at
         FROM user_trust WHERE user_id = $1`,
        [userId]
      );

      if (rows.length === 0) {
        return reply.code(200).send({
          trust_score: 0.5,
          total_contributions: 0,
          accurate_contributions: 0,
          level: 'newcomer',
        });
      }

      const row = rows[0];
      const level =
        row.trust_score >= 0.8 ? 'trusted' :
        row.trust_score >= 0.5 ? 'established' :
        row.trust_score >= 0.3 ? 'building' : 'newcomer';

      return reply.code(200).send({
        trust_score: Math.round(row.trust_score * 100) / 100,
        total_contributions: row.total_contributions,
        accurate_contributions: row.accurate_contributions,
        last_contribution_at: row.last_contribution_at,
        level,
      });
    }
  );
}
```

## Cron Setup for Decay

In your main Fastify server entry point (e.g., `backend/src/server.ts`), add after plugin registration:

```typescript
import cron from 'fastify-cron';

// Register cron plugin
await app.register(cron, {
  jobs: [
    {
      cronTime: '0 * * * *', // Every hour
      onTick: async () => {
        try {
          const affected = await (app as any).decayAllCodeConfidence();
          app.log.info(`Code confidence decay: ${affected} bathrooms updated`);
        } catch (err) {
          app.log.error(err, 'Code confidence decay failed');
        }
      },
      start: true,
    },
  ],
});
```

**Package to add:** `npm install fastify-cron`

---

# ═══════════════════════════════════════════════════════
# SECTION 3: ANTI-SYBIL LAYER
# ═══════════════════════════════════════════════════════

## Context
Protect data quality from fake accounts, bot submissions, and coordinated manipulation. Shadow-banned users never know they're banned — their experience looks identical, but their contributions carry zero weight.

## Files to Create
1. `backend/src/plugins/antiSybil.ts`
2. `frontend/src/hooks/useDeviceFingerprint.ts`

## Backend Plugin: `backend/src/plugins/antiSybil.ts`

```typescript
import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

// ─── Constants ──────────────────────────────────────────

const MAX_CONTRIBUTIONS_PER_10_MIN = 5;
const MAX_ACCOUNTS_PER_DEVICE = 2;
const MIN_TRAVEL_TIME_MINUTES = 15;
const MAX_SPEED_KMH = 200; // Generous — allows highway travel

// ─── Helpers ────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Plugin ─────────────────────────────────────────────

const antiSybilPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  fastify.decorate('checkSybil', async (
    userId: string,
    deviceFingerprint: string | null,
    latitude: number | null,
    longitude: number | null,
  ): Promise<{ allowed: boolean; reason?: string; shouldShadowBan?: boolean }> => {

    // ── Check 1: Velocity ──
    const { rows: velocityRows } = await fastify.pg.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM code_verifications
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '10 minutes'`,
      [userId]
    );
    if (parseInt(velocityRows[0].count) >= MAX_CONTRIBUTIONS_PER_10_MIN) {
      return { allowed: false, reason: 'rate_limit' };
    }

    // ── Check 2: Device fingerprint collision ──
    if (deviceFingerprint) {
      const { rows: deviceRows } = await fastify.pg.query<{ user_count: string }>(
        `SELECT COUNT(DISTINCT user_id) as user_count FROM code_verifications
         WHERE device_fingerprint = $1`,
        [deviceFingerprint]
      );
      if (parseInt(deviceRows[0].user_count) > MAX_ACCOUNTS_PER_DEVICE) {
        return { allowed: true, shouldShadowBan: true, reason: 'device_collision' };
      }
    }

    // ── Check 3: Geo-impossibility ──
    if (latitude && longitude) {
      const { rows: lastGeo } = await fastify.pg.query<{
        lat: number; lon: number; created_at: string;
      }>(
        `SELECT
           ST_Y(geo_point::geometry) as lat,
           ST_X(geo_point::geometry) as lon,
           created_at
         FROM code_verifications
         WHERE user_id = $1 AND geo_point IS NOT NULL
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (lastGeo.length > 0) {
        const distKm = haversineKm(lastGeo[0].lat, lastGeo[0].lon, latitude, longitude);
        const timeDiffHours = (Date.now() - new Date(lastGeo[0].created_at).getTime()) / (1000 * 60 * 60);

        if (timeDiffHours > 0) {
          const impliedSpeedKmh = distKm / timeDiffHours;
          if (impliedSpeedKmh > MAX_SPEED_KMH) {
            return { allowed: true, shouldShadowBan: true, reason: 'geo_impossible' };
          }
        }
      }
    }

    // ── Check 4: Behavioral — no browse-before-verify ──
    // (This check uses the events table from Section 4.
    //  If Section 4 isn't deployed yet, skip this check.)
    try {
      const { rows: browseCheck } = await fastify.pg.query<{ browsed: boolean }>(
        `SELECT EXISTS(
           SELECT 1 FROM events
           WHERE user_id = $1
             AND event_type = 'bathroom_viewed'
             AND created_at > NOW() - INTERVAL '1 hour'
         ) as browsed`,
        [userId]
      );
      // Only flag if we CAN check — if events table doesn't exist, skip
      if (!browseCheck[0]?.browsed) {
        // Suspicious but not conclusive — log but don't ban
        fastify.log.warn({ userId }, 'Verification without recent browse activity');
      }
    } catch {
      // Events table may not exist yet — skip gracefully
    }

    return { allowed: true };
  });

  // ── Execute shadow ban ──
  fastify.decorate('shadowBanUser', async (userId: string, reason: string): Promise<void> => {
    await fastify.pg.query(
      `UPDATE user_trust
       SET shadow_banned = true, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
    fastify.log.warn({ userId, reason }, 'User shadow banned');
  });
};

export default fp(antiSybilPlugin, {
  name: 'antiSybil',
  dependencies: ['pg'],
});
```

## Integration Point

In the `/api/codes/verify` route from Section 2, add this **before** processing:

```typescript
// Add at top of the verify handler, before trust lookup:
const sybilCheck = await (fastify as any).checkSybil(
  userId,
  device_fingerprint ?? null,
  latitude ?? null,
  longitude ?? null,
);

if (!sybilCheck.allowed) {
  // Return success to avoid tipping off the user
  return reply.code(200).send({
    success: true,
    code_confidence: null,
    message: `Code ${action}ed`,
  });
}

if (sybilCheck.shouldShadowBan) {
  await (fastify as any).shadowBanUser(userId, sybilCheck.reason);
}
```

## Frontend Hook: `frontend/src/hooks/useDeviceFingerprint.ts`

```typescript
import { useEffect, useState } from 'react';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const INSTALL_ID_KEY = 'stallpass_install_id';

export function useDeviceFingerprint(): string | null {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function generate() {
      try {
        // Get or create installation ID (survives app updates, not reinstalls)
        let installId = await SecureStore.getItemAsync(INSTALL_ID_KEY);
        if (!installId) {
          installId = Crypto.randomUUID();
          await SecureStore.setItemAsync(INSTALL_ID_KEY, installId);
        }

        // Composite fingerprint
        const raw = [
          Device.modelName ?? 'unknown',
          Device.osVersion ?? 'unknown',
          Application.applicationId ?? 'unknown',
          installId,
        ].join('|');

        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          raw
        );

        if (mounted) setFingerprint(hash);
      } catch (err) {
        console.warn('Device fingerprint generation failed:', err);
        if (mounted) setFingerprint(null);
      }
    }

    generate();
    return () => { mounted = false; };
  }, []);

  return fingerprint;
}
```

**Expo packages needed:**
```bash
npx expo install expo-device expo-application expo-secure-store expo-crypto
```

## API Client Integration

In your API client (wherever you make authenticated requests), attach the fingerprint:

```typescript
// In your Fastify API client wrapper:
import { useDeviceFingerprint } from '../hooks/useDeviceFingerprint';

// When making contribution requests, include:
headers: {
  'Authorization': `Bearer ${token}`,
  'X-Device-Fingerprint': fingerprint ?? '',
}
```

---

# ═══════════════════════════════════════════════════════
# SECTION 4: EVENT PIPELINE
# ═══════════════════════════════════════════════════════

## Context
Append-only event log capturing every meaningful user interaction. This feeds predictions, analytics, business dashboards, and eventually ML training. Partitioned by month for query performance.

## Files to Create
1. `backend/src/migrations/003_events_pipeline.sql`
2. `backend/src/routes/events.ts`
3. `frontend/src/hooks/useEventEmitter.ts`
4. `frontend/src/stores/eventBatchStore.ts`

## Migration: `003_events_pipeline.sql`

```sql
-- ============================================================
-- Migration: 003_events_pipeline.sql
-- Purpose: Append-only event pipeline with monthly partitioning
-- ============================================================

-- Create partitioned events table
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    bathroom_id UUID,
    payload JSONB DEFAULT '{}',
    device_fingerprint TEXT,
    geo_point GEOGRAPHY(POINT, 4326),
    session_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for next 12 months
-- NOTE: Adjust start dates based on your launch date
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..11 LOOP
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'events_' || TO_CHAR(start_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF events
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );

        start_date := end_date;
    END LOOP;
END $$;

-- Indexes on the parent (propagate to partitions)
CREATE INDEX IF NOT EXISTS idx_events_user_type ON events(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_bathroom ON events(bathroom_id, created_at DESC) WHERE bathroom_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, created_at) WHERE session_id IS NOT NULL;

-- Allowed event types (enforced at app level, documented here)
COMMENT ON TABLE events IS 'Allowed event_type values:
  bathroom_viewed, bathroom_searched, code_viewed, code_confirmed,
  code_denied, code_submitted, check_in, check_out,
  prediction_shown, prediction_correct, user_override,
  review_submitted, photo_uploaded, report_submitted,
  app_opened, app_backgrounded, urgency_session';
```

## Event Routes: `backend/src/routes/events.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Whitelist of allowed event types
const ALLOWED_EVENT_TYPES = new Set([
  'bathroom_viewed',
  'bathroom_searched',
  'code_viewed',
  'code_confirmed',
  'code_denied',
  'code_submitted',
  'check_in',
  'check_out',
  'prediction_shown',
  'prediction_correct',
  'user_override',
  'review_submitted',
  'photo_uploaded',
  'report_submitted',
  'app_opened',
  'app_backgrounded',
  'urgency_session',
]);

interface EventBody {
  event_type: string;
  bathroom_id?: string;
  payload?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  session_id?: string;
}

interface BatchEventBody {
  events: EventBody[];
}

export default async function eventRoutes(fastify: FastifyInstance) {

  // POST /api/events — Single event
  fastify.post<{ Body: EventBody }>(
    '/api/events',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Body: EventBody }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const deviceFingerprint = request.headers['x-device-fingerprint'] as string | undefined;
      const { event_type, bathroom_id, payload, latitude, longitude, session_id } = request.body;

      if (!ALLOWED_EVENT_TYPES.has(event_type)) {
        return reply.code(400).send({ error: `Invalid event_type: ${event_type}` });
      }

      const geoPoint = (latitude && longitude)
        ? `SRID=4326;POINT(${longitude} ${latitude})`
        : null;

      await fastify.pg.query(
        `INSERT INTO events (user_id, event_type, bathroom_id, payload, device_fingerprint, geo_point, session_id)
         VALUES ($1, $2, $3, $4, $5, $6::geography, $7)`,
        [userId, event_type, bathroom_id ?? null, payload ?? {}, deviceFingerprint ?? null, geoPoint, session_id ?? null]
      );

      return reply.code(202).send({ accepted: true });
    }
  );

  // POST /api/events/batch — Batch event submission (for mobile batching)
  fastify.post<{ Body: BatchEventBody }>(
    '/api/events/batch',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Body: BatchEventBody }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const deviceFingerprint = request.headers['x-device-fingerprint'] as string | undefined;
      const { events } = request.body;

      if (!events || events.length === 0) {
        return reply.code(400).send({ error: 'No events provided' });
      }

      if (events.length > 100) {
        return reply.code(400).send({ error: 'Max 100 events per batch' });
      }

      // Filter to valid events only
      const validEvents = events.filter(e => ALLOWED_EVENT_TYPES.has(e.event_type));

      if (validEvents.length === 0) {
        return reply.code(400).send({ error: 'No valid events in batch' });
      }

      // Build batch insert
      const values: any[] = [];
      const placeholders: string[] = [];
      let idx = 1;

      for (const event of validEvents) {
        const geoPoint = (event.latitude && event.longitude)
          ? `SRID=4326;POINT(${event.longitude} ${event.latitude})`
          : null;

        placeholders.push(
          `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}::geography, $${idx + 6})`
        );
        values.push(
          userId,
          event.event_type,
          event.bathroom_id ?? null,
          event.payload ?? {},
          deviceFingerprint ?? null,
          geoPoint,
          event.session_id ?? null,
        );
        idx += 7;
      }

      await fastify.pg.query(
        `INSERT INTO events (user_id, event_type, bathroom_id, payload, device_fingerprint, geo_point, session_id)
         VALUES ${placeholders.join(', ')}`,
        values
      );

      return reply.code(202).send({ accepted: validEvents.length });
    }
  );
}
```

## Frontend Event Batch Store: `frontend/src/stores/eventBatchStore.ts`

```typescript
import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';

interface PendingEvent {
  event_type: string;
  bathroom_id?: string;
  payload?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  session_id?: string;
  queued_at: number; // timestamp
}

interface EventBatchState {
  queue: PendingEvent[];
  sessionId: string;
  enqueue: (event: Omit<PendingEvent, 'queued_at' | 'session_id'>) => void;
  flush: (apiClient: { post: (url: string, body: unknown) => Promise<unknown> }) => Promise<void>;
  clear: () => void;
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useEventBatchStore = create<EventBatchState>((set, get) => ({
  queue: [],
  sessionId: generateSessionId(),

  enqueue: (event) => {
    set((state) => ({
      queue: [...state.queue, {
        ...event,
        session_id: state.sessionId,
        queued_at: Date.now(),
      }],
    }));

    // Auto-flush if queue hits 20 events
    if (get().queue.length >= 20) {
      // Caller must provide apiClient — this is a hint, not auto-flush
      // The useEventEmitter hook handles actual flushing
    }
  },

  flush: async (apiClient) => {
    const currentQueue = get().queue;
    if (currentQueue.length === 0) return;

    // Optimistic clear — if POST fails, events are lost (acceptable for analytics)
    set({ queue: [] });

    try {
      await apiClient.post('/api/events/batch', { events: currentQueue });
    } catch (err) {
      console.warn('Event batch flush failed:', err);
      // Re-enqueue on failure (optional — depends on how critical events are)
      // For v1, losing some events is acceptable
    }
  },

  clear: () => set({ queue: [] }),
}));
```

## Frontend Event Emitter Hook: `frontend/src/hooks/useEventEmitter.ts`

```typescript
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useEventBatchStore } from '../stores/eventBatchStore';
import { useApiClient } from './useApiClient'; // your existing API client hook

const FLUSH_INTERVAL_MS = 30_000; // 30 seconds

export function useEventEmitter() {
  const { enqueue, flush } = useEventBatchStore();
  const apiClient = useApiClient();
  const flushIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Periodic flush
  useEffect(() => {
    flushIntervalRef.current = setInterval(() => {
      flush(apiClient);
    }, FLUSH_INTERVAL_MS);

    return () => {
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
    };
  }, [apiClient, flush]);

  // Flush on app background
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        flush(apiClient);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [apiClient, flush]);

  const emit = useCallback((
    eventType: string,
    data?: {
      bathroom_id?: string;
      payload?: Record<string, unknown>;
      latitude?: number;
      longitude?: number;
    }
  ) => {
    enqueue({
      event_type: eventType,
      bathroom_id: data?.bathroom_id,
      payload: data?.payload,
      latitude: data?.latitude,
      longitude: data?.longitude,
    });
  }, [enqueue]);

  return { emit };
}

// ─── Usage Example ──────────────────────────────────
// const { emit } = useEventEmitter();
//
// // On bathroom detail screen mount:
// emit('bathroom_viewed', { bathroom_id: bathroom.id });
//
// // On search:
// emit('bathroom_searched', {
//   latitude: location.lat,
//   longitude: location.lng,
//   payload: { radius_meters: 1000, results_count: 12 },
// });
//
// // On code reveal:
// emit('code_viewed', { bathroom_id: bathroom.id });
```

---

# ═══════════════════════════════════════════════════════
# SECTION 5: HEURISTIC PREDICTION LAYER
# ═══════════════════════════════════════════════════════

## Context
"Smart" features powered by if-statements, not ML. Users see intelligence. You collect labeled training data. Swap for real models later without changing the API contract.

## Files to Create
1. `backend/src/routes/predictions.ts`
2. `frontend/src/components/PredictionBadge.tsx`

## Backend: `backend/src/routes/predictions.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface PredictionResponse {
  likely_accessible: boolean;
  confidence: number;
  busy_level: 'quiet' | 'moderate' | 'busy' | 'unknown';
  best_time: string | null;
  model_version: string;
}

export default async function predictionRoutes(fastify: FastifyInstance) {

  fastify.get<{ Params: { id: string } }>(
    '/api/bathrooms/:id/predictions',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      // 1. Get bathroom data
      const { rows } = await fastify.pg.query<{
        access_type: string;
        code_confidence: number | null;
        peak_usage_jsonb: Record<string, number>;
      }>(
        `SELECT access_type, code_confidence, peak_usage_jsonb FROM bathrooms WHERE id = $1`,
        [id]
      );

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Bathroom not found' });
      }

      const bathroom = rows[0];
      const currentHour = new Date().getHours();

      // 2. Compute likely_accessible (heuristic)
      let likelyAccessible = false;
      let confidence = 0;

      switch (bathroom.access_type) {
        case 'public':
          likelyAccessible = true;
          confidence = 0.95;
          break;
        case 'purchase_required':
          // Business hours heuristic: 7am-10pm
          likelyAccessible = currentHour >= 7 && currentHour <= 22;
          confidence = likelyAccessible ? 0.7 : 0.3;
          break;
        case 'code':
          if (bathroom.code_confidence !== null && bathroom.code_confidence > 0.6) {
            likelyAccessible = true;
            confidence = bathroom.code_confidence;
          } else if (bathroom.code_confidence !== null) {
            likelyAccessible = false;
            confidence = 1.0 - bathroom.code_confidence;
          } else {
            likelyAccessible = false;
            confidence = 0.5; // Unknown
          }
          break;
        default:
          likelyAccessible = false;
          confidence = 0.3;
      }

      // 3. Compute busy_level from recent events
      let busyLevel: 'quiet' | 'moderate' | 'busy' | 'unknown' = 'unknown';

      try {
        const { rows: viewRows } = await fastify.pg.query<{ recent_views: string }>(
          `SELECT COUNT(*) as recent_views FROM events
           WHERE bathroom_id = $1
             AND event_type = 'bathroom_viewed'
             AND created_at > NOW() - INTERVAL '1 hour'`,
          [id]
        );

        const recentViews = parseInt(viewRows[0].recent_views);
        const historicalAvg = bathroom.peak_usage_jsonb?.[String(currentHour)] ?? 0;

        if (historicalAvg === 0 && recentViews === 0) {
          busyLevel = 'unknown';
        } else if (historicalAvg === 0) {
          busyLevel = recentViews > 5 ? 'busy' : recentViews > 2 ? 'moderate' : 'quiet';
        } else {
          const ratio = recentViews / historicalAvg;
          busyLevel = ratio > 1.5 ? 'busy' : ratio > 0.75 ? 'moderate' : 'quiet';
        }
      } catch {
        // Events table may not exist yet
        busyLevel = 'unknown';
      }

      // 4. Compute best_time (simple: lowest historical hour)
      let bestTime: string | null = null;
      const usage = bathroom.peak_usage_jsonb;
      if (usage && Object.keys(usage).length > 0) {
        const sorted = Object.entries(usage).sort((a, b) => (a[1] as number) - (b[1] as number));
        const bestHour = parseInt(sorted[0][0]);
        bestTime = bestHour < 12
          ? `${bestHour === 0 ? 12 : bestHour}:00 AM`
          : `${bestHour === 12 ? 12 : bestHour - 12}:00 PM`;
      }

      const prediction: PredictionResponse = {
        likely_accessible: likelyAccessible,
        confidence: Math.round(confidence * 100) / 100,
        busy_level: busyLevel,
        best_time: bestTime,
        model_version: 'heuristic-v1',
      };

      return reply.code(200).send(prediction);
    }
  );
}
```

## Frontend Component: `frontend/src/components/PredictionBadge.tsx`

```tsx
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useEventEmitter } from '../hooks/useEventEmitter';
import { useApiClient } from '../hooks/useApiClient';

interface PredictionBadgeProps {
  bathroomId: string;
}

interface Prediction {
  likely_accessible: boolean;
  confidence: number;
  busy_level: 'quiet' | 'moderate' | 'busy' | 'unknown';
  best_time: string | null;
  model_version: string;
}

const BUSY_COLORS = {
  quiet: '#22c55e',
  moderate: '#eab308',
  busy: '#ef4444',
  unknown: '#6b7280',
} as const;

const BUSY_LABELS = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
  unknown: 'No data',
} as const;

export function PredictionBadge({ bathroomId }: PredictionBadgeProps) {
  const api = useApiClient();
  const { emit } = useEventEmitter();

  const { data: prediction, isLoading } = useQuery<Prediction>({
    queryKey: ['prediction', bathroomId],
    queryFn: () => api.get(`/api/bathrooms/${bathroomId}/predictions`),
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  // Log that prediction was shown
  useEffect(() => {
    if (prediction) {
      emit('prediction_shown', {
        bathroom_id: bathroomId,
        payload: {
          likely_accessible: prediction.likely_accessible,
          confidence: prediction.confidence,
          busy_level: prediction.busy_level,
          model_version: prediction.model_version,
        },
      });
    }
  }, [prediction, bathroomId, emit]);

  if (isLoading || !prediction) return null;

  const accessColor = prediction.likely_accessible ? '#22c55e' : '#ef4444';
  const busyColor = BUSY_COLORS[prediction.busy_level];

  return (
    <View style={styles.container}>
      {/* Access indicator */}
      <View style={[styles.badge, { backgroundColor: accessColor + '20', borderColor: accessColor }]}>
        <View style={[styles.dot, { backgroundColor: accessColor }]} />
        <Text style={[styles.badgeText, { color: accessColor }]}>
          {prediction.likely_accessible ? 'Likely Open' : 'May Be Locked'}
        </Text>
        <Text style={styles.confidence}>
          {Math.round(prediction.confidence * 100)}%
        </Text>
      </View>

      {/* Busy level indicator */}
      <View style={[styles.badge, { backgroundColor: busyColor + '20', borderColor: busyColor }]}>
        <View style={[styles.dot, { backgroundColor: busyColor }]} />
        <Text style={[styles.badgeText, { color: busyColor }]}>
          {BUSY_LABELS[prediction.busy_level]}
        </Text>
      </View>

      {/* Best time hint */}
      {prediction.best_time && (
        <Text style={styles.bestTime}>
          Best time: {prediction.best_time}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confidence: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  bestTime: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});
```

---

# ═══════════════════════════════════════════════════════
# SECTION 6: BUSINESS CAPTURE SYSTEM
# ═══════════════════════════════════════════════════════

## Context
Four-phase flywheel: passive listing → claim → dependency → monetization. Each phase builds lock-in.

## Files to Create
1. `backend/src/migrations/004_business_capture.sql`
2. `backend/src/routes/businesses.ts`

## Migration: `004_business_capture.sql`

```sql
-- ============================================================
-- Migration: 004_business_capture.sql
-- Purpose: Business entity + claim system for two-sided marketplace
-- Depends on: 001_schema_extensions.sql (business_id FK on bathrooms)
-- ============================================================

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    geo_point GEOGRAPHY(POINT, 4326),
    category TEXT,
    hours JSONB DEFAULT '{}',
    policies JSONB DEFAULT '{}',
    phone TEXT,
    website TEXT,
    -- Claim system
    claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_by UUID REFERENCES users(id),
    claimed_at TIMESTAMPTZ,
    claim_verification_method TEXT,
    -- Monetization
    verified BOOLEAN NOT NULL DEFAULT false,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium')),
    -- Metadata
    source TEXT DEFAULT 'user_submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_geo ON businesses USING GIST(geo_point);
CREATE INDEX IF NOT EXISTS idx_businesses_claimed ON businesses(claimed) WHERE claimed = true;
CREATE INDEX IF NOT EXISTS idx_businesses_verified ON businesses(verified) WHERE verified = true;

-- Add FK constraint on bathrooms (if not already added in Section 1)
DO $$ BEGIN
    ALTER TABLE bathrooms
        ADD CONSTRAINT fk_bathrooms_business
        FOREIGN KEY (business_id) REFERENCES businesses(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Business claim requests (audit trail)
CREATE TABLE IF NOT EXISTS business_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    email_domain TEXT,
    verification_code TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_business_claims_status ON business_claims(status, created_at DESC);
```

## Routes: `backend/src/routes/businesses.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface ClaimBody {
  business_email: string;
}

interface UpdateBusinessBody {
  hours?: Record<string, unknown>;
  policies?: Record<string, unknown>;
  phone?: string;
  website?: string;
}

export default async function businessRoutes(fastify: FastifyInstance) {

  // GET /api/businesses/:id — Public business profile
  fastify.get<{ Params: { id: string } }>(
    '/api/businesses/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const { rows } = await fastify.pg.query(
        `SELECT b.*,
           (SELECT COUNT(*) FROM bathrooms WHERE business_id = b.id) as bathroom_count,
           (SELECT COALESCE(AVG(code_confidence), 0) FROM bathrooms WHERE business_id = b.id AND code_confidence IS NOT NULL) as avg_confidence
         FROM businesses b WHERE b.id = $1`,
        [id]
      );

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Business not found' });
      }

      return reply.send(rows[0]);
    }
  );

  // POST /api/businesses/:id/claim — Initiate claim
  fastify.post<{ Params: { id: string }; Body: ClaimBody }>(
    '/api/businesses/:id/claim',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: ClaimBody }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const { id } = request.params;
      const { business_email } = request.body;

      // Check if already claimed
      const { rows: existing } = await fastify.pg.query(
        `SELECT claimed, claimed_by FROM businesses WHERE id = $1`,
        [id]
      );

      if (existing.length === 0) {
        return reply.code(404).send({ error: 'Business not found' });
      }

      if (existing[0].claimed) {
        return reply.code(409).send({ error: 'Business already claimed' });
      }

      // Extract email domain for verification
      const emailDomain = business_email.split('@')[1]?.toLowerCase();

      // Generate verification code
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Record claim request
      await fastify.pg.query(
        `INSERT INTO business_claims (business_id, user_id, email_domain, verification_code)
         VALUES ($1, $2, $3, $4)`,
        [id, userId, emailDomain, verificationCode]
      );

      // TODO: Send verification email via transactional email service
      // For now, log the code (replace with SendGrid/Resend in production)
      fastify.log.info({ business_id: id, email: business_email, code: verificationCode },
        'Business claim verification code generated'
      );

      return reply.code(202).send({
        message: 'Verification email sent. Enter the code to complete your claim.',
        claim_status: 'pending',
      });
    }
  );

  // POST /api/businesses/:id/claim/verify — Complete claim with code
  fastify.post<{ Params: { id: string }; Body: { code: string } }>(
    '/api/businesses/:id/claim/verify',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { code: string } }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const { id } = request.params;
      const { code } = request.body;

      const { rows } = await fastify.pg.query(
        `SELECT * FROM business_claims
         WHERE business_id = $1 AND user_id = $2 AND status = 'pending'
         ORDER BY created_at DESC LIMIT 1`,
        [id, userId]
      );

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'No pending claim found' });
      }

      if (rows[0].verification_code !== code.toUpperCase()) {
        return reply.code(401).send({ error: 'Invalid verification code' });
      }

      // Approve claim
      const client = await fastify.pg.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE business_claims SET status = 'approved', reviewed_at = NOW() WHERE id = $1`,
          [rows[0].id]
        );

        await client.query(
          `UPDATE businesses SET claimed = true, claimed_by = $1, claimed_at = NOW(), updated_at = NOW() WHERE id = $2`,
          [userId, id]
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      return reply.send({ success: true, message: 'Business claimed successfully' });
    }
  );

  // PUT /api/businesses/:id — Update business (claimed owner only)
  fastify.put<{ Params: { id: string }; Body: UpdateBusinessBody }>(
    '/api/businesses/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateBusinessBody }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const { id } = request.params;

      // Verify ownership
      const { rows } = await fastify.pg.query(
        `SELECT claimed_by FROM businesses WHERE id = $1 AND claimed = true`,
        [id]
      );

      if (rows.length === 0 || rows[0].claimed_by !== userId) {
        return reply.code(403).send({ error: 'Not authorized to edit this business' });
      }

      const { hours, policies, phone, website } = request.body;

      await fastify.pg.query(
        `UPDATE businesses SET
           hours = COALESCE($1, hours),
           policies = COALESCE($2, policies),
           phone = COALESCE($3, phone),
           website = COALESCE($4, website),
           updated_at = NOW()
         WHERE id = $5`,
        [hours ? JSON.stringify(hours) : null, policies ? JSON.stringify(policies) : null, phone ?? null, website ?? null, id]
      );

      return reply.send({ success: true });
    }
  );

  // GET /api/businesses/:id/analytics — Foot traffic for claimed businesses
  fastify.get<{ Params: { id: string } }>(
    '/api/businesses/:id/analytics',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = request.user.id;
      const { id } = request.params;

      // Verify ownership
      const { rows: biz } = await fastify.pg.query(
        `SELECT claimed_by FROM businesses WHERE id = $1 AND claimed = true`,
        [id]
      );

      if (biz.length === 0 || biz[0].claimed_by !== userId) {
        return reply.code(403).send({ error: 'Not authorized' });
      }

      // Get bathroom IDs for this business
      const { rows: bathrooms } = await fastify.pg.query(
        `SELECT id FROM bathrooms WHERE business_id = $1`,
        [id]
      );

      const bathroomIds = bathrooms.map(b => b.id);

      if (bathroomIds.length === 0) {
        return reply.send({ views_7d: 0, views_30d: 0, hourly_breakdown: {} });
      }

      // Aggregate analytics from events
      const { rows: analytics } = await fastify.pg.query(
        `SELECT
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as views_7d,
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as views_30d,
           EXTRACT(HOUR FROM created_at) as hour,
           COUNT(*) as count
         FROM events
         WHERE bathroom_id = ANY($1)
           AND event_type = 'bathroom_viewed'
           AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY EXTRACT(HOUR FROM created_at)
         ORDER BY hour`,
        [bathroomIds]
      );

      const hourlyBreakdown: Record<number, number> = {};
      let views7d = 0;
      let views30d = 0;

      for (const row of analytics) {
        hourlyBreakdown[row.hour] = parseInt(row.count);
        views7d = parseInt(row.views_7d);
        views30d = parseInt(row.views_30d);
      }

      return reply.send({
        views_7d: views7d,
        views_30d: views30d,
        hourly_breakdown: hourlyBreakdown,
        bathroom_count: bathroomIds.length,
      });
    }
  );
}
```

---

# ═══════════════════════════════════════════════════════
# SECTION 7: NFC SCHEMA PREPARATION
# ═══════════════════════════════════════════════════════

## Context
Zero application code. Schema-only signaling for future hardware integration.

## File to Create
`backend/src/migrations/005_nfc_schema.sql`

```sql
-- ============================================================
-- Migration: 005_nfc_schema.sql
-- Purpose: Hardware partnership schema (design-only, no app code)
-- ============================================================

CREATE TABLE IF NOT EXISTS hardware_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name TEXT NOT NULL,
    api_endpoint TEXT DEFAULT 'TBD',
    integration_status integration_status_enum NOT NULL DEFAULT 'planned',
    contact_email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK on bathrooms for partner_lock_vendor_id
DO $$ BEGIN
    ALTER TABLE bathrooms
        ADD CONSTRAINT fk_bathrooms_hardware_partner
        FOREIGN KEY (partner_lock_vendor_id) REFERENCES hardware_partners(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Seed with placeholder
INSERT INTO hardware_partners (vendor_name, api_endpoint, integration_status, notes)
VALUES ('Reserved - Future NFC Partner', 'TBD', 'planned', 'Schema prepared for future smart lock integration. No hardware deployed yet.')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE hardware_partners IS 'Future-proofing: hardware vendor partnerships for NFC/smart-lock integration. Schema only — no application code.';
```

**That's it.** 10 minutes of work. Massive narrative payoff.

---

# ═══════════════════════════════════════════════════════
# SECTION 8: COLD START GEO-SEEDING
# ═══════════════════════════════════════════════════════

## Context
Pre-populate bathrooms from OpenStreetMap so no city ever shows zero results. Fully independent — can run immediately.

## File to Create
`backend/scripts/seed-osm-bathrooms.ts`

```typescript
/**
 * seed-osm-bathrooms.ts
 *
 * Pulls public restroom data from OpenStreetMap Overpass API
 * and inserts into the bathrooms table.
 *
 * Run: npx tsx backend/scripts/seed-osm-bathrooms.ts
 *
 * Requirements:
 *   - DATABASE_URL environment variable set
 *   - PostGIS extension enabled
 *   - Section 1 migration applied
 */

import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

// Top 50 US metro areas (rough bounding boxes)
// Format: [south, west, north, east]
const METRO_AREAS: Record<string, [number, number, number, number]> = {
  'Seattle':        [47.45, -122.45, 47.75, -122.20],
  'Portland':       [45.40, -122.80, 45.60, -122.50],
  'San Francisco':  [37.70, -122.52, 37.82, -122.35],
  'Los Angeles':    [33.70, -118.70, 34.30, -118.10],
  'San Diego':      [32.60, -117.30, 33.00, -117.00],
  'Phoenix':        [33.30, -112.20, 33.65, -111.85],
  'Denver':         [39.60, -105.10, 39.85, -104.85],
  'Austin':         [30.15, -97.90, 30.50, -97.60],
  'Dallas':         [32.60, -97.00, 33.00, -96.60],
  'Houston':        [29.55, -95.60, 29.95, -95.20],
  'Chicago':        [41.65, -87.85, 42.00, -87.55],
  'Detroit':        [42.25, -83.30, 42.45, -82.90],
  'Minneapolis':    [44.85, -93.40, 45.05, -93.15],
  'New York':       [40.55, -74.05, 40.90, -73.70],
  'Boston':         [42.25, -71.20, 42.40, -70.95],
  'Philadelphia':   [39.85, -75.30, 40.10, -75.05],
  'Washington DC':  [38.80, -77.15, 39.00, -76.90],
  'Miami':          [25.65, -80.35, 25.90, -80.10],
  'Atlanta':        [33.60, -84.55, 33.90, -84.25],
  'Nashville':      [36.05, -86.90, 36.25, -86.65],
};

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function queryOverpass(bbox: [number, number, number, number]): Promise<OverpassElement[]> {
  const [south, west, north, east] = bbox;
  const query = `
    [out:json][timeout:30];
    (
      node["amenity"="toilets"](${south},${west},${north},${east});
      way["amenity"="toilets"](${south},${west},${north},${east});
    );
    out center;
  `;

  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  return data.elements ?? [];
}

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const [metro, bbox] of Object.entries(METRO_AREAS)) {
    console.log(`Seeding ${metro}...`);

    try {
      const elements = await queryOverpass(bbox);
      console.log(`  Found ${elements.length} OSM restrooms`);

      for (const el of elements) {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (!lat || !lon) continue;

        const name = el.tags?.name ?? el.tags?.description ?? `Public Restroom (OSM)`;
        const fee = el.tags?.fee === 'yes';
        const accessType = fee ? 'purchase_required' : 'public';
        const wheelchair = el.tags?.wheelchair === 'yes';

        try {
          await pool.query(
            `INSERT INTO bathrooms (
               name, geo_point, access_type, source, created_at, updated_at
             ) VALUES (
               $1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
               $4, 'osm', NOW(), NOW()
             )
             ON CONFLICT DO NOTHING`,
            [name, lon, lat, accessType]
          );
          totalInserted++;
        } catch (err) {
          totalSkipped++;
        }
      }

      // Rate limit: Overpass API requests 1 req/sec
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`  Error seeding ${metro}:`, err);
    }
  }

  console.log(`\nDone. Inserted: ${totalInserted}, Skipped: ${totalSkipped}`);
  await pool.end();
}

main().catch(console.error);
```

**NOTE:** You'll need to add a deduplication mechanism. The simplest approach: add a unique constraint on a rounded geo hash:

```sql
-- Add to Section 1 migration or run separately:
ALTER TABLE bathrooms ADD COLUMN IF NOT EXISTS geo_hash TEXT
  GENERATED ALWAYS AS (
    ROUND(ST_X(geo_point::geometry)::numeric, 5)::text || ',' ||
    ROUND(ST_Y(geo_point::geometry)::numeric, 5)::text
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bathrooms_geo_dedup
  ON bathrooms(geo_hash, name) WHERE source = 'osm';
```

---

# ═══════════════════════════════════════════════════════
# SECTION 9: COPYCAT SUFFOCATION — Trust-Tiered UX
# ═══════════════════════════════════════════════════════

## Context
Differentiated UX based on trust score. Power users get instant access. New users earn their way in. Clones can't replicate this because they have no trust data.

## Files to Create
1. `frontend/src/hooks/useTrustTier.ts`

## Hook: `frontend/src/hooks/useTrustTier.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './useApiClient';

export type TrustTier = 'power' | 'normal' | 'newcomer';

interface TrustData {
  trust_score: number;
  total_contributions: number;
  level: string;
}

interface TrustTierConfig {
  tier: TrustTier;
  codeRevealDelayMs: number;
  showVerificationPrompts: boolean;
  canSubmitCodes: boolean;
  showTrustedBadge: boolean;
  verificationPromptsFrequency: 'never' | 'occasional' | 'frequent';
}

const TIER_CONFIGS: Record<TrustTier, Omit<TrustTierConfig, 'tier'>> = {
  power: {
    codeRevealDelayMs: 0,
    showVerificationPrompts: false,
    canSubmitCodes: true,
    showTrustedBadge: true,
    verificationPromptsFrequency: 'never',
  },
  normal: {
    codeRevealDelayMs: 0,
    showVerificationPrompts: true,
    canSubmitCodes: true,
    showTrustedBadge: false,
    verificationPromptsFrequency: 'occasional', // ~1 in 3 views
  },
  newcomer: {
    codeRevealDelayMs: 500, // Subtle artificial delay
    showVerificationPrompts: true,
    canSubmitCodes: false, // Must confirm 3 codes first
    showTrustedBadge: false,
    verificationPromptsFrequency: 'frequent', // Every view
  },
};

export function useTrustTier(): TrustTierConfig & { isLoading: boolean } {
  const api = useApiClient();

  const { data, isLoading } = useQuery<TrustData>({
    queryKey: ['userTrust'],
    queryFn: () => api.get('/api/users/me/trust'),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const score = data?.trust_score ?? 0.5;
  const contributions = data?.total_contributions ?? 0;

  let tier: TrustTier;
  if (score >= 0.7 && contributions >= 5) {
    tier = 'power';
  } else if (score >= 0.3 || contributions >= 1) {
    tier = 'normal';
  } else {
    tier = 'newcomer';
  }

  return {
    tier,
    isLoading,
    ...TIER_CONFIGS[tier],
  };
}
```

## Usage in Code Reveal Component

```tsx
// In your BathroomDetailScreen or CodeReveal component:
import { useTrustTier } from '../hooks/useTrustTier';

function CodeReveal({ bathroom }: { bathroom: Bathroom }) {
  const { codeRevealDelayMs, showVerificationPrompts, canSubmitCodes, showTrustedBadge } = useTrustTier();
  const [revealed, setRevealed] = useState(false);
  const [delaying, setDelaying] = useState(false);

  const handleReveal = useCallback(() => {
    if (codeRevealDelayMs > 0) {
      setDelaying(true);
      setTimeout(() => {
        setRevealed(true);
        setDelaying(false);
      }, codeRevealDelayMs);
    } else {
      setRevealed(true);
    }
  }, [codeRevealDelayMs]);

  // ... render code with trust-tier-aware behavior
}
```

---

# ═══════════════════════════════════════════════════════
# SECTION 10: URGENCY DAU TRACKING
# ═══════════════════════════════════════════════════════

## Context
Track how many users depend on StallPass in moments of genuine physical urgency. This is the north star metric.

## Files to Create
1. `frontend/src/hooks/useUrgencyDetection.ts`
2. Backend query (no new endpoint needed — uses events table)

## Frontend Hook: `frontend/src/hooks/useUrgencyDetection.ts`

```typescript
import { useEffect, useRef } from 'react';
import { useEventEmitter } from './useEventEmitter';

/**
 * Detects "urgency sessions" — when a user opens the app,
 * searches for a bathroom, and views a result within 60 seconds.
 *
 * Place this hook in your root navigator or main app shell.
 */
export function useUrgencyDetection() {
  const { emit } = useEventEmitter();
  const sessionStartRef = useRef<number | null>(null);
  const searchedRef = useRef(false);
  const triggeredRef = useRef(false);

  // Call when app opens or returns to foreground
  const onAppOpen = () => {
    sessionStartRef.current = Date.now();
    searchedRef.current = false;
    triggeredRef.current = false;
  };

  // Call when user performs a search
  const onSearch = () => {
    searchedRef.current = true;
    checkUrgency();
  };

  // Call when user views a bathroom detail
  const onBathroomViewed = (bathroomId: string) => {
    checkUrgency(bathroomId);
  };

  const checkUrgency = (bathroomId?: string) => {
    if (triggeredRef.current) return;
    if (!sessionStartRef.current) return;
    if (!searchedRef.current) return;

    const elapsed = Date.now() - sessionStartRef.current;
    if (elapsed <= 60_000) { // Within 60 seconds of app open
      triggeredRef.current = true;
      emit('urgency_session', {
        bathroom_id: bathroomId,
        payload: { elapsed_ms: elapsed },
      });
    }
  };

  return { onAppOpen, onSearch, onBathroomViewed };
}
```

## Analytics Query (run ad hoc or in a dashboard)

```sql
-- Urgency DAU: distinct users with urgency sessions today
SELECT COUNT(DISTINCT user_id) as urgency_dau
FROM events
WHERE event_type = 'urgency_session'
  AND created_at >= CURRENT_DATE;

-- Urgency DAU trend (last 30 days)
SELECT
    DATE(created_at) as day,
    COUNT(DISTINCT user_id) as urgency_dau
FROM events
WHERE event_type = 'urgency_session'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day;
```

---

# ═══════════════════════════════════════════════════════
# SECTION 11: POINTS-TRUST UNIFICATION
# ═══════════════════════════════════════════════════════

## Context
Wire the existing points economy into the trust graph so quality is rewarded, not just volume.

## Implementation Notes

This depends on your existing points system. The integration points are:

### On Code Confirmation Consensus

When a code reaches high confidence (e.g., 3+ confirms from different users):

```typescript
// In trustEngine.ts or a separate consensus checker:
async function checkCodeConsensus(bathroomId: string): Promise<void> {
  const { rows } = await fastify.pg.query(
    `SELECT user_id, action FROM code_verifications
     WHERE bathroom_id = $1
       AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC
     LIMIT 10`,
    [bathroomId]
  );

  const confirms = rows.filter(r => r.action === 'confirm');
  const denies = rows.filter(r => r.action === 'deny');

  // If 3+ independent confirms with no denies → code is consensus-true
  if (confirms.length >= 3 && denies.length === 0) {
    // Reward all confirming users
    for (const confirm of confirms) {
      await fastify.pg.query(
        `UPDATE user_trust
         SET accurate_contributions = accurate_contributions + 1,
             updated_at = NOW()
         WHERE user_id = $1`,
        [confirm.user_id]
      );
      // Award bonus points via your existing points system
      // e.g., await awardPoints(confirm.user_id, 10, 'accurate_verification');
    }
  }

  // If 3+ denies → code is consensus-false
  if (denies.length >= 3 && confirms.length === 0) {
    // Penalize the original submitter
    const { rows: original } = await fastify.pg.query(
      `SELECT user_id FROM code_verifications
       WHERE bathroom_id = $1 AND action = 'update'
       ORDER BY created_at DESC LIMIT 1`,
      [bathroomId]
    );

    if (original.length > 0) {
      await fastify.pg.query(
        `UPDATE user_trust
         SET flagged_count = flagged_count + 1,
             updated_at = NOW()
         WHERE user_id = $1`,
        [original[0].user_id]
      );
      // Deduct points via your existing system
      // e.g., await deductPoints(original[0].user_id, 20, 'false_code_submission');
    }

    // Reward the deniers
    for (const deny of denies) {
      await fastify.pg.query(
        `UPDATE user_trust
         SET accurate_contributions = accurate_contributions + 1,
             updated_at = NOW()
         WHERE user_id = $1`,
        [deny.user_id]
      );
    }
  }
}
```

### Points Multiplier Based on Trust

```typescript
// When awarding points for any action, multiply by trust:
function calculatePoints(basePoints: number, trustScore: number): number {
  // Trust multiplier: 0.5x at score 0 → 2.0x at score 1.0
  const multiplier = 0.5 + (trustScore * 1.5);
  return Math.round(basePoints * multiplier);
}

// Example: A trusted user (0.9 score) submitting a code gets:
// calculatePoints(10, 0.9) = 10 * (0.5 + 1.35) = 10 * 1.85 = 19 points
// A newcomer (0.3 score) gets:
// calculatePoints(10, 0.3) = 10 * (0.5 + 0.45) = 10 * 0.95 = 10 points
```

---

# ═══════════════════════════════════════════════════════
# ROUTE REGISTRATION CHECKLIST
# ═══════════════════════════════════════════════════════

In your Fastify server entry (e.g., `backend/src/server.ts` or wherever routes are registered):

```typescript
// Plugins (register before routes)
import trustEnginePlugin from './plugins/trustEngine';
import antiSybilPlugin from './plugins/antiSybil';

await app.register(trustEnginePlugin);
await app.register(antiSybilPlugin);

// Routes
import trustRoutes from './routes/trust';
import eventRoutes from './routes/events';
import predictionRoutes from './routes/predictions';
import businessRoutes from './routes/businesses';

app.register(trustRoutes);
app.register(eventRoutes);
app.register(predictionRoutes);
app.register(businessRoutes);
```

---

# ═══════════════════════════════════════════════════════
# MIGRATION EXECUTION ORDER
# ═══════════════════════════════════════════════════════

```bash
# Run in this exact order:
psql -U $DB_USER -d $DB_NAME -f backend/src/migrations/001_schema_extensions.sql
psql -U $DB_USER -d $DB_NAME -f backend/src/migrations/002_trust_graph.sql
psql -U $DB_USER -d $DB_NAME -f backend/src/migrations/003_events_pipeline.sql
psql -U $DB_USER -d $DB_NAME -f backend/src/migrations/004_business_capture.sql
psql -U $DB_USER -d $DB_NAME -f backend/src/migrations/005_nfc_schema.sql
```

---

# ═══════════════════════════════════════════════════════
# NPM DEPENDENCIES TO ADD
# ═══════════════════════════════════════════════════════

## Backend
```bash
cd backend
npm install fastify-cron
# pg, @fastify/postgres, fastify-plugin should already be installed
```

## Frontend
```bash
cd frontend
npx expo install expo-device expo-application expo-secure-store expo-crypto
# @tanstack/react-query, zustand should already be installed
```

---

# END OF IMPLEMENTATION GUIDE
