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
          moderation_status: 'active' | 'flagged' | 'hidden' | 'deleted' | 'unverified'
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
          moderation_status?: 'active' | 'flagged' | 'hidden' | 'deleted' | 'unverified'
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
          moderation_status?: 'active' | 'flagged' | 'hidden' | 'deleted' | 'unverified'
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
          created_at?: string
          updated_at?: string
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
    }
    Enums: {}
  }
}
