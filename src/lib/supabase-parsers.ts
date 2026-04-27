import { z } from 'zod';
import type { Json } from '@/types/database';

const dateTimeStringSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Expected an ISO-compatible timestamp.');

const jsonValueSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)])
);

const rawTextSchema = z.string().min(1);

export const notificationPrefsSchema = z.object({
  code_verified: z.boolean(),
  favorite_update: z.boolean(),
  nearby_new: z.boolean(),
  streak_reminder: z.boolean(),
  arrival_alert: z.boolean().default(true),
});

export const accessibilityFeaturesSchema = z.object({
  has_grab_bars: z.boolean().default(false),
  door_width_inches: z.number().nullable().default(null),
  is_automatic_door: z.boolean().default(false),
  has_changing_table: z.boolean().default(false),
  is_family_restroom: z.boolean().default(false),
  is_gender_neutral: z.boolean().default(false),
  has_audio_cue: z.boolean().default(false),
  has_braille_signage: z.boolean().default(false),
  has_wheelchair_ramp: z.boolean().default(false),
  has_elevator_access: z.boolean().default(false),
  stall_width_inches: z.number().nullable().default(null),
  turning_radius_inches: z.number().nullable().default(null),
  notes: z.string().nullable().default(null),
  photo_urls: z.array(z.string()).default([]),
  verification_date: dateTimeStringSchema.nullable().default(null),
});

