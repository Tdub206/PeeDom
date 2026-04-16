// Database schema types - generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          role: 'user' | 'business' | 'admin'
          points_balance: number
          is_premium: boolean
          premium_expires_at: string | null
          is_suspended: boolean
          is_deactivated: boolean
          deactivated_at: string | null
          display_name_updated_at: string | null
          current_streak: number
          longest_streak: number
          last_contribution_date: string | null
          streak_multiplier: number
          streak_multiplier_expires_at: string | null
          push_token: string | null
          push_enabled: boolean
          notification_prefs: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          role?: 'user' | 'business' | 'admin'
          points_balance?: number
          is_premium?: boolean
          premium_expires_at?: string | null
          is_suspended?: boolean
          is_deactivated?: boolean
          deactivated_at?: string | null
          display_name_updated_at?: string | null
          current_streak?: number
          longest_streak?: number
          last_contribution_date?: string | null
          streak_multiplier?: number
          streak_multiplier_expires_at?: string | null
          push_token?: string | null
          push_enabled?: boolean
          notification_prefs?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          role?: 'user' | 'business' | 'admin'
          points_balance?: number
          is_premium?: boolean
          premium_expires_at?: string | null
          is_suspended?: boolean
          is_deactivated?: boolean
          deactivated_at?: string | null
          display_name_updated_at?: string | null
          current_streak?: number
          longest_streak?: number
          last_contribution_date?: string | null
          streak_multiplier?: number
          streak_multiplier_expires_at?: string | null
          push_token?: string | null
          push_enabled?: boolean
          notification_prefs?: Json
          created_at?: string
          updated_at?: string
        }
      }
      point_events: {
        Row: {
          id: string
          user_id: string
          event_type:
            | 'bathroom_added'
            | 'bathroom_photo_uploaded'
            | 'code_submitted'
            | 'code_verification'
            | 'report_resolved'
            | 'code_milestone'
            | 'premium_redeemed'
            | 'ad_watched'
            | 'points_spent'
          reference_table: string
          reference_id: string
          points_awarded: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type:
            | 'bathroom_added'
            | 'bathroom_photo_uploaded'
            | 'code_submitted'
            | 'code_verification'
            | 'report_resolved'
            | 'code_milestone'
            | 'premium_redeemed'
            | 'ad_watched'
            | 'points_spent'
          reference_table: string
          reference_id: string
          points_awarded: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?:
            | 'bathroom_added'
            | 'bathroom_photo_uploaded'
            | 'code_submitted'
            | 'code_verification'
            | 'report_resolved'
            | 'code_milestone'
            | 'premium_redeemed'
            | 'ad_watched'
            | 'points_spent'
          reference_table?: string
          reference_id?: string
          points_awarded?: number
          metadata?: Json
          created_at?: string
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_key: string
          badge_name: string
          badge_description: string
          badge_category: 'milestone' | 'streak' | 'time' | 'accessibility' | 'city'
          context_city_slug: string | null
          awarded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_key: string
          badge_name: string
          badge_description: string
          badge_category: 'milestone' | 'streak' | 'time' | 'accessibility' | 'city'
          context_city_slug?: string | null
          awarded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_key?: string
          badge_name?: string
          badge_description?: string
          badge_category?: 'milestone' | 'streak' | 'time' | 'accessibility' | 'city'
          context_city_slug?: string | null
          awarded_at?: string
        }
      }
      code_reveal_grants: {
        Row: {
          id: string
          bathroom_id: string
          user_id: string
          grant_source: 'rewarded_ad'
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          user_id: string
          grant_source?: 'rewarded_ad'
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          user_id?: string
          grant_source?: 'rewarded_ad'
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      bathrooms: {
        Row: {
          id: string
          place_name: string
          address_line1: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country_code: string
          latitude: number
          longitude: number
          is_locked: boolean | null
          is_accessible: boolean | null
          is_customer_only: boolean
          accessibility_features: Json
          hours_json: Json | null
          search_vector: unknown | null
          source_type: 'community' | 'business' | 'imported' | 'admin'
          access_type: 'public' | 'code' | 'purchase_required' | 'key' | 'nfc_future'
          hardware_ready: boolean
          partner_lock_vendor_id: string | null
          dwell_time_avg_seconds: number | null
          peak_usage_jsonb: Json
          moderation_status: 'active' | 'flagged' | 'hidden' | 'deleted' | 'unverified'
          show_on_free_map: boolean
          hours_source: 'manual' | 'google' | 'preset_offset'
          hours_offset_minutes: number | null
          google_place_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          place_name: string
          address_line1?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country_code?: string
          latitude: number
          longitude: number
          is_locked?: boolean | null
          is_accessible?: boolean | null
          is_customer_only?: boolean
          accessibility_features?: Json
          hours_json?: Json | null
          search_vector?: unknown | null
          source_type?: 'community' | 'business' | 'imported' | 'admin'
          access_type?: 'public' | 'code' | 'purchase_required' | 'key' | 'nfc_future'
          hardware_ready?: boolean
          partner_lock_vendor_id?: string | null
          dwell_time_avg_seconds?: number | null
          peak_usage_jsonb?: Json
          moderation_status?: 'active' | 'flagged' | 'hidden' | 'deleted' | 'unverified'
          show_on_free_map?: boolean
          hours_source?: 'manual' | 'google' | 'preset_offset'
          hours_offset_minutes?: number | null
          google_place_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          place_name?: string
          address_line1?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country_code?: string
          latitude?: number
          longitude?: number
          is_locked?: boolean | null
          is_accessible?: boolean | null
          is_customer_only?: boolean
          accessibility_features?: Json
          hours_json?: Json | null
          search_vector?: unknown | null
          source_type?: 'community' | 'business' | 'imported' | 'admin'
          access_type?: 'public' | 'code' | 'purchase_required' | 'key' | 'nfc_future'
          hardware_ready?: boolean
          partner_lock_vendor_id?: string | null
          dwell_time_avg_seconds?: number | null
          peak_usage_jsonb?: Json
          moderation_status?: 'active' | 'flagged' | 'hidden' | 'deleted' | 'unverified'
          show_on_free_map?: boolean
          hours_source?: 'manual' | 'google' | 'preset_offset'
          hours_offset_minutes?: number | null
          google_place_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bathroom_photos: {
        Row: {
          id: string
          bathroom_id: string
          uploaded_by: string
          storage_bucket: string
          storage_path: string
          content_type: string
          file_size_bytes: number | null
          width: number | null
          height: number | null
          is_primary: boolean
          photo_type: 'exterior' | 'interior' | 'keypad' | 'sign'
          moderation_status: 'approved' | 'pending' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          uploaded_by: string
          storage_bucket?: string
          storage_path: string
          content_type: string
          file_size_bytes?: number | null
          width?: number | null
          height?: number | null
          is_primary?: boolean
          photo_type?: 'exterior' | 'interior' | 'keypad' | 'sign'
          moderation_status?: 'approved' | 'pending' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          uploaded_by?: string
          storage_bucket?: string
          storage_path?: string
          content_type?: string
          file_size_bytes?: number | null
          width?: number | null
          height?: number | null
          is_primary?: boolean
          photo_type?: 'exterior' | 'interior' | 'keypad' | 'sign'
          moderation_status?: 'approved' | 'pending' | 'rejected'
          created_at?: string
        }
      }
      bathroom_access_codes: {
        Row: {
          id: string
          bathroom_id: string
          submitted_by: string
          code_value: string
          confidence_score: number
          up_votes: number
          down_votes: number
          last_verified_at: string | null
          expires_at: string | null
          visibility_status: 'visible' | 'needs_review' | 'removed'
          lifecycle_status: 'active' | 'expired' | 'superseded'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          submitted_by: string
          code_value: string
          confidence_score?: number
          up_votes?: number
          down_votes?: number
          last_verified_at?: string | null
          expires_at?: string | null
          visibility_status?: 'visible' | 'needs_review' | 'removed'
          lifecycle_status?: 'active' | 'expired' | 'superseded'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          submitted_by?: string
          code_value?: string
          confidence_score?: number
          up_votes?: number
          down_votes?: number
          last_verified_at?: string | null
          expires_at?: string | null
          visibility_status?: 'visible' | 'needs_review' | 'removed'
          lifecycle_status?: 'active' | 'expired' | 'superseded'
          created_at?: string
          updated_at?: string
        }
      }
      code_votes: {
        Row: {
          id: string
          code_id: string
          user_id: string
          vote: -1 | 1
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code_id: string
          user_id: string
          vote: -1 | 1
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code_id?: string
          user_id?: string
          vote?: -1 | 1
          created_at?: string
          updated_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          bathroom_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bathroom_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bathroom_id?: string
          created_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          bathroom_id: string
          subscribed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bathroom_id: string
          subscribed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bathroom_id?: string
          subscribed_at?: string
        }
      }
      bathroom_status_events: {
        Row: {
          id: string
          bathroom_id: string
          reported_by: string
          status: 'clean' | 'dirty' | 'closed' | 'out_of_order' | 'long_wait'
          note: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          reported_by: string
          status: 'clean' | 'dirty' | 'closed' | 'out_of_order' | 'long_wait'
          note?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          reported_by?: string
          status?: 'clean' | 'dirty' | 'closed' | 'out_of_order' | 'long_wait'
          note?: string | null
          expires_at?: string
          created_at?: string
        }
      }
      premium_arrival_alerts: {
        Row: {
          id: string
          user_id: string
          bathroom_id: string
          target_arrival_at: string
          lead_minutes: 15 | 30 | 60
          status: 'active' | 'cancelled' | 'expired'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bathroom_id: string
          target_arrival_at: string
          lead_minutes?: 15 | 30 | 60
          status?: 'active' | 'cancelled' | 'expired'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bathroom_id?: string
          target_arrival_at?: string
          lead_minutes?: 15 | 30 | 60
          status?: 'active' | 'cancelled' | 'expired'
          created_at?: string
          updated_at?: string
        }
      }
      bathroom_reports: {
        Row: {
          id: string
          bathroom_id: string
          reported_by: string
          report_type: 'wrong_code' | 'closed' | 'unsafe' | 'duplicate' | 'incorrect_hours' | 'no_restroom' | 'other'
          notes: string | null
          status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          reported_by: string
          report_type: 'wrong_code' | 'closed' | 'unsafe' | 'duplicate' | 'incorrect_hours' | 'no_restroom' | 'other'
          notes?: string | null
          status?: 'open' | 'reviewing' | 'resolved' | 'dismissed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          reported_by?: string
          report_type?: 'wrong_code' | 'closed' | 'unsafe' | 'duplicate' | 'incorrect_hours' | 'no_restroom' | 'other'
          notes?: string | null
          status?: 'open' | 'reviewing' | 'resolved' | 'dismissed'
          created_at?: string
          updated_at?: string
        }
      }
      cleanliness_ratings: {
        Row: {
          id: string
          bathroom_id: string
          user_id: string
          rating: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          user_id: string
          rating: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          user_id?: string
          rating?: number
          notes?: string | null
          created_at?: string
        }
      }
      business_claims: {
        Row: {
          id: string
          bathroom_id: string
          claimant_user_id: string
          business_name: string
          contact_email: string
          contact_phone: string | null
          evidence_url: string | null
          review_status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          is_lifetime_free: boolean
          invite_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          claimant_user_id: string
          business_name: string
          contact_email: string
          contact_phone?: string | null
          evidence_url?: string | null
          review_status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          is_lifetime_free?: boolean
          invite_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          claimant_user_id?: string
          business_name?: string
          contact_email?: string
          contact_phone?: string | null
          evidence_url?: string | null
          review_status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          is_lifetime_free?: boolean
          invite_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      business_verification_badges: {
        Row: {
          id: string
          bathroom_id: string
          claim_id: string
          verified_at: string
          verified_by: string | null
          badge_type: 'standard' | 'premium' | 'featured'
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          claim_id: string
          verified_at?: string
          verified_by?: string | null
          badge_type?: 'standard' | 'premium' | 'featured'
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          claim_id?: string
          verified_at?: string
          verified_by?: string | null
          badge_type?: 'standard' | 'premium' | 'featured'
          expires_at?: string | null
          created_at?: string
        }
      }
      business_featured_placements: {
        Row: {
          id: string
          bathroom_id: string
          business_user_id: string
          placement_type: 'search_top' | 'map_priority' | 'nearby_featured'
          geographic_scope: Json
          start_date: string
          end_date: string
          impressions_count: number
          clicks_count: number
          status: 'active' | 'paused' | 'expired' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          business_user_id: string
          placement_type: 'search_top' | 'map_priority' | 'nearby_featured'
          geographic_scope: Json
          start_date: string
          end_date: string
          impressions_count?: number
          clicks_count?: number
          status?: 'active' | 'paused' | 'expired' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          business_user_id?: string
          placement_type?: 'search_top' | 'map_priority' | 'nearby_featured'
          geographic_scope?: Json
          start_date?: string
          end_date?: string
          impressions_count?: number
          clicks_count?: number
          status?: 'active' | 'paused' | 'expired' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      business_hours_updates: {
        Row: {
          id: string
          bathroom_id: string
          updated_by: string
          old_hours: Json | null
          new_hours: Json
          update_source:
            | 'business_dashboard'
            | 'admin_panel'
            | 'community_report'
            | 'manual'
            | 'google'
            | 'preset_offset'
          created_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          updated_by: string
          old_hours?: Json | null
          new_hours: Json
          update_source:
            | 'business_dashboard'
            | 'admin_panel'
            | 'community_report'
            | 'manual'
            | 'google'
            | 'preset_offset'
          created_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          updated_by?: string
          old_hours?: Json | null
          new_hours?: Json
          update_source?:
            | 'business_dashboard'
            | 'admin_panel'
            | 'community_report'
            | 'manual'
            | 'google'
            | 'preset_offset'
          created_at?: string
        }
      }
      user_accessibility_preferences: {
        Row: {
          id: string
          user_id: string
          accessibility_mode_enabled: boolean
          require_grab_bars: boolean
          require_automatic_door: boolean
          require_gender_neutral: boolean
          require_family_restroom: boolean
          require_changing_table: boolean
          min_door_width_inches: number | null
          min_stall_width_inches: number | null
          prioritize_accessible: boolean
          hide_non_accessible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          accessibility_mode_enabled?: boolean
          require_grab_bars?: boolean
          require_automatic_door?: boolean
          require_gender_neutral?: boolean
          require_family_restroom?: boolean
          require_changing_table?: boolean
          min_door_width_inches?: number | null
          min_stall_width_inches?: number | null
          prioritize_accessible?: boolean
          hide_non_accessible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          accessibility_mode_enabled?: boolean
          require_grab_bars?: boolean
          require_automatic_door?: boolean
          require_gender_neutral?: boolean
          require_family_restroom?: boolean
          require_changing_table?: boolean
          min_door_width_inches?: number | null
          min_stall_width_inches?: number | null
          prioritize_accessible?: boolean
          hide_non_accessible?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bathroom_stallpass_visits: {
        Row: {
          id: string
          bathroom_id: string
          user_id: string
          visited_at: string
          source: 'map_navigation' | 'search' | 'favorite' | 'coupon_redeem' | 'deep_link'
          created_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          user_id: string
          visited_at?: string
          source?: 'map_navigation' | 'search' | 'favorite' | 'coupon_redeem' | 'deep_link'
          created_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          user_id?: string
          visited_at?: string
          source?: 'map_navigation' | 'search' | 'favorite' | 'coupon_redeem' | 'deep_link'
          created_at?: string
        }
      }
      business_coupons: {
        Row: {
          id: string
          bathroom_id: string
          business_user_id: string
          title: string
          description: string | null
          coupon_type: 'percent_off' | 'dollar_off' | 'bogo' | 'free_item' | 'custom'
          value: number | null
          min_purchase: number | null
          coupon_code: string
          max_redemptions: number | null
          current_redemptions: number
          starts_at: string
          expires_at: string | null
          is_active: boolean
          premium_only: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bathroom_id: string
          business_user_id: string
          title: string
          description?: string | null
          coupon_type: 'percent_off' | 'dollar_off' | 'bogo' | 'free_item' | 'custom'
          value?: number | null
          min_purchase?: number | null
          coupon_code: string
          max_redemptions?: number | null
          current_redemptions?: number
          starts_at?: string
          expires_at?: string | null
          is_active?: boolean
          premium_only?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bathroom_id?: string
          business_user_id?: string
          title?: string
          description?: string | null
          coupon_type?: 'percent_off' | 'dollar_off' | 'bogo' | 'free_item' | 'custom'
          value?: number | null
          min_purchase?: number | null
          coupon_code?: string
          max_redemptions?: number | null
          current_redemptions?: number
          starts_at?: string
          expires_at?: string | null
          is_active?: boolean
          premium_only?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      coupon_redemptions: {
        Row: {
          id: string
          coupon_id: string
          user_id: string
          redeemed_at: string
        }
        Insert: {
          id?: string
          coupon_id: string
          user_id: string
          redeemed_at?: string
        }
        Update: {
          id?: string
          coupon_id?: string
          user_id?: string
          redeemed_at?: string
        }
      }
      early_adopter_invites: {
        Row: {
          id: string
          invite_token: string
          invited_by: string
          target_email: string | null
          target_business_name: string | null
          notes: string | null
          expires_at: string
          redeemed_by: string | null
          redeemed_at: string | null
          grants_lifetime: boolean
          status: 'pending' | 'redeemed' | 'expired' | 'revoked'
          created_at: string
        }
        Insert: {
          id?: string
          invite_token: string
          invited_by: string
          target_email?: string | null
          target_business_name?: string | null
          notes?: string | null
          expires_at: string
          redeemed_by?: string | null
          redeemed_at?: string | null
          grants_lifetime?: boolean
          status?: 'pending' | 'redeemed' | 'expired' | 'revoked'
          created_at?: string
        }
        Update: {
          id?: string
          invite_token?: string
          invited_by?: string
          target_email?: string | null
          target_business_name?: string | null
          notes?: string | null
          expires_at?: string
          redeemed_by?: string | null
          redeemed_at?: string | null
          grants_lifetime?: boolean
          status?: 'pending' | 'redeemed' | 'expired' | 'revoked'
          created_at?: string
        }
      }
    }
    Views: {
      v_bathrooms_public: {
        Row: {
          id: string
          place_name: string
          address_line1: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country_code: string
          latitude: number
          longitude: number
          is_locked: boolean | null
          is_accessible: boolean | null
          is_customer_only: boolean
          hours_json: Json | null
          updated_at: string
        }
      }
      v_bathroom_code_summary: {
        Row: {
          bathroom_id: string
          code_id: string
          confidence_score: number
          up_votes: number
          down_votes: number
          last_verified_at: string | null
          expires_at: string | null
          lifecycle_status: string
          visibility_status: string
        }
      }
      v_bathroom_detail_public: {
        Row: {
          id: string
          place_name: string
          address_line1: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country_code: string
          latitude: number
          longitude: number
          is_locked: boolean | null
          is_accessible: boolean | null
          is_customer_only: boolean
          accessibility_features: Json
          accessibility_score: number
          hours_json: Json | null
          code_id: string | null
          confidence_score: number | null
          up_votes: number | null
          down_votes: number | null
          last_verified_at: string | null
          expires_at: string | null
          cleanliness_avg: number | null
          updated_at: string
        }
      }
    }
    Functions: {
      expire_stale_bathroom_access_codes: {
        Args: Record<PropertyKey, never>
        Returns: {
          code_id: string
          bathroom_id: string
        }[]
      }
      get_revealed_bathroom_code: {
        Args: {
          p_bathroom_id: string
        }
        Returns: {
          id: string
          bathroom_id: string
          submitted_by: string
          code_value: string
          confidence_score: number
          up_votes: number
          down_votes: number
          last_verified_at: string | null
          expires_at: string | null
          visibility_status: 'visible' | 'needs_review' | 'removed'
          lifecycle_status: 'active' | 'expired' | 'superseded'
          created_at: string
          updated_at: string
        }[]
      }
      get_contributor_leaderboard: {
        Args: {
          p_scope?: string
          p_timeframe?: string
          p_state?: string | null
          p_city?: string | null
          p_limit?: number
        }
        Returns: {
          user_id: string
          display_name: string
          total_points: number
          bathrooms_added: number
          codes_submitted: number
          verifications: number
          photos_uploaded: number
          reports_resolved: number
          leaderboard_scope: string
          scope_label: string
          rank: number
        }[]
      }
      get_my_gamification_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_bathrooms_added: number
          total_codes_submitted: number
          total_code_verifications: number
          total_reports_filed: number
          total_photos_uploaded: number
          total_badges: number
          primary_city: string | null
          primary_state: string | null
        }[]
      }
      grant_bathroom_code_reveal_access: {
        Args: {
          p_bathroom_id: string
        }
        Returns: {
          id: string
          bathroom_id: string
          user_id: string
          grant_source: 'rewarded_ad'
          expires_at: string
          created_at: string
          updated_at: string
        }[]
      }
      get_bathrooms_near: {
        Args: {
          lat: number
          lng: number
          radius_m?: number
        }
        Returns: {
          id: string
          place_name: string
          address_line1: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country_code: string
          latitude: number
            longitude: number
            is_locked: boolean | null
            is_accessible: boolean | null
            is_customer_only: boolean
            accessibility_features: Json
            accessibility_score: number
            hours_json: Json | null
            code_id: string | null
          confidence_score: number | null
          up_votes: number | null
          down_votes: number | null
          last_verified_at: string | null
          expires_at: string | null
          cleanliness_avg: number | null
          updated_at: string
          distance_meters: number
        }[]
      }
      search_bathrooms: {
        Args: {
          p_query: string
          p_user_lat?: number | null
          p_user_lng?: number | null
          p_limit?: number
        }
        Returns: {
          id: string
          place_name: string
          address_line1: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country_code: string
          latitude: number
            longitude: number
            is_locked: boolean | null
            is_accessible: boolean | null
            is_customer_only: boolean
            accessibility_features: Json
            accessibility_score: number
            hours_json: Json | null
            code_id: string | null
          confidence_score: number | null
          up_votes: number | null
          down_votes: number | null
          last_verified_at: string | null
          expires_at: string | null
          cleanliness_avg: number | null
          updated_at: string
          distance_meters: number | null
          rank: number
        }[]
      }
      get_city_browse: {
        Args: {
          p_limit?: number
        }
        Returns: {
          city: string
          state: string
          bathroom_count: number
        }[]
      }
      get_premium_city_packs: {
        Args: {
          p_limit?: number
        }
        Returns: {
          slug: string
          city: string
          state: string
          country_code: string
          bathroom_count: number
          center_latitude: number
          center_longitude: number
          min_latitude: number
          max_latitude: number
          min_longitude: number
          max_longitude: number
          latest_bathroom_update_at: string
          latest_code_verified_at: string | null
        }[]
      }
      get_premium_city_pack_bathrooms: {
        Args: {
          p_city: string
          p_state: string
          p_country_code?: string | null
        }
        Returns: {
          id: string
          place_name: string
          address_line1: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country_code: string
          latitude: number
          longitude: number
          is_locked: boolean | null
          is_accessible: boolean | null
          is_customer_only: boolean
          accessibility_features: Json
          accessibility_score: number
          hours_json: Json | null
          code_id: string | null
          confidence_score: number | null
          up_votes: number | null
          down_votes: number | null
          last_verified_at: string | null
          expires_at: string | null
          cleanliness_avg: number | null
          updated_at: string
        }[]
      }
      get_user_favorites: {
        Args: {
          p_user_lat?: number | null
          p_user_lng?: number | null
        }
        Returns: {
          id: string
          place_name: string
          address_line1: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country_code: string
          latitude: number
          longitude: number
          is_locked: boolean | null
          is_accessible: boolean | null
          is_customer_only: boolean
          accessibility_features: Json
          accessibility_score: number
          hours_json: Json | null
          code_id: string | null
          confidence_score: number | null
          up_votes: number | null
          down_votes: number | null
          last_verified_at: string | null
          expires_at: string | null
          cleanliness_avg: number | null
          updated_at: string
          distance_meters: number | null
          favorited_at: string
        }[]
      }
      get_favorites_with_detail: {
        Args: {
          p_user_id: string
          p_latitude?: number | null
          p_longitude?: number | null
          p_sort_by?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          place_name: string
          address_line1: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country_code: string
          latitude: number
          longitude: number
          is_locked: boolean | null
          is_accessible: boolean | null
          is_customer_only: boolean
          accessibility_features: Json
          accessibility_score: number
          hours_json: Json | null
          code_id: string | null
          confidence_score: number | null
          up_votes: number | null
          down_votes: number | null
          last_verified_at: string | null
          expires_at: string | null
          cleanliness_avg: number | null
          updated_at: string
          distance_meters: number | null
          favorited_at: string
        }[]
      }
      get_favorite_ids: {
        Args: {
          p_user_id: string
          p_bathroom_ids: string[]
        }
        Returns: {
          bathroom_id: string
        }[]
      }
      toggle_favorite: {
        Args: {
          p_bathroom_id: string
        }
        Returns: Json
      }
      upsert_premium_arrival_alert: {
        Args: {
          p_bathroom_id: string
          p_target_arrival_at: string
          p_lead_minutes?: number
        }
        Returns: {
          id: string
          user_id: string
          bathroom_id: string
          target_arrival_at: string
          lead_minutes: 15 | 30 | 60
          status: 'active' | 'cancelled' | 'expired'
          created_at: string
          updated_at: string
        }[]
      }
      cancel_premium_arrival_alert: {
        Args: {
          p_bathroom_id: string
        }
        Returns: void
      }
      get_arrival_alert_recipients: {
        Args: {
          p_bathroom_id: string
        }
        Returns: {
          user_id: string
          push_token: string
        }[]
      }
      has_bathroom_code_reveal_access: {
        Args: {
          p_bathroom_id: string
        }
        Returns: boolean
      }
      redeem_points_for_premium: {
        Args: {
          p_months?: number
        }
        Returns: {
          user_id: string
          months_redeemed: number
          points_spent: number
          remaining_points: number
          premium_expires_at: string
          is_premium: boolean
        }[]
      }
      get_business_dashboard_analytics: {
        Args: {
          p_user_id: string
        }
        Returns: {
          bathroom_id: string
          claim_id: string | null
          place_name: string
          business_name: string | null
          total_favorites: number
          open_reports: number
          avg_cleanliness: number
          total_ratings: number
          weekly_views: number
          verification_badge_type: 'standard' | 'premium' | 'featured' | null
          has_verification_badge: boolean
          has_active_featured_placement: boolean
          active_featured_placements: number
          last_updated: string
          show_on_free_map: boolean
        }[]
      }
      update_business_bathroom_hours: {
        Args: {
          p_bathroom_id: string
          p_new_hours: Json
        }
        Returns: Json
      }
      user_can_manage_business_bathroom: {
        Args: {
          p_user_id: string
          p_bathroom_id: string
        }
        Returns: boolean
      }
      user_has_business_dashboard_access: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      }
      refresh_business_analytics: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      register_push_token: {
        Args: {
          p_token: string
        }
        Returns: void
      }
      clear_push_token: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      update_notification_settings: {
        Args: {
          p_push_enabled?: boolean | null
          p_notification_prefs?: Json | null
        }
        Returns: Json
      }
      update_display_name: {
        Args: {
          p_display_name: string
        }
        Returns: Json
      }
      deactivate_account: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_bathroom_submission: {
        Args: {
          p_place_name: string
          p_address_line1?: string | null
          p_city?: string | null
          p_state?: string | null
          p_postal_code?: string | null
          p_country_code?: string | null
          p_latitude: number
          p_longitude: number
          p_is_locked?: boolean | null
          p_is_accessible?: boolean | null
          p_is_customer_only?: boolean | null
        }
        Returns: Json
      }
      submit_bathroom_access_code: {
        Args: {
          p_bathroom_id: string
          p_code_value: string
        }
        Returns: Json
      }
      vote_on_code: {
        Args: {
          p_code_id: string
          p_vote: number
        }
        Returns: Json
      }
      create_bathroom_report: {
        Args: {
          p_bathroom_id: string
          p_report_type: string
          p_notes?: string | null
        }
        Returns: Json
      }
      upsert_cleanliness_rating: {
        Args: {
          p_bathroom_id: string
          p_rating: number
          p_notes?: string | null
        }
        Returns: Json
      }
      get_subscribers_for_bathroom: {
        Args: {
          p_bathroom_id: string
        }
        Returns: {
          user_id: string
          push_token: string
        }[]
      }
      report_bathroom_status: {
        Args: {
          p_bathroom_id: string
          p_status: string
          p_note?: string | null
        }
        Returns: Json
      }
      get_user_trust_tier: {
        Args: {
          p_user_id?: string | null
        }
        Returns: {
          user_id: string
          contributor_trust_tier: 'brand_new' | 'lightly_trusted' | 'verified_contributor' | 'highly_reliable_local' | 'business_verified_manager' | 'flagged_low_trust'
          normalized_tier: 'newcomer' | 'normal' | 'power'
          trust_score: number
          trust_weight: number
          shadow_banned: boolean
          fraud_flags: Json
          device_account_count: number
          last_calculated_at: string
        }[]
      }
      calculate_prediction_confidence: {
        Args: {
          p_bathroom_id: string
          p_reference_hour?: number | null
        }
        Returns: {
          bathroom_id: string
          predicted_access_confidence: number
          prediction_confidence: number
          busy_level: 'unknown' | 'quiet' | 'moderate' | 'busy'
          best_visit_hour: number | null
          signal_count: number
          recommended_copy: string
          generated_at: string
        }[]
      }
      track_event_batch: {
        Args: {
          p_events: Json
        }
        Returns: Json
      }
      upsert_bathroom_accessibility_features: {
        Args: {
          p_bathroom_id: string
          p_accessibility_features: Json
        }
        Returns: {
          bathroom_id: string
          accessibility_features: Json
          is_accessible: boolean
          accessibility_score: number
          updated_at: string
        }[]
      }
    }
    Enums: {}
  }
}
