export interface NetworkStateSnapshot {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}

export function isNetworkStateOnline(state: NetworkStateSnapshot | null | undefined): boolean {
  if (!state) {
    return true;
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

  return true;
}