export const userAccessibilityPreferencesSchema = z.object({
  id: rawTextSchema,
  user_id: rawTextSchema,
  accessibility_mode_enabled: z.boolean(),
  require_grab_bars: z.boolean(),
  require_automatic_door: z.boolean(),
  require_gender_neutral: z.boolean(),
  require_family_restroom: z.boolean(),
  require_changing_table: z.boolean(),
  min_door_width_inches: z.number().int().nullable(),
  min_stall_width_inches: z.number().int().nullable(),
  prioritize_accessible: z.boolean(),
  hide_non_accessible: z.boolean(),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const bathroomAccessibilityUpdateResultSchema = z.object({
  bathroom_id: rawTextSchema,
  accessibility_features: accessibilityFeaturesSchema,
  is_accessible: z.boolean(),
  accessibility_score: z.number().int().nonnegative(),
  updated_at: dateTimeStringSchema,
});

export const dbProfileSchema = z.object({
  id: rawTextSchema,
  email: z.string().email().nullable(),
  display_name: z.string().nullable(),
  role: z.enum(['user', 'business', 'admin']),
  points_balance: z.number().int(),
  is_premium: z.boolean(),
  premium_expires_at: dateTimeStringSchema.nullable(),
  is_suspended: z.boolean(),
  is_deactivated: z.boolean().optional().default(false),
  current_streak: z.number().int().nonnegative(),
  longest_streak: z.number().int().nonnegative(),
  last_contribution_date: z.string().nullable(),
  streak_multiplier: z.number(),
  streak_multiplier_expires_at: dateTimeStringSchema.nullable(),
  free_code_reveal_used_at: dateTimeStringSchema.nullable(),
  free_emergency_lookup_used_at: dateTimeStringSchema.nullable(),
  push_token: z.string().nullable(),
  push_enabled: z.boolean(),
  notification_prefs: notificationPrefsSchema,
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const dbBathroomSchema = z.object({
  id: rawTextSchema,
  place_name: rawTextSchema,
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  country_code: rawTextSchema,
  latitude: z.number(),
  longitude: z.number(),
  is_locked: z.boolean().nullable(),
  is_accessible: z.boolean().nullable(),
  is_customer_only: z.boolean(),
  accessibility_features: accessibilityFeaturesSchema.default({
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
  }),
  hours_json: jsonValueSchema.nullable(),
  source_type: z.enum(['community', 'business', 'imported', 'admin']),
  moderation_status: z.enum(['active', 'flagged', 'hidden', 'deleted', 'unverified']),
  created_by: z.string().nullable(),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const dbBathroomPhotoSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  uploaded_by: rawTextSchema,
  storage_bucket: rawTextSchema,
  storage_path: rawTextSchema,
  content_type: rawTextSchema,
  file_size_bytes: z.number().int().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  is_primary: z.boolean(),
  photo_type: z.enum(['exterior', 'interior', 'keypad', 'sign']),
  moderation_status: z.enum(['approved', 'pending', 'rejected']),
  created_at: dateTimeStringSchema,
});

export const dbCodeVoteSchema = z.object({
  id: rawTextSchema,
  code_id: rawTextSchema,
  user_id: rawTextSchema,
  vote: z.union([z.literal(-1), z.literal(1)]),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const dbCleanlinessRatingSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  user_id: rawTextSchema,
  rating: z.number().int().min(1).max(5),
  notes: z.string().nullable(),
  created_at: dateTimeStringSchema,
});

export const dbCodeRevealGrantSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  user_id: rawTextSchema,
  grant_source: z.enum(['rewarded_ad', 'starter_free', 'points_redeemed']),
  expires_at: dateTimeStringSchema,
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const codeRevealUnlockResultSchema = dbCodeRevealGrantSchema.extend({
  points_spent: z.number().int().nonnegative(),
  remaining_points: z.number().int().nonnegative(),
  used_free_unlock: z.boolean(),
});

export const emergencyLookupAccessResultSchema = z.object({
  user_id: rawTextSchema,
  unlock_method: z.enum(['rewarded_ad', 'starter_free', 'points_redeemed']),
  points_spent: z.number().int().nonnegative(),
  remaining_points: z.number().int().nonnegative(),
  used_free_unlock: z.boolean(),
  unlocked_at: dateTimeStringSchema,
});

export const dbPointEventSchema = z.object({
  id: rawTextSchema,
  user_id: rawTextSchema,
  event_type: z.enum([
    'bathroom_added',
    'bathroom_photo_uploaded',
    'code_submitted',
    'code_verification',
    'report_resolved',
    'code_milestone',
    'premium_redeemed',
    'code_verification_consensus',
    'consensus_denial_award',
    'code_reveal_redeemed',
    'emergency_lookup_redeemed',
  ]),
  reference_table: rawTextSchema,
  reference_id: rawTextSchema,
  points_awarded: z.number().int(),
  metadata: jsonValueSchema,
  created_at: dateTimeStringSchema,
});

export const dbUserBadgeSchema = z.object({
  id: rawTextSchema,
  user_id: rawTextSchema,
  badge_key: rawTextSchema,
  badge_name: rawTextSchema,
  badge_description: rawTextSchema,
  badge_category: z.enum(['milestone', 'streak', 'time', 'accessibility', 'city']),
  context_city_slug: z.string().nullable(),
  awarded_at: dateTimeStringSchema,
});

export const gamificationSummarySchema = z.object({
  total_bathrooms_added: z.number().int(),
  total_codes_submitted: z.number().int(),
  total_code_verifications: z.number().int(),
  total_reports_filed: z.number().int(),
  total_photos_uploaded: z.number().int(),
  total_badges: z.number().int(),
  primary_city: z.string().nullable(),
  primary_state: z.string().nullable(),
});

export const leaderboardEntrySchema = z.object({
  user_id: rawTextSchema,
  display_name: rawTextSchema,
  total_points: z.number().int(),
  bathrooms_added: z.number().int(),
  codes_submitted: z.number().int(),
  verifications: z.number().int(),
  photos_uploaded: z.number().int(),
  reports_resolved: z.number().int(),
  leaderboard_scope: z.enum(['global', 'state', 'city']),
  scope_label: rawTextSchema,
  rank: z.number().int().positive(),
});

export const premiumRedemptionSchema = z.object({
  user_id: rawTextSchema,
  months_redeemed: z.number().int().positive(),
  points_spent: z.number().int().positive(),
  remaining_points: z.number().int().nonnegative(),
  premium_expires_at: dateTimeStringSchema,
  is_premium: z.boolean(),
});

export const dbFavoriteSchema = z.object({
  id: rawTextSchema,
  user_id: rawTextSchema,
  bathroom_id: rawTextSchema,
  created_at: dateTimeStringSchema,
});

export const dbReportSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  reported_by: rawTextSchema,
  report_type: z.enum(['wrong_code', 'closed', 'unsafe', 'duplicate', 'incorrect_hours', 'no_restroom', 'other']),
  status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']),
  notes: z.string().nullable(),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const dbBathroomStatusEventSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  reported_by: rawTextSchema,
  status: z.enum(['clean', 'dirty', 'closed', 'out_of_order', 'long_wait']),
  note: z.string().nullable(),
  expires_at: dateTimeStringSchema,
  created_at: dateTimeStringSchema,
});

export const notificationSettingsResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  key: z.string().optional(),
});

export const bathroomSubmissionResultSchema = z.object({
  bathroom_id: rawTextSchema,
  created_at: dateTimeStringSchema,
});

export const bathroomCodeSubmissionResultSchema = z.object({
  code_id: rawTextSchema,
  created_at: dateTimeStringSchema,
});

export const bathroomReportResultSchema = z.object({
  report_id: rawTextSchema,
  created_at: dateTimeStringSchema,
});

