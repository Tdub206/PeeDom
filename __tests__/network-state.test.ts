import { describe, expect, it } from '@jest/globals';
import { isNetworkStateOnline } from '@/lib/network-state';

describe('isNetworkStateOnline', () => {
  it('reports offline when the device is disconnected', () => {
    expect(
      isNetworkStateOnline({
        isConnected: false,
        isInternetReachable: true,
      })
    ).toBe(false);
  });

  it('reports offline when internet reachability fails even if the radio is connected', () => {
    expect(
      isNetworkStateOnline({
        isConnected: true,
        isInternetReachable: false,
      })
    ).toBe(false);
  });

  it('treats unknown states as offline to prevent premature mutations during cold start', () => {
    expect(isNetworkStateOnline(undefined)).toBe(false);
    expect(
      isNetworkStateOnline({
        isConnected: null,
        isInternetReachable: null,
      })
    ).toBe(false);
  });
});
