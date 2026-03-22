import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmergencyButtonProps {
  isActive: boolean;
  onPress: () => void;
}

export function EmergencyButton({ isActive, onPress }: EmergencyButtonProps) {
  return (
    <View className="absolute bottom-5 right-4" style={{ zIndex: 10 }}>
      <Pressable
        accessibilityLabel="Emergency mode: find nearest bathroom and navigate"
        accessibilityRole="button"
        className="h-16 w-16 items-center justify-center rounded-full bg-danger shadow-lg"
        disabled={isActive}
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
        {isActive ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Ionicons color="#ffffff" name="navigate" size={28} />
        )}
      </Pressable>
      <Text className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-danger">
        {isActive ? 'Finding...' : 'Go Now'}
      </Text>
    </View>
  );
}