export const importedLocationVerificationResultSchema = z.object({
  success: z.boolean(),
  error: z.string().nullable().optional().default(null),
  verification_id: z.string().nullable().default(null),
  created_at: dateTimeStringSchema.nullable().default(null),
  bathroom_id: rawTextSchema,
  location_exists: z.boolean(),
  next_allowed_at: dateTimeStringSchema.nullable().default(null),
  imported_location_last_verified_at: dateTimeStringSchema.nullable().default(null),
  imported_location_confirmation_count: z.number().int().nonnegative().default(0),
  imported_location_denial_count: z.number().int().nonnegative().default(0),
  imported_location_weighted_confirmation_score: z.number().nonnegative().default(0),
  imported_location_weighted_denial_score: z.number().nonnegative().default(0),
  imported_location_freshness_status: z
    .enum(['unreviewed', 'fresh', 'aging', 'disputed', 'likely_removed'])
    .default('unreviewed'),
  imported_location_needs_review: z.boolean().default(true),
});

export const sourceRecordVerificationResultSchema = z.object({
  success: z.boolean(),
  error: z.string().nullable().optional().default(null),
  verification_id: z.string().nullable().default(null),
  created_at: dateTimeStringSchema.nullable().default(null),
  source_record_id: rawTextSchema,
  canonical_bathroom_id: z.string().nullable().default(null),
  location_exists: z.boolean(),
  listing_promoted: z.boolean().default(false),
  next_allowed_at: dateTimeStringSchema.nullable().default(null),
  source_last_verified_at: dateTimeStringSchema.nullable().default(null),
  source_confirmation_count: z.number().int().nonnegative().default(0),
  source_denial_count: z.number().int().nonnegative().default(0),
  source_weighted_confirmation_score: z.number().nonnegative().default(0),
  source_weighted_denial_score: z.number().nonnegative().default(0),
  source_freshness_status: z
    .enum(['unreviewed', 'fresh', 'aging', 'disputed', 'likely_removed'])
    .default('unreviewed'),
  source_needs_review: z.boolean().default(true),
  eligible_positive_user_count: z.number().int().nonnegative().optional().default(0),
});

export const cleanlinessRatingMutationResultSchema = z.object({
  bathroom_id: rawTextSchema,
  rating: z.number().int().min(1).max(5),
  rated_at: dateTimeStringSchema,
});

export const codeVoteMutationResultSchema = z.object({
  action: z.enum(['cast', 'changed', 'retracted', 'no_change']),
  code_id: rawTextSchema,
  vote: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  voted_at: dateTimeStringSchema,
});

export const profileMutationResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export const deactivateAccountResultSchema = z.object({
  success: z.boolean(),
  user_id: rawTextSchema.optional(),
  deactivated_at: dateTimeStringSchema.optional(),
  error: z.string().optional(),
});

export const deleteAccountResultSchema = z.object({
  success: z.boolean(),
  user_id: rawTextSchema.optional(),
  deleted_at: dateTimeStringSchema.optional(),
  error: z.string().optional(),
});

