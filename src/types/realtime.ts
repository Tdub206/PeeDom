import type { Database } from './database';

export type ChannelStatus =
  | 'SUBSCRIBING'
  | 'SUBSCRIBED'
  | 'UNSUBSCRIBING'
  | 'CLOSED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT';

export type RealtimeConnectionState = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';

export interface ChannelRegistration {
  channelName: string;
  status: ChannelStatus;
  subscribedAt: string | null;
  errorCount: number;
  lastErrorAt: string | null;
  refCount: number;
}

export type PostgresEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface PostgresChangePayload<T extends Record<string, unknown>> {
  eventType: PostgresEventType;
  schema: string;
  table: string;
  new: T | null;
  old: Partial<T> | null;
  commit_timestamp: string;
  errors: string[] | null;
}

export type BathroomRealtimeRow = Database['public']['Tables']['bathrooms']['Row'];
export type BathroomAccessCodeRealtimeRow = Database['public']['Tables']['bathroom_access_codes']['Row'];
export type CodeVoteRealtimeRow = Database['public']['Tables']['code_votes']['Row'];
export type CleanlinessRatingRealtimeRow = Database['public']['Tables']['cleanliness_ratings']['Row'];
export type BathroomStatusRealtimeRow = Database['public']['Tables']['bathroom_status_events']['Row'];
export type FavoriteRealtimeRow = Database['public']['Tables']['favorites']['Row'];

export type BathroomChangePayload = PostgresChangePayload<BathroomRealtimeRow>;
export type CodeChangePayload = PostgresChangePayload<BathroomAccessCodeRealtimeRow>;
export type CodeVoteChangePayload = PostgresChangePayload<CodeVoteRealtimeRow>;
export type CleanlinessRatingChangePayload = PostgresChangePayload<CleanlinessRatingRealtimeRow>;
export type BathroomStatusChangePayload = PostgresChangePayload<BathroomStatusRealtimeRow>;
export type FavoriteChangePayload = PostgresChangePayload<FavoriteRealtimeRow>;

export interface BathroomPresenceState {
  bathroom_id: string;
  user_id: string;
  joined_at: string;
  is_anonymous: boolean;
}

export interface PresenceSync {
  bathroom_id: string;
  viewer_count: number;
  viewers: BathroomPresenceState[];
}

export interface RealtimeStoreState {
  connectionState: RealtimeConnectionState;
  channels: Record<string, ChannelRegistration>;
  lastConnectedAt: string | null;
  reconnectAttempts: number;
  isAppInForeground: boolean;
  pendingResubscriptions: string[];
}

export type RealtimeSyncState = 'optimistic' | 'confirmed' | 'conflict' | 'stale';
