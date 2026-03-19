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
  | 'status_report';

export interface FavoriteMutationPayload {
  bathroom_id: string;
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
  | 'report_live_status';

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

// ============================================================================
// BATHROOM TYPES
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
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

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchHistoryItem {
  query: string;
  searched_at: string;
}

export interface CityBrowseItem {
  city: string;
  state: string;
  bathroom_count: number;
}

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
  Database['public']['Tables']['business_hours_updates']['Row']['update_source'];

export interface BusinessFeaturedPlacementScope {
  city?: string;
  state?: string;
  radius_km?: number;
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
  verification_badge_type: BusinessVerificationBadgeType | null;
  has_verification_badge: boolean;
  has_active_featured_placement: boolean;
  active_featured_placements: number;
  last_updated: string;
}

export interface BusinessDashboardSummary {
  total_bathrooms: number;
  total_favorites_across_all: number;
  total_open_reports: number;
  avg_rating_across_all: number;
  active_featured_placements: number;
  verified_locations: number;
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

export interface UpdateBusinessHoursInput {
  bathroom_id: string;
  hours: HoursData;
}

export interface BusinessHoursUpdateResult {
  success: boolean;
  bathroom_id: string;
  updated_at: string;
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
