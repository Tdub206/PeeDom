import type {
  BathroomAccessibilityDetails,
  BathroomNeedMetadata,
  BusinessBathroomSettings,
  BusinessDashboardBathroom,
  Database as MobileDatabase,
} from '@mobile/types/index';

type RestroomIntelligenceTables = {
  business_bathroom_settings: {
    Row: BusinessBathroomSettings;
    Insert: Omit<BusinessBathroomSettings, 'created_at' | 'updated_at'> & {
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<BusinessBathroomSettings, 'bathroom_id' | 'created_at' | 'updated_at'>>;
  };
  bathroom_need_metadata: {
    Row: BathroomNeedMetadata;
    Insert: Omit<BathroomNeedMetadata, 'created_at' | 'updated_at'> & {
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<BathroomNeedMetadata, 'bathroom_id' | 'created_at' | 'updated_at'>>;
  };
  bathroom_accessibility_details: {
    Row: BathroomAccessibilityDetails;
    Insert: Omit<BathroomAccessibilityDetails, 'created_at' | 'updated_at'> & {
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<BathroomAccessibilityDetails, 'bathroom_id' | 'created_at' | 'updated_at'>>;
  };
};

type BusinessWebTables = MobileDatabase['public']['Tables'] & RestroomIntelligenceTables;

type BusinessWebFunctions = Omit<
  MobileDatabase['public']['Functions'],
  'get_business_dashboard_analytics'
> & {
  get_business_dashboard_analytics: {
    Args: {
      p_user_id: string;
    };
    Returns: BusinessDashboardBathroom[];
  };
  upsert_business_bathroom_settings: {
    Args: {
      p_bathroom_id: string;
      p_requires_premium_access: boolean;
      p_show_on_free_map: boolean;
      p_is_location_verified: boolean;
      p_is_locked: boolean;
    };
    Returns: BusinessBathroomSettings[];
  };
  upsert_business_restroom_metadata: {
    Args: {
      p_bathroom_id: string;
      p_has_toilet_paper?: boolean | null;
      p_has_soap?: boolean | null;
      p_has_hand_dryer?: boolean | null;
      p_has_paper_towels?: boolean | null;
      p_has_changing_table?: boolean | null;
      p_has_family_restroom?: boolean | null;
      p_is_gender_neutral?: boolean | null;
      p_is_single_user?: boolean | null;
      p_is_private_room?: boolean | null;
      p_stall_count?: number | null;
      p_privacy_level?: BathroomNeedMetadata['privacy_level'];
      p_access_type?: BathroomNeedMetadata['access_type'];
      p_code_required?: boolean | null;
      p_key_required?: boolean | null;
      p_customer_only?: boolean | null;
      p_ask_employee?: boolean | null;
      p_medical_urgency_friendly?: boolean | null;
      p_child_friendly?: boolean | null;
      p_outdoor_traveler_reliable?: boolean | null;
      p_wheelchair_accessible?: boolean | null;
      p_door_clear_width_inches?: number | null;
      p_turning_space_inches?: number | null;
      p_stall_width_inches?: number | null;
      p_stall_depth_inches?: number | null;
      p_has_grab_bars?: boolean | null;
      p_has_accessible_sink?: boolean | null;
      p_has_step_free_access?: boolean | null;
      p_has_power_door?: boolean | null;
      p_accessibility_notes?: string | null;
    };
    Returns: {
      bathroom_id: string;
      claim_id: string | null;
      updated_at: string;
    };
  };
  create_business_coupon: {
    Args: {
      p_bathroom_id: string;
      p_title: string;
      p_description: string | null;
      p_coupon_type: 'percent_off' | 'dollar_off' | 'bogo' | 'free_item' | 'custom';
      p_value: number | null;
      p_min_purchase: number | null;
      p_coupon_code: string | null;
      p_max_redemptions: number | null;
      p_starts_at: string;
      p_expires_at: string | null;
      p_premium_only: boolean;
    };
    Returns: {
      success: boolean;
      coupon_id: string;
      coupon_code: string;
    };
  };
  submit_business_owner_access_code: {
    Args: { p_bathroom_id: string; p_code_value: string };
    Returns: Array<{ code_id: string; created_at: string }>;
  };
  get_business_location_codes: {
    Args: { p_bathroom_id: string };
    Returns: Array<{
      id: string;
      code_value: string;
      confidence_score: number;
      up_votes: number;
      down_votes: number;
      lifecycle_status: 'active' | 'expired' | 'superseded';
      visibility_status: 'visible' | 'needs_review' | 'removed';
      last_verified_at: string | null;
      created_at: string;
    }>;
  };
  submit_business_claim: {
    Args: {
      p_bathroom_id: string;
      p_business_name: string;
      p_contact_email: string;
      p_contact_phone: string | null;
      p_evidence_url: string | null;
      p_growth_invite_code: string | null;
    };
    Returns: Array<MobileDatabase['public']['Tables']['business_claims']['Row']>;
  };
};

export type BusinessWebDatabase = Omit<MobileDatabase, 'public'> & {
  public: Omit<MobileDatabase['public'], 'Functions' | 'Tables'> & {
    Tables: BusinessWebTables;
    Functions: BusinessWebFunctions;
  };
};
