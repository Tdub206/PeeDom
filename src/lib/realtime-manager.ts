import { AppState, type AppStateStatus } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import { useRealtimeStore } from '@/store/useRealtimeStore';
import type { ChannelRegistration, ChannelStatus } from '@/types/realtime';

type RealtimeCallback = () => void;
type ChannelConfigurator = (channel: RealtimeChannel) => RealtimeChannel;
type ChannelStatusCallback = (status: ChannelStatus, channel: RealtimeChannel) => void;

interface ChannelEntry extends ChannelRegistration {
  channel: RealtimeChannel;
  configure: ChannelConfigurator;
  onStatusChange?: ChannelStatusCallback;
}

function isChannelErrorStatus(status: ChannelStatus): boolean {
  return status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
}

const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const RECONNECT_JITTER_MS = 500;

function computeReconnectDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt),
    MAX_RECONNECT_DELAY_MS
  );
  const jitter = Math.random() * RECONNECT_JITTER_MS;
  return exponentialDelay + jitter;
}

export class RealtimeManager {
  private channelRegistry = new Map<string, ChannelEntry>();
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private isInForeground = AppState.currentState === 'active';
  private foregroundCallbacks = new Set<RealtimeCallback>();
  private backgroundCallbacks = new Set<RealtimeCallback>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    useRealtimeStore.getState().setAppInForeground(this.isInForeground);
    this.initializeAppStateListener();
  }

  subscribe(
    channelName: string,
    configure: ChannelConfigurator,
    onStatusChange?: ChannelStatusCallback
  ): RealtimeChannel {
    const existingEntry = this.channelRegistry.get(channelName);

    if (existingEntry) {
      existingEntry.refCount += 1;
      existingEntry.onStatusChange = onStatusChange ?? existingEntry.onStatusChange;
      this.channelRegistry.set(channelName, existingEntry);
      useRealtimeStore.getState().setChannelStatus(channelName, existingEntry.status, existingEntry.refCount);
      return existingEntry.channel;
    }

    useRealtimeStore.getState().setConnectionState('CONNECTING');
    const entry = this.createEntry(channelName, configure, 1, onStatusChange);
    this.channelRegistry.set(channelName, entry);
    return entry.channel;
  }

  async unregister(channelName: string): Promise<void> {
    const entry = this.channelRegistry.get(channelName);

    if (!entry) {
      return;
    }

    if (entry.refCount > 1) {
      entry.refCount -= 1;
      this.channelRegistry.set(channelName, entry);
      useRealtimeStore.getState().setChannelStatus(channelName, entry.status, entry.refCount);
      return;
    }

    try {
      useRealtimeStore.getState().setChannelStatus(channelName, 'UNSUBSCRIBING', 0);
      await getSupabaseClient().removeChannel(entry.channel);
    } catch (error) {
      console.error(`RealtimeManager failed to remove channel ${channelName}:`, error);
    } finally {
      this.channelRegistry.delete(channelName);
      useRealtimeStore.getState().removeChannel(channelName);
    }
  }

  async reconnectTrackedChannels(): Promise<void> {
    if (!this.isInForeground || this.channelRegistry.size === 0) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const channelNames = [...this.channelRegistry.keys()];
    const realtimeStore = useRealtimeStore.getState();
    realtimeStore.incrementReconnectAttempts();
    realtimeStore.setPendingResubscriptions(channelNames);
    realtimeStore.setConnectionState('CONNECTING');

    try {
      const results = await Promise.allSettled(channelNames.map((channelName) => this.reconnectChannel(channelName)));
      const allSucceeded = results.every((r) => r.status === 'fulfilled');

      if (allSucceeded) {
        this.reconnectAttempt = 0;
      } else {
        this.scheduleReconnect();
      }
    } finally {
      useRealtimeStore.getState().setPendingResubscriptions([]);
    }
  }

  handleNetworkReconnect(): Promise<void> {
    this.reconnectAttempt = 0;
    return this.reconnectTrackedChannels();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.isInForeground) {
      return;
    }

    const delay = computeReconnectDelay(this.reconnectAttempt);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.reconnectTrackedChannels();
    }, delay);
  }

  async clearChannels(): Promise<void> {
    const channelNames = [...this.channelRegistry.keys()];

    if (channelNames.length === 0) {
      useRealtimeStore.getState().setPendingResubscriptions([]);
      useRealtimeStore.getState().setConnectionState(this.isInForeground ? 'CLOSED' : 'CLOSING');
      return;
    }

    await Promise.allSettled(channelNames.map((channelName) => this.unregister(channelName)));
    useRealtimeStore.getState().setPendingResubscriptions([]);
    useRealtimeStore.getState().setConnectionState(this.isInForeground ? 'CLOSED' : 'CLOSING');
  }

  onForeground(callback: RealtimeCallback): () => void {
    this.foregroundCallbacks.add(callback);

    return () => {
      this.foregroundCallbacks.delete(callback);
    };
  }

  onBackground(callback: RealtimeCallback): () => void {
    this.backgroundCallbacks.add(callback);

    return () => {
      this.backgroundCallbacks.delete(callback);
    };
  }

  getRegistrySnapshot(): Map<string, ChannelRegistration> {
    return new Map(
      [...this.channelRegistry.entries()].map(([channelName, entry]) => [
        channelName,
        {
          channelName,
          status: entry.status,
          subscribedAt: entry.subscribedAt,
          errorCount: entry.errorCount,
          lastErrorAt: entry.lastErrorAt,
          refCount: entry.refCount,
        },
      ])
    );
  }

  async destroy(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectAttempt = 0;
    await this.clearChannels();
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.foregroundCallbacks.clear();
    this.backgroundCallbacks.clear();
  }

  private initializeAppStateListener(): void {
    let previousState: AppStateStatus = AppState.currentState;

    this.appStateSubscription = AppState.addEventListener('change', (nextState) => {
      const wasInBackground = previousState === 'background' || previousState === 'inactive';
      const isNowInBackground = nextState === 'background' || nextState === 'inactive';

      if (wasInBackground && nextState === 'active') {
        this.isInForeground = true;
        useRealtimeStore.getState().setAppInForeground(true);
        void this.reconnectTrackedChannels();
        this.foregroundCallbacks.forEach((callback) => {
          callback();
        });
      } else if (!wasInBackground && isNowInBackground) {
        this.isInForeground = false;
        useRealtimeStore.getState().setAppInForeground(false);
        this.backgroundCallbacks.forEach((callback) => {
          callback();
        });
      }

      previousState = nextState;
    });
  }

  private createEntry(
    channelName: string,
    configure: ChannelConfigurator,
    refCount: number,
    onStatusChange?: ChannelStatusCallback
  ): ChannelEntry {
    const channel = configure(getSupabaseClient().channel(channelName));
    const entry: ChannelEntry = {
      channelName,
      channel,
      configure,
      status: 'SUBSCRIBING',
      subscribedAt: null,
      errorCount: 0,
      lastErrorAt: null,
      refCount,
      onStatusChange,
    };

    useRealtimeStore.getState().setChannelStatus(channelName, 'SUBSCRIBING', refCount);
    channel.subscribe((rawStatus) => {
      const status = rawStatus as ChannelStatus;
      this.handleChannelStatus(channelName, status);
    });

    return entry;
  }

  private handleChannelStatus(channelName: string, status: ChannelStatus): void {
    const entry = this.channelRegistry.get(channelName);

    if (!entry) {
      return;
    }

    const nextEntry: ChannelEntry = {
      ...entry,
      status,
      subscribedAt: status === 'SUBSCRIBED' ? new Date().toISOString() : entry.subscribedAt,
      errorCount: isChannelErrorStatus(status) ? entry.errorCount + 1 : entry.errorCount,
      lastErrorAt: isChannelErrorStatus(status) ? new Date().toISOString() : entry.lastErrorAt,
    };

    this.channelRegistry.set(channelName, nextEntry);
    const realtimeStore = useRealtimeStore.getState();
    realtimeStore.setChannelStatus(channelName, status, nextEntry.refCount);

    if (status === 'SUBSCRIBED') {
      this.reconnectAttempt = 0;
      realtimeStore.resetReconnectAttempts();
      realtimeStore.setConnectionState('OPEN');
    } else if (isChannelErrorStatus(status)) {
      realtimeStore.setConnectionState('CONNECTING');
      this.scheduleReconnect();
    } else if (status === 'CLOSED' && this.channelRegistry.size === 0) {
      realtimeStore.setConnectionState(this.isInForeground ? 'CLOSED' : 'CLOSING');
    }

    nextEntry.onStatusChange?.(status, nextEntry.channel);
  }

  private async reconnectChannel(channelName: string): Promise<void> {
    const existingEntry = this.channelRegistry.get(channelName);

    if (!existingEntry) {
      return;
    }

    try {
      await getSupabaseClient().removeChannel(existingEntry.channel);
    } catch (error) {
      console.error(`RealtimeManager failed to tear down channel ${channelName} before reconnect:`, error);
    }

    const replacementEntry = this.createEntry(
      channelName,
      existingEntry.configure,
      existingEntry.refCount,
      existingEntry.onStatusChange
    );
    replacementEntry.errorCount = existingEntry.errorCount;
    replacementEntry.lastErrorAt = existingEntry.lastErrorAt;
    this.channelRegistry.set(channelName, replacementEntry);
  }
}

export const realtimeManager = new RealtimeManager();
