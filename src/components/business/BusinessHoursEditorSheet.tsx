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
  { key: 'sunday', short: 'S', label: 'Sunday' },
  { key: 'monday', short: 'M', label: 'Monday' },
  { key: 'tuesday', short: 'T', label: 'Tuesday' },
  { key: 'wednesday', short: 'W', label: 'Wednesday' },
  { key: 'thursday', short: 'T', label: 'Thursday' },
  { key: 'friday', short: 'F', label: 'Friday' },
  { key: 'saturday', short: 'S', label: 'Saturday' },
] as const;

type BusinessDayKey = (typeof BUSINESS_DAYS)[number]['key'];
type Meridiem = 'AM' | 'PM';
type EditableHoursSlot = {
  open: string;
  open_period: Meridiem;
  close: string;
  close_period: Meridiem;
};
type EditableHours = Record<BusinessDayKey, EditableHoursSlot[]>;

function createEmptySlot(): EditableHoursSlot {
  return {
    open: '',
    open_period: 'AM',
    close: '',
    close_period: 'PM',
  };
}

function createEmptyEditableHours(): EditableHours {
  return BUSINESS_DAYS.reduce(
    (hours, day) => ({
      ...hours,
      [day.key]: [],
    }),
    {} as EditableHours
  );
}

function formatHistoryDate(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sanitizeTimeInput(value: string): string {
  return value.replace(/[^0-9:]/g, '').slice(0, 5);
}

function parse24HourTimeToSlotPart(value: string): { time: string; period: Meridiem } | null {
  const [hoursSegment, minutesSegment] = value.split(':');
  const hours = Number.parseInt(hoursSegment ?? '', 10);
  const minutes = Number.parseInt(minutesSegment ?? '', 10);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const period: Meridiem = hours >= 12 ? 'PM' : 'AM';
  const normalizedHour = hours % 12 || 12;

  return {
    time: `${normalizedHour}:${minutes.toString().padStart(2, '0')}`,
    period,
  };
}

function parseFlexibleTimeToMinutes(value: string, period: Meridiem): number | null {
  const trimmedValue = value.trim();
  const [hoursSegment, minutesSegment = '00'] = trimmedValue.split(':');
  const hours = Number.parseInt(hoursSegment ?? '', 10);
  const minutes = Number.parseInt(minutesSegment ?? '', 10);

  if (
    trimmedValue.length === 0 ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 1 ||
    hours > 12 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const normalizedHours = hours % 12;
  return normalizedHours * 60 + minutes + (period === 'PM' ? 12 * 60 : 0);
}

function formatMinutesTo24Hour(minutes: number): string {
  const normalizedMinutes = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;

  return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
}

function formatMinutesTo12Hour(minutes: number): { time: string; period: Meridiem } {
  const normalizedMinutes = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;
  const period: Meridiem = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;

  return {
    time: `${normalizedHours}:${remainingMinutes.toString().padStart(2, '0')}`,
    period,
  };
}

function shiftSlotClose(slot: EditableHoursSlot, deltaMinutes: number): EditableHoursSlot {
  const closeMinutes = parseFlexibleTimeToMinutes(slot.close, slot.close_period);

  if (closeMinutes === null) {
    return slot;
  }

  const shiftedClose = formatMinutesTo12Hour(closeMinutes - deltaMinutes);
  return {
    ...slot,
    close: shiftedClose.time,
    close_period: shiftedClose.period,
  };
}

function normalizeEditableHours(hoursJson: PublicBathroomDetailRow['hours_json']): EditableHours {
  const normalized = createEmptyEditableHours();

  if (!hoursJson || typeof hoursJson !== 'object' || Array.isArray(hoursJson)) {
    return normalized;
  }

  BUSINESS_DAYS.forEach((day) => {
    const rawSlots = hoursJson[day.key];

    if (!Array.isArray(rawSlots)) {
      return;
    }

    normalized[day.key] = rawSlots
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
      .map((slot) => {
        const openPart = parse24HourTimeToSlotPart(slot.open);
        const closePart = parse24HourTimeToSlotPart(slot.close);

        if (!openPart || !closePart) {
          return createEmptySlot();
        }

        return {
          open: openPart.time,
          open_period: openPart.period,
          close: closePart.time,
          close_period: closePart.period,
        };
      })
      .slice(0, 3);
  });

  return normalized;
}

function serializeEditableHours(hours: EditableHours): HoursData {
  return BUSINESS_DAYS.reduce<HoursData>((serializedHours, day) => {
    const slots = hours[day.key]
      .map((slot) => {
        const openMinutes = parseFlexibleTimeToMinutes(slot.open, slot.open_period);
        const closeMinutes = parseFlexibleTimeToMinutes(slot.close, slot.close_period);

        return {
          open: openMinutes === null ? '' : formatMinutesTo24Hour(openMinutes),
          close: closeMinutes === null ? '' : formatMinutesTo24Hour(closeMinutes),
        };
      })
      .filter((slot) => slot.open.length > 0 || slot.close.length > 0);

    if (!slots.length) {
      return serializedHours;
    }

    serializedHours[day.key] = slots;
    return serializedHours;
  }, {});
}

function buildListedHoursTemplate(
  hoursJson: PublicBathroomDetailRow['hours_json'],
  closeOffsetMinutes: number
): EditableHours {
  const normalizedHours = normalizeEditableHours(hoursJson);

  if (closeOffsetMinutes <= 0) {
    return normalizedHours;
  }

  return BUSINESS_DAYS.reduce<EditableHours>((hours, day) => {
    hours[day.key] = normalizedHours[day.key].map((slot) => shiftSlotClose(slot, closeOffsetMinutes));
    return hours;
  }, createEmptyEditableHours());
}

function MeridiemToggle({
  value,
  onChange,
}: {
  value: Meridiem;
  onChange: (nextValue: Meridiem) => void;
}) {
  return (
    <View className="mt-2 flex-row rounded-full bg-surface-muted p-1">
      {(['AM', 'PM'] as Meridiem[]).map((period) => (
        <Pressable
          className={[
            'flex-1 rounded-full px-3 py-2',
            value === period ? 'bg-brand-600' : 'bg-transparent',
          ].join(' ')}
          key={period}
          onPress={() => onChange(period)}
        >
          <Text
            className={[
              'text-center text-xs font-black uppercase tracking-[1px]',
              value === period ? 'text-white' : 'text-ink-600',
            ].join(' ')}
          >
            {period}
          </Text>
        </Pressable>
      ))}
    </View>
  );
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
    field: keyof EditableHoursSlot,
    value: string
  ) => {
    setEditableHours((currentHours) => ({
      ...currentHours,
      [day]: currentHours[day].map((slot, index) =>
        index === slotIndex
          ? {
              ...slot,
              [field]:
                field === 'open' || field === 'close'
                  ? sanitizeTimeInput(value)
                  : value,
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
        [day]: [...currentHours[day], createEmptySlot()],
      };
    });
  };

  const removeSlot = (day: BusinessDayKey, slotIndex: number) => {
    setEditableHours((currentHours) => ({
      ...currentHours,
      [day]: currentHours[day].filter((_, index) => index !== slotIndex),
    }));
  };

  const applyTemplate = (closeOffsetMinutes: number) => {
    if (!bathroomQuery.data) {
      return;
    }

    setEditableHours(buildListedHoursTemplate(bathroomQuery.data.hours_json, closeOffsetMinutes));
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
        message: `Saved restroom hours for ${bathroomQuery.data?.place_name ?? 'this bathroom'}.`,
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
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Restroom Hours</Text>
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
                  Use your current listed business hours as a starting point, shorten restroom access before closing, or edit each day manually. New rows default to AM opening and PM closing.
                </Text>

                <View className="mt-4 flex-row flex-wrap gap-3">
                  <Button
                    fullWidth={false}
                    label="Use Listed Hours"
                    onPress={() => applyTemplate(0)}
                    variant="secondary"
                  />
                  <Button
                    fullWidth={false}
                    label="Close 30m Early"
                    onPress={() => applyTemplate(30)}
                    variant="secondary"
                  />
                  <Button
                    fullWidth={false}
                    label="Close 60m Early"
                    onPress={() => applyTemplate(60)}
                    variant="secondary"
                  />
                  <Button
                    fullWidth={false}
                    label="Clear"
                    onPress={() => setEditableHours(createEmptyEditableHours())}
                    variant="ghost"
                  />
                </View>

                <View className="mt-5 flex-row justify-between rounded-2xl bg-surface-base px-4 py-3">
                  {BUSINESS_DAYS.map((day) => (
                    <Text
                      className="text-xs font-black uppercase tracking-[1px] text-ink-500"
                      key={day.key}
                    >
                      {day.short}
                    </Text>
                  ))}
                </View>

                <View className="mt-5 gap-4">
                  {BUSINESS_DAYS.map((day) => (
                    <View key={day.key} className="rounded-2xl bg-surface-base px-4 py-4">
                      <View className="flex-row items-center justify-between gap-3">
                        <View>
                          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-700">
                            {day.label}
                          </Text>
                          <Text className="mt-1 text-xs text-ink-500">
                            {day.short} blank-to-blank schedule
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          className="rounded-full bg-brand-600 px-3 py-2"
                          onPress={() => addSlot(day.key)}
                        >
                          <Text className="text-xs font-black uppercase tracking-[1px] text-white">Add Range</Text>
                        </Pressable>
                      </View>

                      {editableHours[day.key].length ? (
                        <View className="mt-4 gap-3">
                          {editableHours[day.key].map((slot, slotIndex) => (
                            <View
                              className="rounded-2xl border border-surface-strong bg-surface-card px-3 py-3"
                              key={`${day.key}-${slotIndex}`}
                            >
                              <View className="flex-row items-start gap-3">
                                <View className="flex-1">
                                  <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
                                    Open
                                  </Text>
                                  <TextInput
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-base text-ink-900"
                                    keyboardType="numbers-and-punctuation"
                                    onChangeText={(value) => updateSlot(day.key, slotIndex, 'open', value)}
                                    placeholder="8:00"
                                    placeholderTextColor="#94a3b8"
                                    value={slot.open}
                                  />
                                  <MeridiemToggle
                                    value={slot.open_period}
                                    onChange={(nextValue) => updateSlot(day.key, slotIndex, 'open_period', nextValue)}
                                  />
                                </View>

                                <View className="pt-9">
                                  <Text className="text-sm font-semibold text-ink-500">to</Text>
                                </View>

                                <View className="flex-1">
                                  <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-ink-500">
                                    Close
                                  </Text>
                                  <TextInput
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-base text-ink-900"
                                    keyboardType="numbers-and-punctuation"
                                    onChangeText={(value) => updateSlot(day.key, slotIndex, 'close', value)}
                                    placeholder="5:00"
                                    placeholderTextColor="#94a3b8"
                                    value={slot.close}
                                  />
                                  <MeridiemToggle
                                    value={slot.close_period}
                                    onChange={(nextValue) => updateSlot(day.key, slotIndex, 'close_period', nextValue)}
                                  />
                                </View>
                              </View>

                              <Pressable
                                accessibilityRole="button"
                                className="mt-3 self-end rounded-full bg-danger/10 px-3 py-2"
                                onPress={() => removeSlot(day.key, slotIndex)}
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
                  label="Save Restroom Hours"
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
