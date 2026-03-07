import { Database } from './database';

// ============================================================================
// SESSION & AUTH TYPES
// ============================================================================

export type SessionStatus =
  | 'BOOTSTRAPPING'
  | 'GUEST'
  | 'AUTHENTICATED_USER'
  | 'AUTHENTICATED_BUSINESS'
  | 'AUTHENTICATED_ADMIN'
  | 'SESSION_RECOVERY'
  | 'SESSION_INVALID';

export type UserRole = 'user' | 'business' | 'admin';

export interface SessionState {
  status: SessionStatus;
  session: {
    user_id: string;
    email: string;
  } | null;
  profile: {
    role: UserRole;
    display_name: string | null;
    points_balance: number;
    is_premium: boolean;
  } | null;
}

// ============================================================================
// RETURN-TO-INTENT TYPES
// ============================================================================

export type IntentType =
  | 'favorite_toggle'
  | 'submit_code'
  | 'vote_code'
  | 'report_bathroom'
  | 'add_bathroom'
  | 'claim_business'
  | 'rate_cleanliness';

export type ReplayStrategy = 'immediate_after_auth' | 'user_confirm' | 'draft_resume';

export interface ReturnIntent {
  intent_id: string;
  type: IntentType;
  route: string;
  params: Record<string, unknown>;
  created_at: string;
  replay_strategy: ReplayStrategy;
}

// ============================================================================
// OFFLINE QUEUE TYPES
// ============================================================================

export type MutationType =
  | 'favorite_add'
  | 'favorite_remove'
  | 'code_vote'
  | 'report_create'
  | 'rating_create';

export interface QueuedMutation {
  id: string;
  type: MutationType;
  payload: unknown;
  created_at: string;
  retry_count: number;
  last_attempt_at: string | null;
  user_id: string;
}

// ============================================================================
// DRAFT TYPES
// ============================================================================

export type DraftType = 'add_bathroom' | 'claim_business';

export interface Draft<T = unknown> {
  id: string;
  type: DraftType;
  data: T;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface AddBathroomDraft {
  place_name: string;
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_locked?: boolean;
  is_accessible?: boolean;
  is_customer_only?: boolean;
  initial_code?: string;
}

export interface ClaimBusinessDraft {
  bathroom_id: string;
  business_name: string;
  contact_email: string;
  contact_phone?: string;
  evidence_url?: string;
}

// ============================================================================
// BATHROOM TYPES
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BathroomFlags {
  is_locked: boolean | null;
  is_accessible: boolean | null;
  is_customer_only: boolean;
}

export interface CodeSummary {
  has_code: boolean;
  confidence_score: number | null;
  last_verified_at: string | null;
}

export interface SyncMetadata {
  cached_at: string;
  stale: boolean;
}

export interface BathroomListItem {
  id: string;
  place_name: string;
  address: string;
  coordinates: Coordinates;
  flags: BathroomFlags;
  distance_meters?: number;
  primary_code_summary: CodeSummary;
  sync: SyncMetadata;
}

export interface Address {
  line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string;
}

export interface HoursData {
  [day: string]: Array<{ open: string; close: string }>;
}

export interface PrimaryCode {
  id: string | null;
  visibility: 'shown' | 'hidden' | 'premium_gated';
  code_value: string | null;
  confidence_score: number | null;
  up_votes: number;
  down_votes: number;
  last_verified_at: string | null;
  expires_at: string | null;
}

export interface CommunityMetrics {
  cleanliness_avg: number | null;
  open_report_count: number;
}

export interface ViewerState {
  is_favorited: boolean;
  can_vote: boolean;
  can_submit_code: boolean;
  can_report: boolean;
  user_vote?: -1 | 1 | null;
}

export interface BathroomDetail {
  id: string;
  place_name: string;
  address: Address;
  coordinates: Coordinates;
  flags: BathroomFlags;
  hours: HoursData | null;
  primary_code: PrimaryCode;
  community: CommunityMetrics;
  viewer_state: ViewerState;
  sync: SyncMetadata;
}

// ============================================================================
// FAVORITES TYPES
// ============================================================================

export interface FavoriteItem {
  bathroom_id: string;
  place_name: string;
  address: string;
  distance_meters?: number;
  primary_code_summary: CodeSummary;
}

export interface FavoritesList {
  user_id: string;
  items: FavoriteItem[];
  sync: SyncMetadata;
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export type ReportType =
  | 'wrong_code'
  | 'closed'
  | 'unsafe'
  | 'duplicate'
  | 'incorrect_hours'
  | 'no_restroom'
  | 'other';

export interface ReportCreate {
  bathroom_id: string;
  report_type: ReportType;
  notes?: string;
}

export interface Report {
  id: string;
  bathroom_id: string;
  reported_by: string;
  report_type: ReportType;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  notes: string | null;
  created_at: string;
}

// ============================================================================
// CODE SUBMISSION TYPES
// ============================================================================

export interface CodeSubmit {
  bathroom_id: string;
  code_value: string;
}

export interface CodeVote {
  code_id: string;
  vote: -1 | 1;
}

// ============================================================================
// PROFILE TYPES
// ============================================================================

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  points_balance: number;
  is_premium: boolean;
  is_suspended: boolean;
  created_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  cached_at: string;
  expires_at: string;
}

export interface RegionBounds {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// ============================================================================
// DATABASE TYPE EXPORTS
// ============================================================================

export type { Database };
export type DbProfile = Database['public']['Tables']['profiles']['Row'];
export type DbBathroom = Database['public']['Tables']['bathrooms']['Row'];
export type DbCode = Database['public']['Tables']['bathroom_access_codes']['Row'];
export type DbFavorite = Database['public']['Tables']['favorites']['Row'];
export type DbReport = Database['public']['Tables']['bathroom_reports']['Row'];
export type DbClaim = Database['public']['Tables']['business_claims']['Row'];
