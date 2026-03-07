// Database types
export interface Bathroom {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  is_locked: boolean;
  is_accessible: boolean;
  is_customer_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessCode {
  id: string;
  bathroom_id: string;
  code: string;
  verified_at: string | null;
  upvotes: number;
  downvotes: number;
  confidence_score: number;
  created_at: string;
}

export interface BathroomDetail extends Bathroom {
  primary_code: AccessCode | null;
  total_codes: number;
  user_favorite: boolean;
  distance_meters?: number;
}

// API Response types
export interface ApiResponse<T> {
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

// Offline queue types
export interface QueuedMutation {
  id: string;
  type: 'favorite' | 'vote' | 'report' | 'submit_code';
  payload: unknown;
  created_at: string;
  retry_count: number;
}

// User types
export interface UserProfile {
  id: string;
  email: string;
  points: number;
  is_premium: boolean;
  created_at: string;
}

// Navigation types
export type RootStackParamList = {
  '(tabs)': undefined;
  '(auth)': undefined;
  'bathroom/[id]': { id: string };
};
