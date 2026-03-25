export interface NetworkStateSnapshot {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}

export function isNetworkStateOnline(state: NetworkStateSnapshot | null | undefined): boolean {
  // Conservative default: treat null/undefined state as offline.
  // During cold start, NetInfo hasn't initialized yet and state is null.
  // Returning true here would cause mutations to fire and fail before
  // connectivity is confirmed. Returning false holds them until NetInfo
  // reports a definitive state.
  if (!state) {
    return false;
  }

  if (state.isConnected === false) {
    return false;
  }

  if (state.isInternetReachable === false) {
    return false;
  }

  if (typeof state.isConnected === 'boolean') {
    return state.isConnected;
  }

  if (typeof state.isInternetReachable === 'boolean') {
    return state.isInternetReachable;
  }

  // All fields are null -- NetInfo hasn't determined connectivity yet.
  // Stay conservative and assume offline until proven otherwise.
  return false;
}
