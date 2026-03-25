import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  AccessibilityPreferenceState,
  AccessibilityPreset,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  UserAccessibilityPreferences,
} from '@/types';
import { mapUserAccessibilityPreferencesToState } from '@/utils/accessibility';

interface AccessibilityStoreState {
  isAccessibilityMode: boolean;
  preferences: AccessibilityPreferenceState;
  hydratedUserId: string | null;
  hasPendingChanges: boolean;
  setAccessibilityMode: (enabled: boolean) => void;
  setPreference: <K extends keyof AccessibilityPreferenceState>(
    key: K,
    value: AccessibilityPreferenceState[K]
  ) => void;
  applyPreset: (preset: AccessibilityPreset) => void;
  resetPreferences: () => void;
  hydrateFromServer: (userId: string, preferences: UserAccessibilityPreferences | null) => void;
  markSynced: (userId: string | null) => void;
}

function getPresetPreferences(preset: AccessibilityPreset): AccessibilityPreferenceState {
  switch (preset) {
    case 'wheelchair':
      return {
        ...DEFAULT_ACCESSIBILITY_PREFERENCES,
        requireGrabBars: true,
        requireAutomaticDoor: true,
        minDoorWidth: 32,
        minStallWidth: 60,
        prioritizeAccessible: true,
        hideNonAccessible: true,
      };
    case 'gender_neutral':
      return {
        ...DEFAULT_ACCESSIBILITY_PREFERENCES,
        requireGenderNeutral: true,
        prioritizeAccessible: true,
      };
    case 'family':
      return {
        ...DEFAULT_ACCESSIBILITY_PREFERENCES,
        requireFamilyRestroom: true,
        requireChangingTable: true,
        prioritizeAccessible: true,
      };
    default:
      return DEFAULT_ACCESSIBILITY_PREFERENCES;
  }
}

export const useAccessibilityStore = create<AccessibilityStoreState>()(
  persist(
    (set, get) => ({
      isAccessibilityMode: false,
      preferences: DEFAULT_ACCESSIBILITY_PREFERENCES,
      hydratedUserId: null,
      hasPendingChanges: false,
      setAccessibilityMode: (enabled) =>
        set({
          isAccessibilityMode: enabled,
          hasPendingChanges: true,
        }),
      setPreference: (key, value) =>
        set((state) => ({
          isAccessibilityMode: true,
          preferences: {
            ...state.preferences,
            [key]: value,
          },
          hasPendingChanges: true,
        })),
      applyPreset: (preset) =>
        set({
          isAccessibilityMode: true,
          preferences: getPresetPreferences(preset),
          hasPendingChanges: true,
        }),
      resetPreferences: () =>
        set({
          isAccessibilityMode: false,
          preferences: DEFAULT_ACCESSIBILITY_PREFERENCES,
          hasPendingChanges: true,
        }),
      hydrateFromServer: (userId, preferences) => {
        if (get().hasPendingChanges && get().hydratedUserId === userId) {
          return;
        }

        set({
          isAccessibilityMode: preferences?.accessibility_mode_enabled ?? false,
          preferences: mapUserAccessibilityPreferencesToState(preferences),
          hydratedUserId: userId,
          hasPendingChanges: false,
        });
      },
      markSynced: (userId) =>
        set({
          hydratedUserId: userId,
          hasPendingChanges: false,
        }),
    }),
    {
      name: '@peedom/accessibility-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAccessibilityMode: state.isAccessibilityMode,
        preferences: state.preferences,
      }),
    }
  )
);
