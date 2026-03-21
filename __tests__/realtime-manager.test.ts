import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

type SubscriptionHandler = (status: string) => void;

interface MockChannel {
  on: (...args: unknown[]) => MockChannel;
  subscribe: (handler: SubscriptionHandler) => MockChannel;
  emitStatus: (status: string) => void;
}

const storeState = {
  setAppInForeground: jest.fn(),
  setConnectionState: jest.fn(),
  setChannelStatus: jest.fn(),
  removeChannel: jest.fn(),
  incrementReconnectAttempts: jest.fn(),
  resetReconnectAttempts: jest.fn(),
  setPendingResubscriptions: jest.fn(),
};

let addEventListenerMock: jest.Mock;
let removeEventListenerMock: jest.Mock;
let channelFactoryMock: jest.Mock;
let removeChannelMock: jest.Mock;
let createdChannels: MockChannel[];

function createMockChannel(): MockChannel {
  let statusHandler: SubscriptionHandler | null = null;

  const channel: MockChannel = {
    on: jest.fn(() => channel) as MockChannel['on'],
    subscribe: jest.fn((handler: SubscriptionHandler) => {
      statusHandler = handler;
      return channel;
    }) as MockChannel['subscribe'],
    emitStatus: (status: string) => {
      statusHandler?.(status);
    },
  };

  return channel;
}

describe('RealtimeManager', () => {
  beforeEach(() => {
    jest.resetModules();
    createdChannels = [];
    removeEventListenerMock = jest.fn();
    addEventListenerMock = jest.fn(() => ({
      remove: removeEventListenerMock,
    }));
    channelFactoryMock = jest.fn(() => {
      const channel = createMockChannel();
      createdChannels.push(channel);
      return channel;
    });
    removeChannelMock = jest.fn().mockImplementation(async () => undefined);

    storeState.setAppInForeground.mockReset();
    storeState.setConnectionState.mockReset();
    storeState.setChannelStatus.mockReset();
    storeState.removeChannel.mockReset();
    storeState.incrementReconnectAttempts.mockReset();
    storeState.resetReconnectAttempts.mockReset();
    storeState.setPendingResubscriptions.mockReset();

    jest.doMock('react-native', () => ({
      AppState: {
        currentState: 'active',
        addEventListener: addEventListenerMock,
      },
    }));

    jest.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => ({
        channel: channelFactoryMock,
        removeChannel: removeChannelMock,
      }),
    }));

    jest.doMock('@/store/useRealtimeStore', () => ({
      useRealtimeStore: {
        getState: () => storeState,
      },
    }));
  });

  afterEach(async () => {
    jest.dontMock('react-native');
    jest.dontMock('@/lib/supabase');
    jest.dontMock('@/store/useRealtimeStore');
  });

  it('creates one shared channel per channel name and tracks reference counts', async () => {
    let RealtimeManager:
      | typeof import('@/lib/realtime-manager').RealtimeManager
      | undefined;

    jest.isolateModules(() => {
      ({ RealtimeManager } = require('@/lib/realtime-manager'));
    });

    if (!RealtimeManager) {
      throw new Error('RealtimeManager class was not loaded for the test run.');
    }

    const manager = new RealtimeManager();
    const firstChannel = manager.subscribe('bathrooms:map-view', (channel) => channel);
    const secondChannel = manager.subscribe('bathrooms:map-view', (channel) => channel);
    const registrySnapshot = manager.getRegistrySnapshot();

    expect(firstChannel).toBe(secondChannel);
    expect(channelFactoryMock).toHaveBeenCalledTimes(1);
    expect(registrySnapshot.get('bathrooms:map-view')?.refCount).toBe(2);

    await manager.unregister('bathrooms:map-view');
    expect(removeChannelMock).not.toHaveBeenCalled();

    await manager.unregister('bathrooms:map-view');
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
    expect(manager.getRegistrySnapshot().size).toBe(0);

    await manager.destroy();
  });

  it('recreates tracked channels during reconnect and preserves registry membership', async () => {
    let RealtimeManager:
      | typeof import('@/lib/realtime-manager').RealtimeManager
      | undefined;

    jest.isolateModules(() => {
      ({ RealtimeManager } = require('@/lib/realtime-manager'));
    });

    if (!RealtimeManager) {
      throw new Error('RealtimeManager class was not loaded for the test run.');
    }

    const manager = new RealtimeManager();
    const firstChannel = manager.subscribe('bathroom-detail:test-id', (channel) => channel);
    createdChannels[0]?.emitStatus('SUBSCRIBED');

    await manager.reconnectTrackedChannels();

    expect(channelFactoryMock).toHaveBeenCalledTimes(2);
    expect(removeChannelMock).toHaveBeenCalledWith(firstChannel);
    expect(manager.getRegistrySnapshot().get('bathroom-detail:test-id')?.refCount).toBe(1);

    await manager.destroy();
  });

  it('clears channels without tearing down app-state listeners', async () => {
    let RealtimeManager:
      | typeof import('@/lib/realtime-manager').RealtimeManager
      | undefined;

    jest.isolateModules(() => {
      ({ RealtimeManager } = require('@/lib/realtime-manager'));
    });

    if (!RealtimeManager) {
      throw new Error('RealtimeManager class was not loaded for the test run.');
    }

    const manager = new RealtimeManager();
    manager.subscribe('favorites:user:123', (channel) => channel);

    await manager.clearChannels();

    expect(removeChannelMock).toHaveBeenCalledTimes(1);
    expect(removeEventListenerMock).not.toHaveBeenCalled();
    expect(manager.getRegistrySnapshot().size).toBe(0);

    await manager.destroy();
  });
});
