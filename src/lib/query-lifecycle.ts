import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { isNetworkStateOnline } from '@/lib/network-state';

let hasInitialized = false;

export function initializeQueryLifecycleManagers(): void {
  if (hasInitialized) {
    return;
  }

  hasInitialized = true;

  onlineManager.setEventListener((setOnline) => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(isNetworkStateOnline(state));
    });

    void NetInfo.fetch()
      .then((state) => {
        setOnline(isNetworkStateOnline(state));
      })
      .catch(() => undefined);

    return unsubscribe;
  });

  focusManager.setEventListener((handleFocus) => {
    const onAppStateChange = (nextAppState: AppStateStatus) => {
      handleFocus(nextAppState === 'active');
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  });
}
