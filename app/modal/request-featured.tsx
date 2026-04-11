import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmitFeaturedRequest } from '@/hooks/useFeaturedPlacementRequest';

type PlacementType = 'search_top' | 'map_priority' | 'nearby_featured';

interface PlacementOption {
  value: PlacementType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PLACEMENT_OPTIONS: PlacementOption[] = [
  {
    value: 'search_top',
    label: 'Search Top',
    description: 'Appear at the top of search results in your area.',
    icon: 'search',
  },
  {
    value: 'map_priority',
    label: 'Map Priority',
    description: 'Highlighted pin on the map with priority visibility.',
    icon: 'map',
  },
  {
    value: 'nearby_featured',
    label: 'Nearby Featured',
    description: 'Featured card in the nearby bathrooms list.',
    icon: 'star',
  },
];

const DURATION_OPTIONS = [7, 14, 30, 90];

export default function RequestFeaturedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bathroom_id?: string }>();
  const { user } = useAuth();
  const submitRequest = useSubmitFeaturedRequest();

  const [selectedType, setSelectedType] = useState<PlacementType>('search_top');
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const bathroomId = params.bathroom_id;

  const handleSubmit = useCallback(() => {
    if (!bathroomId || !user?.id) return;

    submitRequest.mutate(
      {
        bathroom_id: bathroomId,
        placement_type: selectedType,
        geographic_scope: {
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        },
        duration_days: selectedDuration,
      },
      {
        onSuccess: () => {
          router.back();
        },
      },
    );
  }, [bathroomId, user?.id, selectedType, city, state, selectedDuration, submitRequest, router]);

  if (!bathroomId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-base">
        <Text className="text-ink-500">Missing bathroom information.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-2xl font-black tracking-tight text-ink-900">
            Request Featured Placement
          </Text>
          <Text className="mt-2 text-sm leading-5 text-ink-500">
            Submit a request to feature your bathroom listing. An admin will review and activate it.
          </Text>

          {/* Placement Type */}
          <Text className="mb-3 mt-6 text-sm font-bold uppercase tracking-[1px] text-ink-500">
            Placement Type
          </Text>
          <View className="gap-3">
            {PLACEMENT_OPTIONS.map((option) => {
              const isSelected = selectedType === option.value;
              return (
                <Pressable
                  key={option.value}
                  className={`flex-row items-center gap-4 rounded-2xl border p-4 ${
                    isSelected
                      ? 'border-brand-600 bg-brand-600/5'
                      : 'border-surface-strong bg-surface-card'
                  }`}
                  onPress={() => setSelectedType(option.value)}
                >
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-xl ${
                      isSelected ? 'bg-brand-600' : 'bg-surface-base'
                    }`}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? '#fff' : colors.ink[500]}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-ink-900">{option.label}</Text>
                    <Text className="mt-0.5 text-xs text-ink-500">{option.description}</Text>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={24} color={colors.brand[600]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Duration */}
          <Text className="mb-3 mt-6 text-sm font-bold uppercase tracking-[1px] text-ink-500">
            Duration
          </Text>
          <View className="flex-row gap-3">
            {DURATION_OPTIONS.map((days) => {
              const isSelected = selectedDuration === days;
              return (
                <Pressable
                  key={days}
                  className={`flex-1 items-center rounded-2xl border px-3 py-3 ${
                    isSelected
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-surface-strong bg-surface-card'
                  }`}
                  onPress={() => setSelectedDuration(days)}
                >
                  <Text
                    className={`text-lg font-black ${
                      isSelected ? 'text-white' : 'text-ink-900'
                    }`}
                  >
                    {days}
                  </Text>
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-white/80' : 'text-ink-500'
                    }`}
                  >
                    days
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Geographic Scope */}
          <Text className="mb-3 mt-6 text-sm font-bold uppercase tracking-[1px] text-ink-500">
            Geographic Scope (Optional)
          </Text>
          <View className="gap-3">
            <TextInput
              className="rounded-xl border border-surface-strong bg-surface-card px-4 py-3 text-sm text-ink-900"
              placeholder="City (e.g. Seattle)"
              placeholderTextColor="#9ca3af"
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              className="rounded-xl border border-surface-strong bg-surface-card px-4 py-3 text-sm text-ink-900"
              placeholder="State (e.g. WA)"
              placeholderTextColor="#9ca3af"
              value={state}
              onChangeText={setState}
            />
          </View>

          {/* Submit */}
          <Pressable
            className={`mt-8 items-center rounded-2xl px-6 py-4 ${
              submitRequest.isPending ? 'bg-brand-600/50' : 'bg-brand-600'
            }`}
            onPress={handleSubmit}
            disabled={submitRequest.isPending}
          >
            <Text className="text-base font-bold text-white">
              {submitRequest.isPending ? 'Submitting…' : 'Submit Request'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
