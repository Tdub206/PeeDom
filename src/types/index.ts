import type { Database } from './database';

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

export type MutationOutcome = 'completed' | 'auth_required' | 'queued_retry';

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
    premium_expires_at?: string | null;
  } | null;
}

// ============================================================================
// RETURN-TO-INTENT TYPES
// ============================================================================

export type IntentType =
  | 'favorite_toggle'
  | 'submit_code'
  | 'reveal_code'
  | 'vote_code'
  | 'report_bathroom'
  | 'report_live_status'
  | 'add_bathroom'
  | 'upload_bathroom_photo'
  | 'update_accessibility'
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

export interface RequireAuthOptions {
  type: IntentType;
  route: string;
  params: Record<string, unknown>;
  replay_strategy?: ReplayStrategy;
}

// ============================================================================
// OFFLINE QUEUE TYPES
// ============================================================================

export type MutationType =
  | 'favorite_add'
  | 'favorite_remove'
  | 'code_submit'
  | 'code_vote'
  | 'report_create'
  | 'rating_create'
  | 'status_report'
  | 'accessibility_update'
  | 'bug_report';

export interface FavoriteMutationPayload {
  bathroom_id: string;
  intended_action?: FavoriteToggleAction;
  initiated_at?: string;
}

export interface CodeVoteMutationPayload {
  code_id: string;
  vote: -1 | 1;
}

export interface CodeSubmitMutationPayload {
  bathroom_id: string;
  code_value: string;
}

export interface CleanlinessRatingMutationPayload {
  bathroom_id: string;
  rating: number;
  notes?: string | null;
}

export interface BathroomStatusMutationPayload {
  bathroom_id: string;
  status: BathroomLiveStatus;
  note?: string | null;
}

export interface BathroomAccessibilityMutationPayload extends BathroomAccessibilityUpdateInput {}

export interface BugReportMutationPayload {
  schema_version: number;
  idempotency_key: string;
  screen_name: string;
  error_message: string;
  error_stack: string;
  component_stack: string;
  user_comment: string;
  app_version: string;
  os_name: string;
  os_version: string;
  device_model: string;
  captured_at: string;
  sentry_event_id: string | null;
}

export interface QueuedMutation {
  id: string;
  type: MutationType;
  payload: Record<string, unknown>;
  created_at: string;
  retry_count: number;
  last_attempt_at: string | null;
  user_id: string;
}

export interface QueueProcessResult {
  processed_count: number;
  dropped_count: number;
  pending_count: number;
}

// ============================================================================
// DRAFT TYPES
// ============================================================================

export type DraftType =
  | 'add_bathroom'
  | 'claim_business'
  | 'submit_code'
  | 'rate_cleanliness'
  | 'report_live_status'
  | 'update_accessibility';

export interface Draft<T = Record<string, unknown>> {
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
  photo_uri?: string;
  photo_file_name?: string;
  photo_mime_type?: string;
  photo_file_size?: number;
  photo_width?: number;
  photo_height?: number;
}

export interface ClaimBusinessDraft {
  bathroom_id: string;
  business_name: string;
  contact_email: string;
  contact_phone?: string;
  evidence_url?: string;
  growth_invite_code?: string;
}

export interface SubmitCodeDraft {
  bathroom_id: string;
  code_value: string;
}

export interface CleanlinessRatingDraft {
  bathroom_id: string;
  rating: number;
  notes?: string;
}

export interface LiveStatusDraft {
  bathroom_id: string;
  status: BathroomLiveStatus;
  note?: string;
}

export interface AccessibilityUpdateDraft extends BathroomAccessibilityUpdateInput {}

// ============================================================================
// BATHROOM TYPES
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GooglePlaceViewportPoint {
  latitude: number;
  longitude: number;
}

export interface GooglePlaceViewport {
  low: GooglePlaceViewportPoint;
  high: GooglePlaceViewportPoint;
}

export interface GooglePlaceAutocompleteSuggestion {
  place_id: string;
  text: string;
  primary_text: string;
  secondary_text: string | null;
  distance_meters: number | null;
}

export interface GooglePlaceAddressComponents {
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string | null;
}

