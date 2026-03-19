import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

interface UseAccessibilityInfoResult {
  isScreenReaderEnabled: boolean;
  isLoading: boolean;
  announce: (message: string) => Promise<void>;
}

export function useAccessibilityInfo(): UseAccessibilityInfoResult {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadState = async () => {
      try {
        const enabled = await AccessibilityInfo.isScreenReaderEnabled();

        if (isMounted) {
          setIsScreenReaderEnabled(enabled);
        }
      } catch (error) {
        if (isMounted) {
          setIsScreenReaderEnabled(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadState();

    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
      setIsScreenReaderEnabled(enabled);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const announce = useCallback(async (message: string) => {
    try {
      if (!message.trim().length) {
        return;
      }

      await AccessibilityInfo.announceForAccessibility(message);
    } catch (error) {
      console.error('Unable to announce accessibility update:', error);
    }
  }, []);

  return {
    isScreenReaderEnabled,
    isLoading,
    announce,
  };
}