export const dbPremiumArrivalAlertSchema = z.object({
  id: rawTextSchema,
  user_id: rawTextSchema,
  bathroom_id: rawTextSchema,
  target_arrival_at: dateTimeStringSchema,
  lead_minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  status: z.enum(['active', 'cancelled', 'expired']),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const premiumCityPackManifestSchema = z.object({
  slug: rawTextSchema,
  city: rawTextSchema,
  state: rawTextSchema,
  country_code: rawTextSchema,
  bathroom_count: z.number().int().nonnegative(),
  center_latitude: z.number(),
  center_longitude: z.number(),
  min_latitude: z.number(),
  max_latitude: z.number(),
  min_longitude: z.number(),
  max_longitude: z.number(),
  latest_bathroom_update_at: dateTimeStringSchema,
  latest_code_verified_at: dateTimeStringSchema.nullable(),
});

const hoursEntrySchema = z.object({
  open: rawTextSchema,
  close: rawTextSchema,
});

const hoursDataSchema = z.record(z.string(), z.array(hoursEntrySchema));
const businessHoursSourceSchema = z.enum([
  'business_dashboard',
  'admin_panel',
  'community_report',
  'manual',
  'google',
  'preset_offset',
]);
const hoursSourceTypeSchema = z.enum(['manual', 'google', 'preset_offset']);
const bathroomLocationArchetypeSchema = z.enum([
  'general',
  'park',
  'store',
  'restaurant',
  'transit',
  'event_portable',
  'medical',
  'campus',
  'library',
  'mall',
  'airport',
  'hotel',
]);
const businessCodePolicySchema = z.enum(['community', 'owner_shared', 'owner_private', 'staff_only']);
const importedLocationFreshnessStatusSchema = z.enum(['unreviewed', 'fresh', 'aging', 'disputed', 'likely_removed']);
const bathroomListingKindSchema = z.enum(['canonical', 'source_candidate']);
const sourceRecordStatusSchema = z.enum(['candidate', 'linked', 'promoted', 'rejected', 'likely_removed', 'superseded']);
const contributorTrustTierSchema = z.enum([
  'brand_new',
  'lightly_trusted',
  'verified_contributor',
  'highly_reliable_local',
  'business_verified_manager',
  'flagged_low_trust',
]);
const duplicateCaseStatusSchema = z.enum(['open', 'under_review', 'merged', 'dismissed', 'quarantined']);

export const businessBathroomSettingsSchema = z.object({
  bathroom_id: rawTextSchema,
  requires_premium_access: z.boolean(),
  show_on_free_map: z.boolean(),
  is_location_verified: z.boolean(),
  location_verified_at: dateTimeStringSchema.nullable(),
  code_policy: businessCodePolicySchema.default('community'),
  allow_user_code_submissions: z.boolean().default(true),
  owner_supplied_code: z.string().nullable().optional().default(null),
  owner_code_last_verified_at: dateTimeStringSchema.nullable().optional().default(null),
  owner_code_notes: z.string().nullable().optional().default(null),
  official_access_instructions: z.string().nullable().optional().default(null),
  pricing_plan: z.enum(['standard', 'lifetime']),
  pricing_plan_granted_at: dateTimeStringSchema.nullable().optional().default(null),
  updated_by: z.string().nullable().optional().default(null),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const bathroomCodePolicySummarySchema = z.object({
  bathroom_id: rawTextSchema,
  code_policy: businessCodePolicySchema,
  allow_user_code_submissions: z.boolean(),
  has_official_code: z.boolean(),
  owner_code_last_verified_at: dateTimeStringSchema.nullable(),
  owner_code_notes: z.string().nullable(),
  official_access_instructions: z.string().nullable(),
  can_manager_view_official_code: z.boolean(),
});

export const businessManagedCodeDetailsSchema = z.object({
  bathroom_id: rawTextSchema,
  code_policy: businessCodePolicySchema,
  owner_supplied_code: z.string().nullable(),
  owner_code_last_verified_at: dateTimeStringSchema.nullable(),
  owner_code_notes: z.string().nullable(),
  official_access_instructions: z.string().nullable(),
  allow_user_code_submissions: z.boolean(),
  updated_at: dateTimeStringSchema,
});

export const contributorReputationProfileSchema = z.object({
  user_id: rawTextSchema,
  trust_tier: contributorTrustTierSchema,
  trust_score: z.number(),
  trust_weight: z.number(),
  accepted_contributions: z.number().int().nonnegative(),
  rejected_contributions: z.number().int().nonnegative(),
  reports_resolved: z.number().int().nonnegative(),
  reports_dismissed: z.number().int().nonnegative(),
  approved_photos: z.number().int().nonnegative(),
  rejected_photos: z.number().int().nonnegative(),
  active_codes: z.number().int().nonnegative(),
  removed_codes: z.number().int().nonnegative(),
  bathrooms_added: z.number().int().nonnegative(),
  approved_claims: z.number().int().nonnegative(),
  moderation_flag_count: z.number().int().nonnegative(),
  code_success_ratio: z.number(),
  primary_city: z.string().nullable(),
  primary_state: z.string().nullable(),
  last_contribution_at: dateTimeStringSchema.nullable(),
  last_calculated_at: dateTimeStringSchema,
});

export const duplicateCaseSchema = z.object({
  id: rawTextSchema,
  bathroom_a_id: rawTextSchema,
  bathroom_a_name: rawTextSchema,
  bathroom_a_address: z.string(),
  bathroom_b_id: rawTextSchema,
  bathroom_b_name: rawTextSchema,
  bathroom_b_address: z.string(),
  status: duplicateCaseStatusSchema,
  similarity_score: z.number(),
  distance_meters: z.number().nullable(),
  suggested_merge_target_id: z.string().nullable(),
  merge_into_bathroom_id: z.string().nullable(),
  reason: z.string().nullable(),
  auto_flagged: z.boolean(),
  notes: z.string().nullable(),
  reviewed_by: z.string().nullable(),
  reviewed_at: dateTimeStringSchema.nullable(),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const businessPromotionSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  business_user_id: rawTextSchema,
  title: rawTextSchema,
  description: rawTextSchema,
  offer_type: z.enum(['percentage', 'amount_off', 'freebie', 'custom']),
  offer_value: z.number().nullable(),
  promo_code: z.string().nullable(),
  redemption_instructions: rawTextSchema,
  starts_at: dateTimeStringSchema.nullable(),
  ends_at: dateTimeStringSchema.nullable(),
  is_active: z.boolean(),
  redemptions_count: z.number().int().nonnegative(),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const businessVerificationBadgeSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  claim_id: rawTextSchema,
  verified_at: dateTimeStringSchema,
  verified_by: z.string().nullable(),
  badge_type: z.enum(['standard', 'premium', 'featured']),
  expires_at: dateTimeStringSchema.nullable(),
  created_at: dateTimeStringSchema,
});

export const businessFeaturedPlacementScopeSchema = z
  .object({
    city: z.string().trim().min(1).optional(),
    state: z.string().trim().min(1).optional(),
    radius_km: z.number().positive().optional(),
  })
  .passthrough();

export const businessFeaturedPlacementSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  business_user_id: rawTextSchema,
  placement_type: z.enum(['search_top', 'map_priority', 'nearby_featured']),
  geographic_scope: businessFeaturedPlacementScopeSchema,
  start_date: dateTimeStringSchema,
  end_date: dateTimeStringSchema,
  impressions_count: z.number().int().nonnegative(),
  clicks_count: z.number().int().nonnegative(),
  status: z.enum(['active', 'paused', 'expired', 'cancelled']),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const businessHoursUpdateSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  updated_by: rawTextSchema,
  old_hours: hoursDataSchema.nullable(),
  new_hours: hoursDataSchema,
  update_source: businessHoursSourceSchema,
  created_at: dateTimeStringSchema,
});

export const businessBathroomHoursConfigSchema = z.object({
  bathroom_id: rawTextSchema,
  place_name: rawTextSchema,
  hours_json: hoursDataSchema.nullable(),
  hours_source: hoursSourceTypeSchema,
  hours_offset_minutes: z.number().int().nullable(),
  google_place_id: z.string().nullable(),
  updated_at: dateTimeStringSchema,
});

export const businessDashboardAnalyticsRowSchema = z.object({
  bathroom_id: rawTextSchema,
  claim_id: z.string().nullable(),
  place_name: rawTextSchema,
  business_name: z.string().nullable(),
  total_favorites: z.number().int().nonnegative(),
  open_reports: z.number().int().nonnegative(),
  avg_cleanliness: z.number().nonnegative(),
  total_ratings: z.number().int().nonnegative(),
  weekly_views: z.number().int().nonnegative(),
  weekly_unique_visitors: z.number().int().nonnegative(),
  monthly_unique_visitors: z.number().int().nonnegative(),
  weekly_navigation_count: z.number().int().nonnegative(),
  verification_badge_type: z.enum(['standard', 'premium', 'featured']).nullable(),
  has_verification_badge: z.boolean(),
  has_active_featured_placement: z.boolean(),
  active_featured_placements: z.number().int().nonnegative(),
  active_offer_count: z.number().int().nonnegative(),
  requires_premium_access: z.boolean(),
  show_on_free_map: z.boolean(),
  is_location_verified: z.boolean(),
  location_verified_at: dateTimeStringSchema.nullable(),
  pricing_plan: z.enum(['standard', 'lifetime']),
  last_updated: dateTimeStringSchema,
});

export const businessHoursUpdateResultSchema = z.object({
  success: z.boolean(),
  bathroom_id: rawTextSchema,
  hours_source: hoursSourceTypeSchema.optional().default('manual'),
  updated_at: dateTimeStringSchema,
});

export const businessGoogleHoursSyncSchema = z.object({
  provider: z.literal('google_places').optional().default('google_places'),
  place_name: z.string().nullable().optional().default(null),
  google_place_id: rawTextSchema,
  time_zone: z.string().nullable().optional().default(null),
  utc_offset_minutes: z.number().int().nullable().optional().default(null),
  open_now: z.boolean().optional().default(false),
  hours: hoursDataSchema,
});

export const googlePlaceAutocompleteSuggestionSchema = z.object({
  place_id: rawTextSchema,
  text: rawTextSchema,
  primary_text: rawTextSchema,
  secondary_text: z.union([z.string(), z.null()]).default(null),
  distance_meters: z.union([z.number(), z.null()]).default(null),
});

const googlePlaceViewportPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const googlePlaceAddressComponentsSchema = z.object({
  address_line1: z.union([z.string(), z.null()]).default(null),
  city: z.union([z.string(), z.null()]).default(null),
  state: z.union([z.string(), z.null()]).default(null),
  postal_code: z.union([z.string(), z.null()]).default(null),
  country_code: z.union([z.string(), z.null()]).default(null),
});

export const googlePlaceAddressResolutionSchema = z.object({
  place_id: rawTextSchema,
  formatted_address: z.union([z.string(), z.null()]).default(null),
  location: googlePlaceViewportPointSchema,
  viewport: z
    .object({
      low: googlePlaceViewportPointSchema,
      high: googlePlaceViewportPointSchema,
    })
    .nullable()
    .default(null),
  address_components: googlePlaceAddressComponentsSchema.default({
    address_line1: null,
    city: null,
    state: null,
    postal_code: null,
    country_code: null,
  }),
});

// ============================================================================
// StallPass Visit Schemas
// ============================================================================

export const stallPassVisitSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  user_id: rawTextSchema,
  visited_at: dateTimeStringSchema,
  source: z.enum(['map_navigation', 'search', 'favorite', 'coupon_redeem', 'deep_link']),
  created_at: dateTimeStringSchema,
});