export interface GooglePlaceAutocompleteInput {
  query: string;
  session_token: string;
  origin?: Coordinates | null;
}

export interface GooglePlaceAddressResolutionInput {
  place_id: string;
  session_token: string;
}

export interface GooglePlaceAddressResolutionResult {
  place_id: string;
  formatted_address: string | null;
  location: Coordinates;
  viewport: GooglePlaceViewport | null;
  address_components: GooglePlaceAddressComponents;
}

export type MapSearchTargetSource = 'google_maps_address' | 'device_geocoder';

export interface MapSearchTarget {
  label: string;
  address: string | null;
  coordinates: Coordinates;
  source: MapSearchTargetSource;
  place_id: string | null;
}

export interface BathroomFilters {
  isAccessible: boolean | null;
  isLocked: boolean | null;
  isCustomerOnly: boolean | null;
  openNow: boolean | null;
  noCodeRequired: boolean | null;
  recentlyVerifiedOnly: boolean | null;
  hasChangingTable: boolean | null;
  isFamilyRestroom: boolean | null;
  requireGrabBars: boolean | null;
  requireAutomaticDoor: boolean | null;
  requireGenderNeutral: boolean | null;
  minDoorWidth: number | null;
  minStallWidth: number | null;
  prioritizeAccessible: boolean | null;
  hideNonAccessible: boolean | null;
  minCleanlinessRating: number | null;
}

export interface AccessibilityFeatures {
  has_grab_bars: boolean;
  door_width_inches: number | null;
  is_automatic_door: boolean;
  has_changing_table: boolean;
  is_family_restroom: boolean;
  is_gender_neutral: boolean;
  has_audio_cue: boolean;
  has_braille_signage: boolean;
  has_wheelchair_ramp: boolean;
  has_elevator_access: boolean;
  stall_width_inches: number | null;
  turning_radius_inches: number | null;
  notes: string | null;
  photo_urls: string[];
  verification_date: string | null;
}

export const DEFAULT_ACCESSIBILITY_FEATURES: AccessibilityFeatures = {
  has_grab_bars: false,
  door_width_inches: null,
  is_automatic_door: false,
  has_changing_table: false,
  is_family_restroom: false,
  is_gender_neutral: false,
  has_audio_cue: false,
  has_braille_signage: false,
  has_wheelchair_ramp: false,
  has_elevator_access: false,
  stall_width_inches: null,
  turning_radius_inches: null,
  notes: null,
  photo_urls: [],
  verification_date: null,
};

export type AccessibilityPreset = 'wheelchair' | 'gender_neutral' | 'family';

