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
          is_suspended: boolean
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
          is_suspended?: boolean
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
          is_suspended?: boolean
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
          hours_json: Json | null
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
          hours_json?: Json | null
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
          hours_json?: Json | null
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
          hours_json: Json | null
          code_id: string | null
          confidence_score: number | null
          up_votes: number | null
          down_votes: number | null
          last_verified_at: string | null
          expires_at: string | null
          updated_at: string
        }
      }
    }
    Functions: {
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
          hours_json: Json | null
          code_id: string | null
          confidence_score: number | null
          up_votes: number | null
          down_votes: number | null
          last_verified_at: string | null
          expires_at: string | null
          updated_at: string
          distance_meters: number
        }[]
      }
    }
    Enums: {}
  }
}