export const businessVisitStatsSchema = z.object({
  bathroom_id: rawTextSchema,
  total_visits: z.number().int().nonnegative(),
  visits_this_week: z.number().int().nonnegative(),
  visits_this_month: z.number().int().nonnegative(),
  unique_visitors: z.number().int().nonnegative(),
  top_source: z.enum(['map_navigation', 'search', 'favorite', 'coupon_redeem', 'deep_link']).nullable(),
});

// ============================================================================
// Coupon Schemas
// ============================================================================

export const businessCouponSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  business_user_id: rawTextSchema,
  title: rawTextSchema,
  description: z.string().nullable(),
  coupon_type: z.enum(['percent_off', 'dollar_off', 'bogo', 'free_item', 'custom']),
  value: z.number().positive().nullable(),
  min_purchase: z.number().nonnegative().nullable(),
  coupon_code: rawTextSchema,
  max_redemptions: z.number().int().positive().nullable(),
  current_redemptions: z.number().int().nonnegative(),
  starts_at: dateTimeStringSchema,
  expires_at: dateTimeStringSchema.nullable(),
  is_active: z.boolean(),
  premium_only: z.boolean(),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const bathroomCouponPublicSchema = z.object({
  id: rawTextSchema,
  title: rawTextSchema,
  description: z.string().nullable(),
  coupon_type: z.enum(['percent_off', 'dollar_off', 'bogo', 'free_item', 'custom']),
  value: z.number().positive().nullable(),
  min_purchase: z.number().nonnegative().nullable(),
  coupon_code: rawTextSchema,
  starts_at: dateTimeStringSchema,
  expires_at: dateTimeStringSchema.nullable(),
  premium_only: z.boolean(),
  already_redeemed: z.boolean(),
});

