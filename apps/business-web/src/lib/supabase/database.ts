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
    };
    Returns: BusinessBathroomSettings[];
  };
};

export type BusinessWebDatabase = Omit<MobileDatabase, 'public'> & {
  public: Omit<MobileDatabase['public'], 'Functions'> & {
    Functions: BusinessWebFunctions;
  };
};
