import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchBathroomDetailById, type PublicBathroomDetailRow } from '@/api/bathrooms';
import { Button } from '@/components/Button';
import { useBusinessHoursHistory, useUpdateBusinessBathroomHours } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/useToast';
import type { HoursData } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

const BUSINESS_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

type BusinessDayKey = (typeof BUSINESS_DAYS)[number];

type EditableHours = Record<BusinessDayKey, Array<{ open: string; close: string }>>;

function createEmptyEditableHours(): EditableHours {
  return BUSINESS_DAYS.reduce(
    (hours, day) => ({
      ...hours,
      [day]: [],
    }),
    {} as EditableHours
  );
}

function normalizeEditableHours(hoursJson: PublicBathroomDetailRow['hours_json']): EditableHours {
  const normalized = createEmptyEditableHours();

  if (!hoursJson || typeof hoursJson !== 'object' || Array.isArray(hoursJson)) {
    return normalized;
  }

  BUSINESS_DAYS.forEach((day) => {
    const rawSlots = hoursJson[day];

    if (!Array.isArray(rawSlots)) {
      return;
    }

    normalized[day] = rawSlots
      .filter(
        (slot): slot is { open: string; close: string } =>
          Boolean(slot) &&
          typeof slot === 'object' &&
          slot !== null &&
          !Array.isArray(slot) &&
          'open' in slot &&
          'close' in slot &&
          typeof slot.open === 'string' &&
          typeof slot.close === 'string'
      )
      .slice(0, 3);
  });

  return normalized;
}

function serializeEditableHours(hours: EditableHours): HoursData {
  return BUSINESS_DAYS.reduce<HoursData>((serializedHours, day) => {
    const slots = hours[day]
      .map((slot) => ({
        open: slot.open.trim(),
        close: slot.close.trim(),
      }))
      .filter((slot) => slot.open.length > 0 || slot.close.length > 0);

    if (!slots.length) {
      return serializedHours;
    }

    serializedHours[day] = slots;
    return serializedHours;
  }, {});
}