export const couponRedemptionResultSchema = z.object({
  success: z.boolean(),
  redemption_id: rawTextSchema,
  coupon_code: rawTextSchema,
  title: rawTextSchema,
});

// ============================================================================
// Early Adopter Invite Schemas
// ============================================================================

export const earlyAdopterInviteSchema = z.object({
  id: rawTextSchema,
  invite_token: rawTextSchema,
  target_business_name: z.string().nullable(),
  target_email: z.string().nullable(),
  notes: z.string().nullable(),
  expires_at: dateTimeStringSchema,
  status: z.enum(['pending', 'redeemed', 'expired', 'revoked']),
  redeemed_by: z.string().nullable(),
  redeemed_at: dateTimeStringSchema.nullable(),
  created_at: dateTimeStringSchema,
  redeemer_display_name: z.string().nullable(),
});

export const generateInviteResultSchema = z.object({
  success: z.boolean(),
  invite_id: rawTextSchema,
  invite_token: rawTextSchema,
  expires_at: dateTimeStringSchema,
});

export const redeemInviteResultSchema = z.object({
  success: z.boolean(),
  invite_id: rawTextSchema,
  is_lifetime_free: z.boolean(),
  message: z.string(),
});

export const bathroomAccessCodeSchema = z.object({
  id: rawTextSchema,
  bathroom_id: rawTextSchema,
  submitted_by: rawTextSchema,
  code_value: rawTextSchema,
  confidence_score: z.number(),
  up_votes: z.number().int(),
  down_votes: z.number().int(),
  last_verified_at: dateTimeStringSchema.nullable(),
  expires_at: dateTimeStringSchema.nullable(),
  visibility_status: z.enum(['visible', 'needs_review', 'removed']),
  lifecycle_status: z.enum(['active', 'expired', 'superseded']),
  created_at: dateTimeStringSchema,
  updated_at: dateTimeStringSchema,
});

