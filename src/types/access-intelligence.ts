/**
 * Typed surface for the StallPass Access Intelligence RPCs and Edge Functions.
 *
 * These types intentionally live in their own module so they stay stable even
 * between runs of `supabase gen types typescript` — the generated `Database`
 * type is augmented, not replaced, by the declarations below.
 */

export const ACCESS_INTELLIGENCE_EVENT_TYPES = [
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
] as const;

export type AccessIntelligenceEventType = (typeof ACCESS_INTELLIGENCE_EVENT_TYPES)[number];

export type CodeVerificationAction = 'confirm' | 'deny' | 'update';

export type AccessType = 'public' | 'code' | 'purchase_required' | 'key' | 'nfc_future';

export interface AccessIntelligenceEventInput {
  eventType: AccessIntelligenceEventType;
  bathroomId?: string | null;
  payload?: Record<string, unknown> | null;
  latitude?: number | null;
  longitude?: number | null;
  sessionId?: string | null;
  deviceFingerprint?: string | null;
}

export interface VerifyAccessCodeInput {
  bathroomId: string;
  action: CodeVerificationAction;
  reportedCode?: string | null;
  deviceFingerprint?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface VerifyAccessCodeResult {
  status: 'accepted' | 'rejected';
  action?: CodeVerificationAction;
  code_id?: string;
  verification_id?: string;
  trust_weight?: number;
  reason?: string;
  shadow_banned?: boolean;
}

export type TrustUxBucket = 'power' | 'normal' | 'newcomer';

export type ServerTrustTier =
  | 'brand_new'
  | 'lightly_trusted'
  | 'verified_contributor'
  | 'highly_reliable_local'
  | 'business_verified_manager'
  | 'flagged_low_trust';

export interface UserTrustTier {
  user_id: string;
  tier: ServerTrustTier;
  bucket: TrustUxBucket;
  trust_weight: number;
  trust_score: number;
  shadow_banned: boolean;
  codeRevealDelayMs: number;
  showVerificationPrompts: boolean;
  canSubmitCodes: boolean;
  showTrustedBadge: boolean;
  verificationPromptsFrequency: 'always' | 'frequent' | 'occasional';
}

export type PredictionBusyLevel = 'low' | 'medium' | 'high';

export interface BathroomPrediction {
  bathroom_id: string;
  likely_accessible: boolean;
  confidence: number;
  busy_level: PredictionBusyLevel;
  best_time: string | null;
  model_version: 'heuristic-v1';
}

export interface BusinessAnalyticsResult {
  business_id: string;
  bathroom_count: number;
  views_30d: number;
  events_7d: number;
  confirm_count: number;
  deny_count: number;
  code_refresh_rate: number;
  accessible_pct: number;
  model_version: 'analytics-v1';
}

export interface BusinessClaimPendingResult {
  status: 'pending_verification';
  claim_id: string;
  business_id: string;
  email_domain: string;
  email_delivered: boolean;
  email_provider: 'sendgrid' | 'log';
  verification_expires_at: string;
}

export interface BusinessClaimApprovedResult {
  status: 'approved';
  business_id: string;
  claim_id: string;
}

export interface BatchEventEnvelope {
  events: Array<{
    event_type: AccessIntelligenceEventType;
    bathroom_id?: string | null;
    payload?: Record<string, unknown>;
    latitude?: number | null;
    longitude?: number | null;
    session_id?: string | null;
    device_fingerprint?: string | null;
  }>;
}