function formatDayLabel(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function formatHistoryDate(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface BusinessHoursEditorSheetProps {
  bathroomId: string | null;
  visible: boolean;
  onClose: () => void;
}

export function BusinessHoursEditorSheet({
  bathroomId,
  visible,
  onClose,
}: BusinessHoursEditorSheetProps) {
  const { showToast } = useToast();
  const hoursMutation = useUpdateBusinessBathroomHours();
  const hoursHistoryQuery = useBusinessHoursHistory(visible ? bathroomId : null);
  const [editableHours, setEditableHours] = useState<EditableHours>(createEmptyEditableHours());

  const bathroomQuery = useQuery<PublicBathroomDetailRow, Error>({
    queryKey: ['business', 'bathroom-detail', bathroomId ?? 'none'],
    enabled: visible && Boolean(bathroomId),
    queryFn: async () => {
      if (!bathroomId) {
        throw new Error('Choose a bathroom before editing business hours.');
      }

      const result = await fetchBathroomDetailById(bathroomId);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to load this bathroom right now.');
      }

      return result.data;
    },
  });

  useEffect(() => {
    if (!visible || !bathroomQuery.data) {
      return;
    }

    setEditableHours(normalizeEditableHours(bathroomQuery.data.hours_json));
  }, [bathroomQuery.data, visible]);

  const recentHistory = useMemo(
    () => hoursHistoryQuery.data?.slice(0, 5) ?? [],
    [hoursHistoryQuery.data]
  );

  const updateSlot = (
    day: BusinessDayKey,
    slotIndex: number,
    field: 'open' | 'close',
    value: string
  ) => {
    setEditableHours((currentHours) => ({
      ...currentHours,
      [day]: currentHours[day].map((slot, index) =>
        index === slotIndex
          ? {
              ...slot,
              [field]: value,
            }
          : slot
      ),
    }));
  };

  const addSlot = (day: BusinessDayKey) => {
    setEditableHours((currentHours) => {
      if (currentHours[day].length >= 3) {
        return currentHours;
      }

      return {
        ...currentHours,
        [day]: [...currentHours[day], { open: '', close: '' }],
      };
    });
  };

  const removeSlot = (day: BusinessDayKey, slotIndex: number) => {
    setEditableHours((currentHours) => ({
      ...currentHours,
      [day]: currentHours[day].filter((_, index) => index !== slotIndex),
    }));
  };

  const handleSave = async () => {
    if (!bathroomId) {
      return;
    }

    try {
      const result = await hoursMutation.mutateAsync({
        bathroom_id: bathroomId,
        hours: serializeEditableHours(editableHours),
      });

      showToast({
        title: 'Hours updated',
        message: `Saved business hours for ${bathroomQuery.data?.place_name ?? 'this bathroom'}.`,
        variant: 'success',
      });

      if (result.success) {
        onClose();
      }
    } catch (error) {
      showToast({
        title: 'Hours update failed',
        message: getErrorMessage(error, 'Unable to save these hours right now.'),
        variant: 'error',
      });
    }
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-surface-base">
        <View className="flex-row items-center justify-between border-b border-surface-strong bg-surface-card px-6 py-5">
          <View className="flex-1 pr-4">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Business Hours</Text>
            <Text className="mt-2 text-2xl font-black tracking-tight text-ink-900">
              {bathroomQuery.data?.place_name ?? 'Manage Hours'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text className="text-base font-semibold text-brand-700">Close</Text>
          </Pressable>
        </View>

        {bathroomQuery.isLoading ? (
          <View className="flex-1 items-center justify-center px-6">
            <ActivityIndicator />
            <Text className="mt-4 text-base text-ink-600">Loading current hours...</Text>
          </View>
        ) : bathroomQuery.error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-xl font-bold text-danger">Hours unavailable</Text>
            <Text className="mt-3 text-center text-base leading-6 text-ink-600">
              {getErrorMessage(bathroomQuery.error, 'Unable to load this bathroom right now.')}
            </Text>
            <Button className="mt-6" label="Close" onPress={onClose} />
          </View>
        ) : (
          <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
            <View className="px-6 py-6">
              <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
                <Text className="text-base leading-6 text-ink-600">
                  Update when your restroom is open. Changes are written to the public bathroom directory and logged in the business audit trail.
                </Text>

                <View className="mt-5 gap-4">
                  {BUSINESS_DAYS.map((day) => (
                    <View key={day} className="rounded-2xl bg-surface-base px-4 py-4">
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-700">
                          {formatDayLabel(day)}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          className="rounded-full bg-brand-600 px-3 py-2"
                          onPress={() => addSlot(day)}
                        >
                          <Text className="text-xs font-black uppercase tracking-[1px] text-white">Add Range</Text>
                        </Pressable>
                      </View>

                      {editableHours[day].length ? (
                        <View className="mt-4 gap-3">
                          {editableHours[day].map((slot, slotIndex) => (
                            <View key={`${day}-${slotIndex}`} className="flex-row items-center gap-3">
                              <View className="flex-1">
                                <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
                                  Open
                                </Text>
                                <TextInput
                                  autoCapitalize="none"
                                  autoCorrect={false}
                                  className="rounded-2xl border border-surface-strong bg-surface-card px-4 py-3 text-base text-ink-900"
                                  keyboardType="numbers-and-punctuation"
                                  onChangeText={(value) => updateSlot(day, slotIndex, 'open', value)}
                                  placeholder="09:00"
                                  placeholderTextColor="#94a3b8"
                                  value={slot.open}
                                />
                              </View>
                              <View className="flex-1">
                                <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
                                  Close
                                </Text>
                                <TextInput
                                  autoCapitalize="none"
                                  autoCorrect={false}
                                  className="rounded-2xl border border-surface-strong bg-surface-card px-4 py-3 text-base text-ink-900"
                                  keyboardType="numbers-and-punctuation"
                                  onChangeText={(value) => updateSlot(day, slotIndex, 'close', value)}
                                  placeholder="17:00"
                                  placeholderTextColor="#94a3b8"
                                  value={slot.close}
                                />
                              </View>
                              <Pressable
                                accessibilityRole="button"
                                className="self-end rounded-full bg-danger/10 px-3 py-3"
                                onPress={() => removeSlot(day, slotIndex)}
                              >
                                <Text className="text-xs font-black uppercase tracking-[1px] text-danger">Remove</Text>
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text className="mt-4 text-sm leading-6 text-ink-500">Closed for this day.</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              <View className="mt-6 gap-3">
                <Button
                  label="Save Business Hours"
                  loading={hoursMutation.isPending}
                  onPress={() => {
                    void handleSave();
                  }}
                />
                <Button label="Cancel" onPress={onClose} variant="secondary" />
              </View>

              <View className="mt-6 rounded-[28px] border border-surface-strong bg-surface-card p-5">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Hours Audit</Text>
                {hoursHistoryQuery.isLoading ? (
                  <View className="mt-4 flex-row items-center">
                    <ActivityIndicator />
                    <Text className="ml-3 text-sm text-ink-600">Loading recent edits...</Text>
                  </View>
                ) : recentHistory.length ? (
                  <View className="mt-4 gap-3">
                    {recentHistory.map((historyEntry) => (
                      <View
                        key={historyEntry.id}
                        className="rounded-2xl bg-surface-base px-4 py-4"
                      >
                        <Text className="text-sm font-semibold text-ink-900">
                          {formatHistoryDate(historyEntry.created_at)}
                        </Text>
                        <Text className="mt-1 text-sm leading-6 text-ink-600">
                          Source: {historyEntry.update_source.replace('_', ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="mt-4 text-sm leading-6 text-ink-500">
                    No hours changes have been logged for this bathroom yet.
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