export const publicBathroomDetailRowSchema = z.object({
  id: rawTextSchema,
  place_name: rawTextSchema,
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  country_code: rawTextSchema,
  latitude: z.number(),
  longitude: z.number(),
  is_locked: z.boolean().nullable(),
  is_accessible: z.boolean().nullable(),
  is_customer_only: z.boolean(),
  accessibility_features: accessibilityFeaturesSchema.default({
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
  }),
  accessibility_score: z.number().int().nonnegative().default(0),
  hours_json: jsonValueSchema.nullable(),
  code_id: z.string().nullable(),
  confidence_score: z.number().nullable(),
  up_votes: z.number().int().nullable(),
  down_votes: z.number().int().nullable(),
  last_verified_at: dateTimeStringSchema.nullable(),
  expires_at: dateTimeStringSchema.nullable(),
  cleanliness_avg: z.number().nullable(),
  updated_at: dateTimeStringSchema,
  verification_badge_type: z.enum(['standard', 'premium', 'featured']).nullable().default(null),
  stallpass_access_tier: z.enum(['public', 'premium']).default('public'),
  show_on_free_map: z.boolean().default(true),
  is_business_location_verified: z.boolean().default(false),
  location_verified_at: dateTimeStringSchema.nullable().default(null),
  active_offer_count: z.number().int().nonnegative().default(0),
  location_archetype: bathroomLocationArchetypeSchema.default('general'),
  archetype_metadata: z.record(z.string(), jsonValueSchema).default({}),
  code_policy: businessCodePolicySchema.default('community'),
  allow_user_code_submissions: z.boolean().default(true),
  has_official_code: z.boolean().default(false),
  owner_code_last_verified_at: dateTimeStringSchema.nullable().default(null),
  official_access_instructions: z.string().nullable().default(null),
  imported_location_last_verified_at: dateTimeStringSchema.nullable().default(null),
  imported_location_confirmation_count: z.number().int().nonnegative().default(0),
  imported_location_denial_count: z.number().int().nonnegative().default(0),
  imported_location_weighted_confirmation_score: z.number().nonnegative().default(0),
  imported_location_weighted_denial_score: z.number().nonnegative().default(0),
  imported_location_freshness_status: importedLocationFreshnessStatusSchema.nullable().default(null),
  imported_location_needs_review: z.boolean().default(false),
});

const sourceSummaryFieldsSchema = z.object({
  origin_source_key: z.string().nullable().default(null),
  origin_label: z.string().nullable().default(null),
  origin_attribution_short: z.string().nullable().default(null),
  source_dataset: z.string().nullable().default(null),
  source_license_key: z.string().nullable().default(null),
  source_url: z.string().nullable().default(null),
  source_updated_at: dateTimeStringSchema.nullable().default(null),
  source_last_verified_at: dateTimeStringSchema.nullable().default(null),
  source_confirmation_count: z.number().int().nonnegative().default(0),
  source_denial_count: z.number().int().nonnegative().default(0),
  source_weighted_confirmation_score: z.number().nonnegative().default(0),
  source_weighted_denial_score: z.number().nonnegative().default(0),
  source_freshness_status: importedLocationFreshnessStatusSchema.nullable().default(null),
  source_needs_review: z.boolean().default(false),
});

const directoryCapabilitiesSchema = z.object({
  can_favorite: z.boolean().default(false),
  can_submit_code: z.boolean().default(false),
  can_report_live_status: z.boolean().default(false),
  can_claim_business: z.boolean().default(false),
});

export const canonicalBathroomDetailRowSchema = publicBathroomDetailRowSchema.extend({
  ...sourceSummaryFieldsSchema.shape,
});

export const directoryListingRowSchema = z.object({
  listing_kind: bathroomListingKindSchema,
  bathroom_id: z.string().nullable().default(null),
  source_record_id: z.string().nullable().default(null),
  place_name: rawTextSchema,
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  country_code: rawTextSchema,
  latitude: z.number(),
  longitude: z.number(),
  is_locked: z.boolean().nullable(),
  is_accessible: z.boolean().nullable(),
  is_customer_only: z.boolean(),
  accessibility_features: accessibilityFeaturesSchema.default({
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
  }),
  accessibility_score: z.number().int().nonnegative().default(0),
  hours_json: jsonValueSchema.nullable(),
  code_id: z.string().nullable().default(null),
  confidence_score: z.number().nullable().default(null),
  up_votes: z.number().int().nullable().default(null),
  down_votes: z.number().int().nullable().default(null),
  last_verified_at: dateTimeStringSchema.nullable().default(null),
  expires_at: dateTimeStringSchema.nullable().default(null),
  cleanliness_avg: z.number().nullable().default(null),
  updated_at: dateTimeStringSchema,
  verification_badge_type: z.enum(['standard', 'premium', 'featured']).nullable().default(null),
  stallpass_access_tier: z.enum(['public', 'premium']).default('public'),
  show_on_free_map: z.boolean().default(true),
  is_business_location_verified: z.boolean().default(false),
  location_verified_at: dateTimeStringSchema.nullable().default(null),
  active_offer_count: z.number().int().nonnegative().default(0),
  location_archetype: bathroomLocationArchetypeSchema.default('general'),
  archetype_metadata: z.record(z.string(), jsonValueSchema).default({}),
  code_policy: businessCodePolicySchema.nullable().default(null),
  allow_user_code_submissions: z.boolean().default(false),
  has_official_code: z.boolean().default(false),
  owner_code_last_verified_at: dateTimeStringSchema.nullable().default(null),
  official_access_instructions: z.string().nullable().default(null),
  ...sourceSummaryFieldsSchema.shape,
  ...directoryCapabilitiesSchema.shape,
  distance_meters: z.number().nullable().default(null),
  rank: z.number().optional().default(0),
});

