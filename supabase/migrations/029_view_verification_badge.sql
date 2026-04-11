-- ============================================================================
-- Add verification_badge_type to the public bathroom detail view
-- 029_view_verification_badge.sql
-- ============================================================================

create or replace view public.v_bathroom_detail_public as
select
  bathrooms.id,
  bathrooms.place_name,
  bathrooms.address_line1,
  bathrooms.city,
  bathrooms.state,
  bathrooms.postal_code,
  bathrooms.country_code,
  bathrooms.latitude,
  bathrooms.longitude,
  bathrooms.is_locked,
  bathrooms.is_accessible,
  bathrooms.is_customer_only,
  bathrooms.hours_json,
  code_summary.code_id,
  code_summary.confidence_score,
  code_summary.up_votes,
  code_summary.down_votes,
  code_summary.last_verified_at,
  code_summary.expires_at,
  cleanliness_summary.cleanliness_avg,
  bathrooms.updated_at,
  bathrooms.accessibility_features,
  public.calculate_accessibility_score(
    bathrooms.is_accessible,
    bathrooms.accessibility_features
  ) as accessibility_score,
  badges.badge_type as verification_badge_type
from public.bathrooms bathrooms
left join public.v_bathroom_code_summary code_summary
  on code_summary.bathroom_id = bathrooms.id
left join public.v_bathroom_cleanliness_summary cleanliness_summary
  on cleanliness_summary.bathroom_id = bathrooms.id
left join public.business_verification_badges badges
  on badges.bathroom_id = bathrooms.id
  and (badges.expires_at is null or badges.expires_at > now())
where bathrooms.moderation_status = 'active';
