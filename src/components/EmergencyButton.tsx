import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmergencyButtonProps {
  isActive: boolean;
  isFreeLookupAvailable: boolean;
  canUnlockWithPoints: boolean;
  pointsUnlockCost: number;
  requiresAuthForUnlock: boolean;
  isPremiumUser: boolean;
  isUnlocking: boolean;
  isAdUnlockAvailable: boolean;
  onPress: () => void;
}

export function EmergencyButton({
  isActive,
  isFreeLookupAvailable,
  canUnlockWithPoints,
  pointsUnlockCost,
  requiresAuthForUnlock,
  isPremiumUser,
  isUnlocking,
  isAdUnlockAvailable,
  onPress,
}: EmergencyButtonProps) {
  const isBusy = isActive || isUnlocking;
  const label = isUnlocking
    ? 'Unlocking...'
    : isActive
      ? 'Finding...'
      : isPremiumUser
        ? 'Go Now'
        : requiresAuthForUnlock
          ? 'Sign In'
          : isFreeLookupAvailable
            ? '1 Free'
            : canUnlockWithPoints && isAdUnlockAvailable
              ? 'Unlock'
              : canUnlockWithPoints
                ? `${pointsUnlockCost} Pts`
                : 'Ad Unlock';

  const accessibilityLabel = isPremiumUser
    ? 'Emergency mode: find the nearest bathroom and navigate there now'
    : requiresAuthForUnlock
      ? 'Sign in to use emergency lookup and keep its free use tied to your account'
      : isFreeLookupAvailable
        ? 'Emergency mode: use your free emergency lookup'
        : canUnlockWithPoints && isAdUnlockAvailable
          ? `Emergency mode: choose between ${pointsUnlockCost} points or a rewarded unlock`
          : canUnlockWithPoints
            ? `Emergency mode: spend ${pointsUnlockCost} points to unlock a search`
            : 'Emergency mode: rewarded unlock required to find the nearest bathroom and navigate';

  return (
    <View className="absolute bottom-5 right-4" style={{ zIndex: 10 }}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        className="h-16 w-16 items-center justify-center rounded-full bg-danger shadow-lg"
        disabled={isBusy}
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
          elevation: 8,
          shadowColor: '#c24141',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        })}
      >
        {isBusy ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Ionicons color="#ffffff" name="navigate" size={28} />
        )}
      </Pressable>
      <Text className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-danger">
        {label}
      </Text>
    </View>
  );
}
