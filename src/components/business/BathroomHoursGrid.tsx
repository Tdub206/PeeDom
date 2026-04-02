import { memo, useCallback, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import type { HoursData } from '@/types';

interface BathroomHoursGridProps {
  initialHours: HoursData | null;
  onSave: (hours: HoursData) => void;
  isSaving?: boolean;
}

const DAYS = [
  { key: 'sunday', short: 'S', label: 'Sun' },
  { key: 'monday', short: 'M', label: 'Mon' },
  { key: 'tuesday', short: 'T', label: 'Tue' },
  { key: 'wednesday', short: 'W', label: 'Wed' },
  { key: 'thursday', short: 'TH', label: 'Thu' },
  { key: 'friday', short: 'F', label: 'Fri' },
  { key: 'saturday', short: 'S', label: 'Sat' },
] as const;

interface DayHours {
  open: string;
  close: string;
  isClosed: boolean;
}

function getDefaultDayHours(): DayHours {
  return { open: '09:00', close: '17:00', isClosed: false };
}

function parseTo12Hour(time24: string): { time: string; period: 'AM' | 'PM' } {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return { time: `${displayHours}:${String(minutes).padStart(2, '0')}`, period };
}

function parseFrom12Hour(time: string, period: 'AM' | 'PM'): string {
  const parts = time.split(':');
  if (parts.length !== 2) return '09:00';
  let hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return '09:00';
  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours !== 12) hours += 12;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function initializeFromHoursData(hoursData: HoursData | null): Record<string, DayHours> {
  const result: Record<string, DayHours> = {};
  for (const day of DAYS) {
    const slots = hoursData?.[day.key];
    if (slots && Array.isArray(slots) && slots.length > 0) {
      result[day.key] = { open: slots[0].open, close: slots[0].close, isClosed: false };
    } else {
      result[day.key] = getDefaultDayHours();
    }
  }
  return result;
}

function DayRow({
  day,
  hours,
  onChange,
}: {
  day: (typeof DAYS)[number];
  hours: DayHours;
  onChange: (dayKey: string, updated: DayHours) => void;
}) {
  const openParsed = parseTo12Hour(hours.open);
  const closeParsed = parseTo12Hour(hours.close);

  const handleOpenChange = useCallback(
    (text: string) => {
      onChange(day.key, { ...hours, open: parseFrom12Hour(text, openParsed.period) });
    },
    [day.key, hours, onChange, openParsed.period]
  );

  const handleCloseChange = useCallback(
    (text: string) => {
      onChange(day.key, { ...hours, close: parseFrom12Hour(text, closeParsed.period) });
    },
    [day.key, hours, onChange, closeParsed.period]
  );

  const togglePeriod = useCallback(
    (field: 'open' | 'close') => {
      const parsed = field === 'open' ? openParsed : closeParsed;
      const newPeriod = parsed.period === 'AM' ? 'PM' : 'AM';
      const newTime = parseFrom12Hour(parsed.time, newPeriod);
      onChange(day.key, { ...hours, [field]: newTime });
    },
    [day.key, hours, onChange, openParsed, closeParsed]
  );

  const toggleClosed = useCallback(
    (value: boolean) => {
      onChange(day.key, { ...hours, isClosed: value });
    },
    [day.key, hours, onChange]
  );

  return (
    <View className="flex-row items-center gap-2 py-2">
      <View className="w-10">
        <Text className="text-sm font-bold text-ink-900">{day.label}</Text>
      </View>

      {hours.isClosed ? (
        <View className="flex-1 items-center">
          <Text className="text-sm font-semibold text-ink-500">Closed</Text>
        </View>
      ) : (
        <View className="flex-1 flex-row items-center gap-1">
          <TextInput
            className="w-16 rounded-lg border border-surface-strong bg-surface-card px-2 py-1.5 text-center text-sm text-ink-900"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            onChangeText={handleOpenChange}
            value={openParsed.time}
          />
          <Pressable onPress={() => togglePeriod('open')}>
            <Text className="w-8 text-center text-xs font-bold text-brand-600">{openParsed.period}</Text>
          </Pressable>

          <Text className="text-ink-500">to</Text>

          <TextInput
            className="w-16 rounded-lg border border-surface-strong bg-surface-card px-2 py-1.5 text-center text-sm text-ink-900"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            onChangeText={handleCloseChange}
            value={closeParsed.time}
          />
          <Pressable onPress={() => togglePeriod('close')}>
            <Text className="w-8 text-center text-xs font-bold text-brand-600">{closeParsed.period}</Text>
          </Pressable>
        </View>
      )}

      <Switch
        onValueChange={toggleClosed}
        thumbColor="#ffffff"
        trackColor={{ false: colors.brand[600], true: '#cbd5e1' }}
        value={hours.isClosed}
      />
    </View>
  );
}

function BathroomHoursGridComponent({ initialHours, onSave, isSaving }: BathroomHoursGridProps) {
  const [dayHours, setDayHours] = useState(() => initializeFromHoursData(initialHours));

  const handleDayChange = useCallback((dayKey: string, updated: DayHours) => {
    setDayHours((prev) => ({ ...prev, [dayKey]: updated }));
  }, []);

  const handleCopyToAll = useCallback(() => {
    const firstOpenDay = DAYS.find((d) => !dayHours[d.key].isClosed);
    if (!firstOpenDay) return;
    const source = dayHours[firstOpenDay.key];
    setDayHours((prev) => {
      const next = { ...prev };
      for (const day of DAYS) {
        next[day.key] = { ...source };
      }
      return next;
    });
  }, [dayHours]);

  const handleSave = useCallback(() => {
    const hours: HoursData = {};
    for (const day of DAYS) {
      const dh = dayHours[day.key];
      if (!dh.isClosed) {
        hours[day.key] = [{ open: dh.open, close: dh.close }];
      }
    }
    onSave(hours);
  }, [dayHours, onSave]);

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">
          Weekly Hours
        </Text>
        <Pressable hitSlop={8} onPress={handleCopyToAll}>
          <Text className="text-xs font-semibold text-brand-600">Copy to All Days</Text>
        </Pressable>
      </View>

      <View className="mt-2 rounded-[24px] border border-surface-strong bg-surface-card p-4">
        {DAYS.map((day, index) => (
          <View key={day.key}>
            <DayRow day={day} hours={dayHours[day.key]} onChange={handleDayChange} />
            {index < DAYS.length - 1 ? <View className="border-b border-surface-strong" /> : null}
          </View>
        ))}
      </View>

      <Button className="mt-4" label="Save Hours" loading={isSaving} onPress={handleSave} />
    </View>
  );
}

export const BathroomHoursGrid = memo(BathroomHoursGridComponent);