export interface AccessibilityPreferenceState {
  requireGrabBars: boolean;
  requireAutomaticDoor: boolean;
  requireGenderNeutral: boolean;
  requireFamilyRestroom: boolean;
  requireChangingTable: boolean;
  minDoorWidth: number | null;
  minStallWidth: number | null;
  prioritizeAccessible: boolean;
  hideNonAccessible: boolean;
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferenceState = {
  requireGrabBars: false,
  requireAutomaticDoor: false,
  requireGenderNeutral: false,
  requireFamilyRestroom: false,
  requireChangingTable: false,
  minDoorWidth: null,
  minStallWidth: null,
  prioritizeAccessible: false,
  hideNonAccessible: false,
};

export interface UserAccessibilityPreferences {
  id: string;
  user_id: string;
  accessibility_mode_enabled: boolean;
  require_grab_bars: boolean;
  require_automatic_door: boolean;
  require_gender_neutral: boolean;
  require_family_restroom: boolean;
  require_changing_table: boolean;
  min_door_width_inches: number | null;
  min_stall_width_inches: number | null;
  prioritize_accessible: boolean;
  hide_non_accessible: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateAccessibilityPreferencesInput {
  accessibility_mode_enabled?: boolean;
  require_grab_bars?: boolean;
  require_automatic_door?: boolean;
  require_gender_neutral?: boolean;
  require_family_restroom?: boolean;
  require_changing_table?: boolean;
  min_door_width_inches?: number | null;
  min_stall_width_inches?: number | null;
  prioritize_accessible?: boolean;
  hide_non_accessible?: boolean;
}

export interface BathroomAccessibilityUpdateInput extends Partial<AccessibilityFeatures> {
  bathroom_id: string;
}

export interface BathroomAccessibilityUpdateResult {
  bathroom_id: string;
  accessibility_features: AccessibilityFeatures;
  is_accessible: boolean;
  accessibility_score: number;
  updated_at: string;
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

export type BathroomConfidenceTone = 'high' | 'medium' | 'low';
export type BathroomConfidenceFlagTone = 'positive' | 'warning' | 'critical' | 'neutral';
export type BathroomFreshnessState = 'fresh' | 'aging' | 'stale' | 'unknown';
export type BathroomConflictState = 'stable' | 'conflicting' | 'outdated' | 'unknown';

export interface BathroomConfidenceFlag {
  label: string;
  tone: BathroomConfidenceFlagTone;
}

export interface BathroomConfidenceProfile {
  trust_score: number;
  tone: BathroomConfidenceTone;
  tone_label: string;
  code_reliability_score: number | null;
  code_reliability_label: string;
  open_state_label: string;
  info_freshness_days: number | null;
  info_freshness_label: string;
  freshness_state: BathroomFreshnessState;
  conflict_state: BathroomConflictState;
  conflict_label: string | null;
  photo_evidence_label: string | null;
  flags: BathroomConfidenceFlag[];
}

export type BathroomRecommendationScenario =
  | 'best_overall'
  | 'closest_guaranteed'
  | 'accessible'
  | 'no_code';

export interface BathroomRecommendation {
  scenario: BathroomRecommendationScenario;
  title: string;
  bathroom: BathroomListItem | null;
  rationale: string;
  score: number | null;
}

export type BathroomLocationArchetype =
  | 'general'
  | 'park'
  | 'store'
  | 'restaurant'
  | 'transit'
  | 'event_portable'
  | 'medical'
  | 'campus'
  | 'library'
  | 'mall'
  | 'airport'
  | 'hotel';

export type BusinessCodePolicy = 'community' | 'owner_shared' | 'owner_private' | 'staff_only';

export interface BathroomListItem {
  id: string;
  place_name: string;
  address: string;
  coordinates: Coordinates;
  flags: BathroomFlags;
  accessibility_features: AccessibilityFeatures;
  accessibility_score: number;
  hours: HoursData | null;
  cleanliness_avg: number | null;
  distance_meters?: number;
  primary_code_summary: CodeSummary;
  verification_badge_type: BusinessVerificationBadgeType | null;
  stallpass_access_tier: StallPassAccessTier;
  show_on_free_map: boolean;
  is_business_location_verified: boolean;
  location_verified_at: string | null;
  active_offer_count: number;
  location_archetype?: BathroomLocationArchetype;
  archetype_metadata?: Record<string, unknown>;
  code_policy?: BusinessCodePolicy;
  allow_user_code_submissions?: boolean;
  has_official_code?: boolean;
  owner_code_last_verified_at?: string | null;
  official_access_instructions?: string | null;
  last_updated_at: string | null;
  sync: SyncMetadata;
}

export interface BathroomQueryResult {
  items: BathroomListItem[];
  source: 'network' | 'cache';
  cached_at: string;
  is_stale: boolean;
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

export interface BathroomPhotoUploadInput {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
}

export type BathroomPhotoType = 'exterior' | 'interior' | 'keypad' | 'sign';
export type BathroomPhotoModerationStatus = 'approved' | 'pending' | 'rejected';
export type CodeRevealGrantSource = 'rewarded_ad';

export interface BathroomPhotoProofCreateInput {
  bathroom_id: string;
  photo: BathroomPhotoUploadInput;
  photo_type: BathroomPhotoType;
}

export interface BathroomCreateInput {
  place_name: string;
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  is_locked: boolean;
  is_accessible: boolean;
  is_customer_only: boolean;
  photo?: BathroomPhotoUploadInput | null;
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
  location_archetype?: BathroomLocationArchetype;
  archetype_metadata?: Record<string, unknown>;
  code_policy?: BusinessCodePolicy;
  allow_user_code_submissions?: boolean;
  has_official_code?: boolean;
  owner_code_last_verified_at?: string | null;
  official_access_instructions?: string | null;
  viewer_state: ViewerState;
  sync: SyncMetadata;
}

export interface BathroomPhoto {
  id: string;
  bathroom_id: string;
  uploaded_by: string;
  storage_bucket: string;
  storage_path: string;
  public_url: string;
  content_type: string;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  is_primary: boolean;
  photo_type: BathroomPhotoType;
  moderation_status: BathroomPhotoModerationStatus;
  created_at: string;
}

// ============================================================================
// FAVORITES TYPES
// ============================================================================

export type FavoriteToggleAction = 'added' | 'removed';
export type FavoritesSortOption = 'date_added' | 'distance' | 'name';

export interface FavoriteItem extends BathroomListItem {
  bathroom_id: string;
  favorited_at: string;
}

export interface FavoritesList {
  user_id: string;
  items: FavoriteItem[];
  sync: SyncMetadata;
}

export interface DisplayNameUpdateResult {
  success: boolean;
  error?: string;
}

export interface DeactivateAccountResult {
  success: boolean;
  user_id?: string;
  deactivated_at?: string;
  error?: string;
}

export interface DeleteAccountResult {
  success: boolean;
  user_id?: string;
  deleted_at?: string;
  error?: string;
  warning?: string | null;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchHistoryItem {
  query: string;
  searched_at: string;
  result_count?: number | null;
}

export interface CityBrowseItem {
  city: string;
  state: string;
  bathroom_count: number;
}

export interface SearchSuggestion {
  bathroom_id: string;
  place_name: string;
  city: string | null;
  state: string | null;
  distance_meters: number | null;
}

export type SearchPhase = 'idle' | 'typing' | 'suggesting' | 'searching' | 'results' | 'empty' | 'error';

export interface SearchDiscoveryFilters {
  hasCode: boolean | null;
  radiusMeters: number;
}

export const DEFAULT_SEARCH_DISCOVERY_FILTERS: SearchDiscoveryFilters = {
  hasCode: null,
  radiusMeters: 8047,
};

// ============================================================================
// LOCATION TYPES
// ============================================================================

export type LocationPermissionState = 'unknown' | 'granted' | 'denied' | 'blocked';

export interface LocationSnapshot {
  coordinates: Coordinates | null;
  permission_status: LocationPermissionState;
  error_message: string | null;
  is_requesting_permission: boolean;
  is_refreshing: boolean;
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
// BUSINESS CLAIM TYPES
// ============================================================================

export type BusinessClaimStatus = Database['public']['Tables']['business_claims']['Row']['review_status'];

export interface BusinessClaimCreate {
  bathroom_id: string;
  business_name: string;
  contact_email: string;
  contact_phone?: string;
  evidence_url?: string;
  growth_invite_code?: string;
}

export interface BusinessClaimBathroomSummary {
  id: string;
  place_name: string;
  address: string;
  is_locked: boolean | null;
  is_accessible: boolean | null;
  is_customer_only: boolean;
}

export type BusinessClaimListItem = Database['public']['Tables']['business_claims']['Row'] & {
  bathroom: BusinessClaimBathroomSummary | null;
};

export interface BusinessClaimStatusCounts {
  pending: number;
  approved: number;
  rejected: number;
}

export type BusinessVerificationBadgeType =
  Database['public']['Tables']['business_verification_badges']['Row']['badge_type'];

export type BusinessFeaturedPlacementType =
  Database['public']['Tables']['business_featured_placements']['Row']['placement_type'];

export type BusinessFeaturedPlacementStatus =
  Database['public']['Tables']['business_featured_placements']['Row']['status'];

export type BusinessHoursUpdateSource =
  | 'business_dashboard'
  | 'admin_panel'
  | 'community_report'
  | 'manual'
  | 'google'
  | 'preset_offset';

export type StallPassAccessTier = 'public' | 'premium';
export type BusinessPricingPlan = 'standard' | 'lifetime';
export type BusinessPromotionType = 'percentage' | 'amount_off' | 'freebie' | 'custom';
export type ContributorTrustTier =
  | 'brand_new'
  | 'lightly_trusted'
  | 'verified_contributor'
  | 'highly_reliable_local'
  | 'business_verified_manager'
  | 'flagged_low_trust';
export type DuplicateCaseStatus = 'open' | 'under_review' | 'merged' | 'dismissed' | 'quarantined';

export interface BusinessFeaturedPlacementScope {
  city?: string;
  state?: string;
  radius_km?: number;
}

export interface BusinessBathroomSettings {
  bathroom_id: string;
  requires_premium_access: boolean;
  show_on_free_map: boolean;
  is_location_verified: boolean;
  location_verified_at: string | null;
  code_policy: BusinessCodePolicy;
  allow_user_code_submissions: boolean;
  owner_supplied_code: string | null;
  owner_code_last_verified_at: string | null;
  owner_code_notes: string | null;
  official_access_instructions: string | null;
  pricing_plan: BusinessPricingPlan;
  pricing_plan_granted_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateBusinessBathroomSettingsInput {
  bathroom_id: string;
  requires_premium_access: boolean;
  show_on_free_map: boolean;
  is_location_verified: boolean;
}

export interface UpdateBusinessBathroomSettingsV2Input extends UpdateBusinessBathroomSettingsInput {
  code_policy: BusinessCodePolicy;
  allow_user_code_submissions: boolean;
  owner_supplied_code?: string | null;
  owner_code_notes?: string | null;
  official_access_instructions?: string | null;
  owner_code_last_verified_at?: string | null;
}

export interface BathroomCodePolicySummary {
  bathroom_id: string;
  code_policy: BusinessCodePolicy;
  allow_user_code_submissions: boolean;
  has_official_code: boolean;
  owner_code_last_verified_at: string | null;
  owner_code_notes: string | null;
  official_access_instructions: string | null;
  can_manager_view_official_code: boolean;
}

export interface BusinessManagedCodeDetails {
  bathroom_id: string;
  code_policy: BusinessCodePolicy;
  owner_supplied_code: string | null;
  owner_code_last_verified_at: string | null;
  owner_code_notes: string | null;
  official_access_instructions: string | null;
  allow_user_code_submissions: boolean;
  updated_at: string;
}

export interface ContributorReputationProfile {
  user_id: string;
  trust_tier: ContributorTrustTier;
  trust_score: number;
  trust_weight: number;
  accepted_contributions: number;
  rejected_contributions: number;
  reports_resolved: number;
  reports_dismissed: number;
  approved_photos: number;
  rejected_photos: number;
  active_codes: number;
  removed_codes: number;
  bathrooms_added: number;
  approved_claims: number;
  moderation_flag_count: number;
  code_success_ratio: number;
  primary_city: string | null;
  primary_state: string | null;
  last_contribution_at: string | null;
  last_calculated_at: string;
}

export interface DuplicateCase {
  id: string;
  bathroom_a_id: string;
  bathroom_a_name: string;
  bathroom_a_address: string;
  bathroom_b_id: string;
  bathroom_b_name: string;
  bathroom_b_address: string;
  status: DuplicateCaseStatus;
  similarity_score: number;
  distance_meters: number | null;
  suggested_merge_target_id: string | null;
  merge_into_bathroom_id: string | null;
  reason: string | null;
  auto_flagged: boolean;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessPromotion {
  id: string;
  bathroom_id: string;
  business_user_id: string;
  title: string;
  description: string;
  offer_type: BusinessPromotionType;
  offer_value: number | null;
  promo_code: string | null;
  redemption_instructions: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  redemptions_count: number;
  created_at: string;
  updated_at: string;
}

export interface UpsertBusinessPromotionInput {
  id?: string | null;
  bathroom_id: string;
  title: string;
  description: string;
  offer_type: BusinessPromotionType;
  offer_value?: number | null;
  promo_code?: string | null;
  redemption_instructions: string;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
}

export interface BusinessDashboardBathroom {
  bathroom_id: string;
  claim_id: string | null;
  place_name: string;
  business_name: string | null;
  total_favorites: number;
  open_reports: number;
  avg_cleanliness: number;
  total_ratings: number;
  weekly_views: number;
  weekly_unique_visitors: number;
  monthly_unique_visitors: number;
  weekly_navigation_count: number;
  verification_badge_type: BusinessVerificationBadgeType | null;
  has_verification_badge: boolean;
  has_active_featured_placement: boolean;
  active_featured_placements: number;
  active_offer_count: number;
  requires_premium_access: boolean;
  show_on_free_map: boolean;
  is_location_verified: boolean;
  location_verified_at: string | null;
  pricing_plan: BusinessPricingPlan;
  last_updated: string;
}

export interface BusinessDashboardSummary {
  total_bathrooms: number;
  total_favorites_across_all: number;
  total_open_reports: number;
  avg_rating_across_all: number;
  active_featured_placements: number;
  verified_locations: number;
  total_weekly_unique_visitors: number;
  total_monthly_unique_visitors: number;
  total_weekly_navigation_count: number;
  active_offers: number;
  premium_only_locations: number;
  lifetime_locations: number;
}

export interface BusinessDashboardData {
  bathrooms: BusinessDashboardBathroom[];
  summary: BusinessDashboardSummary;
}

export interface BusinessVerificationBadge {
  id: string;
  bathroom_id: string;
  claim_id: string;
  verified_at: string;
  verified_by: string | null;
  badge_type: BusinessVerificationBadgeType;
  expires_at: string | null;
  created_at: string;
}

export interface BusinessFeaturedPlacement {
  id: string;
  bathroom_id: string;
  business_user_id: string;
  placement_type: BusinessFeaturedPlacementType;
  geographic_scope: BusinessFeaturedPlacementScope;
  start_date: string;
  end_date: string;
  impressions_count: number;
  clicks_count: number;
  status: BusinessFeaturedPlacementStatus;
  created_at: string;
  updated_at: string;
}

export interface BusinessHoursUpdateAudit {
  id: string;
  bathroom_id: string;
  updated_by: string;
  old_hours: HoursData | null;
  new_hours: HoursData;
  update_source: BusinessHoursUpdateSource;
  created_at: string;
}

export type HoursSourceType = 'manual' | 'google' | 'preset_offset';

export interface BusinessBathroomHoursConfig {
  bathroom_id: string;
  place_name: string;
  hours: HoursData | null;
  hours_source: HoursSourceType;
  hours_offset_minutes: number | null;
  google_place_id: string | null;
  updated_at: string;
}

export interface UpdateBusinessHoursInput {
  bathroom_id: string;
  hours: HoursData;
  hours_source?: HoursSourceType;
  offset_minutes?: number | null;
  google_place_id?: string | null;
}

export interface BusinessHoursUpdateResult {
  success: boolean;
  bathroom_id: string;
  hours_source: HoursSourceType;
  updated_at: string;
}

export type UpdateBusinessHoursV2Input = UpdateBusinessHoursInput;

export interface SyncBusinessBathroomGoogleHoursInput {
  bathroom_id: string;
  google_place_id: string;
}

export interface BusinessGoogleHoursSyncResult {
  bathroom_id: string;
  google_place_id: string;
  place_name: string | null;
  hours: HoursData;
  hours_source: HoursSourceType;
  updated_at: string;
}

// ============================================================================
// STALLPASS VISIT TYPES
// ============================================================================

export type StallPassVisitSource = 'map_navigation' | 'search' | 'favorite' | 'coupon_redeem' | 'deep_link';

export interface StallPassVisit {
  id: string;
  bathroom_id: string;
  user_id: string;
  visited_at: string;
  source: StallPassVisitSource;
  created_at: string;
}

export interface BusinessVisitStats {
  bathroom_id: string;
  total_visits: number;
  visits_this_week: number;
  visits_this_month: number;
  unique_visitors: number;
  top_source: StallPassVisitSource | null;
}

// ============================================================================
// COUPON TYPES
// ============================================================================

export type CouponType = 'percent_off' | 'dollar_off' | 'bogo' | 'free_item' | 'custom';

export interface BusinessCoupon {
  id: string;
  bathroom_id: string;
  business_user_id: string;
  title: string;
  description: string | null;
  coupon_type: CouponType;
  value: number | null;
  min_purchase: number | null;
  coupon_code: string;
  max_redemptions: number | null;
  current_redemptions: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  premium_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponInput {
  bathroom_id: string;
  title: string;
  description?: string | null;
  coupon_type: CouponType;
  value?: number | null;
  min_purchase?: number | null;
  coupon_code?: string | null;
  max_redemptions?: number | null;
  starts_at?: string;
  expires_at?: string | null;
  premium_only?: boolean;
}

export interface UpdateCouponInput {
  coupon_id: string;
  title?: string;
  description?: string | null;
  value?: number | null;
  min_purchase?: number | null;
  max_redemptions?: number | null;
  expires_at?: string | null;
  is_active?: boolean;
  premium_only?: boolean;
}

export interface BathroomCouponPublic {
  id: string;
  title: string;
  description: string | null;
  coupon_type: CouponType;
  value: number | null;
  min_purchase: number | null;
  coupon_code: string;
  starts_at: string;
  expires_at: string | null;
  premium_only: boolean;
  already_redeemed: boolean;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  user_id: string;
  redeemed_at: string;
}

export interface CouponRedemptionResult {
  success: boolean;
  redemption_id: string;
  coupon_code: string;
  title: string;
}

// ============================================================================
// EARLY ADOPTER INVITE TYPES
// ============================================================================

export type EarlyAdopterInviteStatus = 'pending' | 'redeemed' | 'expired' | 'revoked';

export interface EarlyAdopterInvite {
  id: string;
  invite_token: string;
  target_business_name: string | null;
  target_email: string | null;
  notes: string | null;
  expires_at: string;
  status: EarlyAdopterInviteStatus;
  redeemed_by: string | null;
  redeemed_at: string | null;
  created_at: string;
  redeemer_display_name: string | null;
}

export interface GenerateInviteInput {
  target_business_name?: string | null;
  target_email?: string | null;
  notes?: string | null;
  expiry_days?: number;
}

export interface GenerateInviteResult {
  success: boolean;
  invite_id: string;
  invite_token: string;
  expires_at: string;
}

export interface RedeemInviteResult {
  success: boolean;
  invite_id: string;
  is_lifetime_free: boolean;
  message: string;
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

export interface CleanlinessRatingCreate {
  bathroom_id: string;
  rating: number;
  notes?: string;
}

export interface LiveStatusReportCreate {
  bathroom_id: string;
  status: BathroomLiveStatus;
  note?: string;
}

export interface CleanlinessRating {
  id: string;
  bathroom_id: string;
  user_id: string;
  rating: number;
  notes: string | null;
  created_at: string;
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
  premium_expires_at: string | null;
  is_suspended: boolean;
  is_deactivated: boolean;
  current_streak: number;
  longest_streak: number;
  last_contribution_date: string | null;
  streak_multiplier: number;
  streak_multiplier_expires_at: string | null;
  push_token: string | null;
  push_enabled: boolean;
  notification_prefs: NotificationPrefs;
  created_at: string;
  updated_at: string;
}

export interface NotificationPrefs {
  code_verified: boolean;
  favorite_update: boolean;
  nearby_new: boolean;
  streak_reminder: boolean;
  arrival_alert: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  code_verified: true,
  favorite_update: true,
  nearby_new: false,
  streak_reminder: true,
  arrival_alert: true,
};

export type NotificationType =
  | 'favorite_update'
  | 'code_verified'
  | 'nearby_new'
  | 'streak_reminder'
  | 'arrival_alert';

export interface NotificationRouteData {
  type?: NotificationType;
  route?: string;
  bathroom_id?: string;
}

export type BathroomLiveStatus = Database['public']['Tables']['bathroom_status_events']['Row']['status'];

export interface BathroomStatusEvent {
  id: string;
  bathroom_id: string;
  reported_by: string;
  status: BathroomLiveStatus;
  note: string | null;
  expires_at: string;
  created_at: string;
}

export interface NotificationSettingsResult {
  success: boolean;
  error?: string;
  key?: string;
}

export type PointEventType = Database['public']['Tables']['point_events']['Row']['event_type'];
export type UserBadgeCategory = Database['public']['Tables']['user_badges']['Row']['badge_category'];
export type LeaderboardScope = 'global' | 'state' | 'city';
export type LeaderboardTimeframe = 'weekly' | 'all_time';

export interface UserBadge {
  id: string;
  user_id: string;
  badge_key: string;
  badge_name: string;
  badge_description: string;
  badge_category: UserBadgeCategory;
  context_city_slug: string | null;
  awarded_at: string;
}

export interface GamificationSummary {
  total_bathrooms_added: number;
  total_codes_submitted: number;
  total_code_verifications: number;
  total_reports_filed: number;
  total_photos_uploaded: number;
  total_badges: number;
  primary_city: string | null;
  primary_state: string | null;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  bathrooms_added: number;
  codes_submitted: number;
  verifications: number;
  photos_uploaded: number;
  reports_resolved: number;
  leaderboard_scope: LeaderboardScope;
  scope_label: string;
  rank: number;
}

export interface PremiumRedemptionResult {
  user_id: string;
  months_redeemed: number;
  points_spent: number;
  remaining_points: number;
  premium_expires_at: string;
  is_premium: boolean;
}

export interface PremiumCityPackManifest {
  slug: string;
  city: string;
  state: string;
  country_code: string;
  bathroom_count: number;
  center_latitude: number;
  center_longitude: number;
  min_latitude: number;
  max_latitude: number;
  min_longitude: number;
  max_longitude: number;
  latest_bathroom_update_at: string;
  latest_code_verified_at: string | null;
}

export interface DownloadedPremiumCityPack extends PremiumCityPackManifest {
  downloaded_at: string;
}

export interface PremiumArrivalAlert {
  id: string;
  user_id: string;
  bathroom_id: string;
  target_arrival_at: string;
  lead_minutes: 15 | 30 | 60;
  status: 'active' | 'cancelled' | 'expired';
  created_at: string;
  updated_at: string;
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
// TOAST TYPES
// ============================================================================

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

// ============================================================================
// DATABASE TYPE EXPORTS
// ============================================================================

export type { Database };
export type DbProfile = Database['public']['Tables']['profiles']['Row'];
export type DbBathroom = Database['public']['Tables']['bathrooms']['Row'];
export type DbCode = Database['public']['Tables']['bathroom_access_codes']['Row'];
export type DbFavorite = Database['public']['Tables']['favorites']['Row'];
export type DbPushSubscription = Database['public']['Tables']['push_subscriptions']['Row'];
export type DbReport = Database['public']['Tables']['bathroom_reports']['Row'];
export type DbClaim = Database['public']['Tables']['business_claims']['Row'];
export type DbBathroomPhoto = Database['public']['Tables']['bathroom_photos']['Row'];
export type DbCodeVote = Database['public']['Tables']['code_votes']['Row'];
export type DbCodeRevealGrant = Database['public']['Tables']['code_reveal_grants']['Row'];
export type DbCleanlinessRating = Database['public']['Tables']['cleanliness_ratings']['Row'];
export type DbPointEvent = Database['public']['Tables']['point_events']['Row'];
export type DbUserBadge = Database['public']['Tables']['user_badges']['Row'];
export type DbBathroomStatusEvent = Database['public']['Tables']['bathroom_status_events']['Row'];
export type DbPremiumArrivalAlert = Database['public']['Tables']['premium_arrival_alerts']['Row'];
export type DbBusinessVerificationBadge = Database['public']['Tables']['business_verification_badges']['Row'];
export type DbBusinessFeaturedPlacement = Database['public']['Tables']['business_featured_placements']['Row'];
export type DbBusinessHoursUpdate = Database['public']['Tables']['business_hours_updates']['Row'];
export type DbUserAccessibilityPreferences = Database['public']['Tables']['user_accessibility_preferences']['Row'];
export type DbBathroomStallPassVisit = Database['public']['Tables']['bathroom_stallpass_visits']['Row'];
export type DbBusinessCoupon = Database['public']['Tables']['business_coupons']['Row'];
export type DbCouponRedemption = Database['public']['Tables']['coupon_redemptions']['Row'];
export type DbEarlyAdopterInvite = Database['public']['Tables']['early_adopter_invites']['Row'];