export const sourceCandidateDetailRowSchema = z.object({
  source_record_id: rawTextSchema,
  canonical_bathroom_id: z.string().nullable().default(null),
  place_name: rawTextSchema,
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  country_code: rawTextSchema,
  latitude: z.number(),
  longitude: z.number(),
  is_locked: z.boolean().nullable(),
  is_accessible: z.boolean().nullable(),
  is_customer_only: z.boolean(),
  accessibility_features: accessibilityFeaturesSchema.default({
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
  }),
  accessibility_score: z.number().int().nonnegative().default(0),
  hours_json: jsonValueSchema.nullable(),
  updated_at: dateTimeStringSchema,
  show_on_free_map: z.boolean().default(true),
  location_archetype: bathroomLocationArchetypeSchema.default('general'),
  archetype_metadata: z.record(z.string(), jsonValueSchema).default({}),
  origin_source_key: z.string().nullable().default(null),
  origin_label: z.string().nullable().default(null),
  origin_attribution_short: z.string().nullable().default(null),
  source_dataset: z.string().nullable().default(null),
  source_license_key: z.string().nullable().default(null),
  source_url: z.string().nullable().default(null),
  source_updated_at: dateTimeStringSchema.nullable().default(null),
  source_status: sourceRecordStatusSchema,
  source_last_verified_at: dateTimeStringSchema.nullable().default(null),
  source_confirmation_count: z.number().int().nonnegative().default(0),
  source_denial_count: z.number().int().nonnegative().default(0),
  source_weighted_confirmation_score: z.number().nonnegative().default(0),
  source_weighted_denial_score: z.number().nonnegative().default(0),
  source_freshness_status: importedLocationFreshnessStatusSchema.nullable().default(null),
  source_needs_review: z.boolean().default(false),
  ...directoryCapabilitiesSchema.shape,
});

export const nearbyBathroomRowSchema = publicBathroomDetailRowSchema.extend({
  distance_meters: z.number(),
});

export const searchBathroomRowSchema = publicBathroomDetailRowSchema.extend({
  distance_meters: z.number().nullable(),
  rank: z.number(),
});

export const favoriteBathroomRowSchema = publicBathroomDetailRowSchema.extend({
  distance_meters: z.number().nullable(),
  favorited_at: dateTimeStringSchema,
});

export const favoriteIdRowSchema = z.object({
  bathroom_id: rawTextSchema,
});

export const toggleFavoriteResultSchema = z.object({
  action: z.enum(['added', 'removed']),
  bathroom_id: rawTextSchema,
  user_id: rawTextSchema,
  toggled_at: dateTimeStringSchema,
});

export const cityBrowseRowSchema = z.object({
  city: rawTextSchema,
  state: rawTextSchema,
  bathroom_count: z.number().int().nonnegative(),
});

export const searchSuggestionRowSchema = z.object({
  bathroom_id: rawTextSchema,
  place_name: rawTextSchema,
  city: z.string().nullable(),
  state: z.string().nullable(),
  distance_meters: z.number().nullable(),
});

function buildValidationError(
  label: string,
  fallbackMessage: string,
  error: z.ZodError
): Error & { code?: string } {
  const issueSummary = error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || label}: ${issue.message}`)
    .join('; ');

  const appError = new Error(
    issueSummary.length > 0
      ? `${fallbackMessage} Invalid ${label} payload received. ${issueSummary}`
      : `${fallbackMessage} Invalid ${label} payload received.`
  ) as Error & { code?: string };

  appError.code = 'SCHEMA_VALIDATION_FAILED';
  return appError;
}

export function parseSupabaseNullableRow<T>(
  schema: z.ZodType<T>,
  data: unknown,
  label: string,
  fallbackMessage: string
): { data: T | null; error: (Error & { code?: string }) | null } {
  if (data === null || typeof data === 'undefined') {
    return {
      data: null,
      error: null,
    };
  }

  const parsedData = schema.safeParse(data);

  if (!parsedData.success) {
    return {
      data: null,
      error: buildValidationError(label, fallbackMessage, parsedData.error),
    };
  }

  return {
    data: parsedData.data,
    error: null,
  };
}

export function parseSupabaseRows<T>(
  schema: z.ZodType<T>,
  data: unknown,
  label: string,
  fallbackMessage: string
): { data: T[]; error: (Error & { code?: string }) | null } {
  const parsedData = z.array(schema).safeParse(data ?? []);

  if (!parsedData.success) {
    return {
      data: [],
      error: buildValidationError(label, fallbackMessage, parsedData.error),
    };
  }

  return {
    data: parsedData.data,
    error: null,
  };
}
