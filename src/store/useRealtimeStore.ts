import { create } from 'zustand';
import type {
  ChannelRegistration,
  ChannelStatus,
  RealtimeConnectionState,
  RealtimeStoreState,
} from '@/types/realtime';

interface RealtimeStore extends RealtimeStoreState {
  setAppInForeground: (isAppInForeground: boolean) => void;
  setConnectionState: (connectionState: RealtimeConnectionState) => void;
  setChannelStatus: (channelName: string, status: ChannelStatus, refCount?: number) => void;
  removeChannel: (channelName: string) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setPendingResubscriptions: (channelNames: string[]) => void;
}

function buildChannelRegistration(
  channelName: string,
  status: ChannelStatus,
  previousRegistration?: ChannelRegistration,
  refCount?: number
): ChannelRegistration {
  const isErrorState = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
  const subscribedAt =
    status === 'SUBSCRIBED'
      ? new Date().toISOString()
      : previousRegistration?.subscribedAt ?? null;

  return {
    channelName,
    status,
    subscribedAt,
    errorCount: isErrorState ? (previousRegistration?.errorCount ?? 0) + 1 : previousRegistration?.errorCount ?? 0,
    lastErrorAt: isErrorState ? new Date().toISOString() : previousRegistration?.lastErrorAt ?? null,
    refCount: refCount ?? previousRegistration?.refCount ?? 1,
  };
}

export const useRealtimeStore = create<RealtimeStore>()((set) => ({
  connectionState: 'CLOSED',
  channels: {},
  lastConnectedAt: null,
  reconnectAttempts: 0,
  isAppInForeground: true,
  pendingResubscriptions: [],

  setAppInForeground: (isAppInForeground) =>
    set((state) => ({
      isAppInForeground,
      connectionState: isAppInForeground ? state.connectionState : 'CLOSING',
    })),

  setConnectionState: (connectionState) =>
    set((state) => ({
      connectionState,
      lastConnectedAt: connectionState === 'OPEN' ? new Date().toISOString() : state.lastConnectedAt,
    })),

  setChannelStatus: (channelName, status, refCount) =>
    set((state) => {
      const nextRegistration = buildChannelRegistration(channelName, status, state.channels[channelName], refCount);
      const nextConnectionState =
        status === 'SUBSCRIBED'
          ? 'OPEN'
          : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'
            ? 'CONNECTING'
            : state.connectionState;

      return {
        channels: {
          ...state.channels,
          [channelName]: nextRegistration,
        },
        connectionState: nextConnectionState,
        lastConnectedAt: nextConnectionState === 'OPEN' ? new Date().toISOString() : state.lastConnectedAt,
      };
    }),

  removeChannel: (channelName) =>
    set((state) => {
      const remainingChannels = { ...state.channels };
      delete remainingChannels[channelName];

      return {
        channels: remainingChannels,
        pendingResubscriptions: state.pendingResubscriptions.filter((name) => name !== channelName),
        connectionState:
          Object.keys(remainingChannels).length > 0
            ? state.connectionState
            : state.isAppInForeground
              ? 'CLOSED'
              : 'CLOSING',
      };
    }),

  incrementReconnectAttempts: () =>
    set((state) => ({
      reconnectAttempts: state.reconnectAttempts + 1,
    })),

  resetReconnectAttempts: () =>
    set({
      reconnectAttempts: 0,
    }),

  setPendingResubscriptions: (pendingResubscriptions) =>
    set({
      pendingResubscriptions,
    }),
}));

export const selectIsConnected = (state: RealtimeStore): boolean =>
  state.connectionState === 'OPEN';

export const selectHasAnyChannelError = (state: RealtimeStore): boolean =>
  Object.values(state.channels).some(
    (registration) =>
      registration.status === 'CHANNEL_ERROR' || registration.status === 'TIMED_OUT'
  );

export const selectTrackedChannelCount = (state: RealtimeStore): number =>
  Object.keys(state.channels).length;

export const selectChannelStatus =
  (channelName: string) =>
  (state: RealtimeStore): ChannelStatus | undefined =>
    state.channels[channelName]?.status;
