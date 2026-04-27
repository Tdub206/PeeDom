import type {
  BusinessBathroomSettings,
  BusinessDashboardBathroom,
  Database as MobileDatabase,
} from '@mobile/types/index';

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
  public: Omit<MobileDatabase['public'], 'Functions'> & {
    Functions: BusinessWebFunctions;
  };
};
