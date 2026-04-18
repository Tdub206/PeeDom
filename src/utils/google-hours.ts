type HoursSlot = {
  open: string;
  close: string;
};

type HoursDataLike = Record<string, HoursSlot[]>;

interface GoogleHoursPoint {
  day?: number;
  hour?: number;
  minute?: number;
}

interface GoogleHoursPeriod {
  open?: GoogleHoursPoint;
  close?: GoogleHoursPoint;
}

interface GoogleOpeningHours {
  periods?: GoogleHoursPeriod[] | null;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const END_OF_DAY = '23:59';
const START_OF_DAY = '00:00';

function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function toMinutes(value: string): number {
  const [hoursSegment, minutesSegment] = value.split(':');
  return Number.parseInt(hoursSegment ?? '0', 10) * 60 + Number.parseInt(minutesSegment ?? '0', 10);
}

function pushSlot(hours: HoursDataLike, dayIndex: number, open: string, close: string): void {
  if (open === close) {
    return;
  }

  const dayKey = DAY_KEYS[((dayIndex % 7) + 7) % 7];

  if (!dayKey) {
    return;
  }

  hours[dayKey] = [...(hours[dayKey] ?? []), { open, close }];
}

function normalizeDaySlots(slots: HoursSlot[]): HoursSlot[] {
  const sortedSlots = [...slots].sort((left, right) => toMinutes(left.open) - toMinutes(right.open));
  const mergedSlots: HoursSlot[] = [];

  sortedSlots.forEach((slot) => {
    const previousSlot = mergedSlots[mergedSlots.length - 1];

    if (!previousSlot) {
      mergedSlots.push(slot);
      return;
    }

    if (toMinutes(slot.open) <= toMinutes(previousSlot.close)) {
      previousSlot.close =
        toMinutes(slot.close) > toMinutes(previousSlot.close) ? slot.close : previousSlot.close;
      return;
    }

    mergedSlots.push(slot);
  });

  return mergedSlots;
}

export function normalizeGoogleOpeningHours(openingHours: GoogleOpeningHours | null | undefined): HoursDataLike {
  const normalizedHours: HoursDataLike = {};
  const periods = openingHours?.periods ?? [];

  if (!periods.length) {
    return normalizedHours;
  }

  for (const period of periods) {
    const open = period.open;
    const close = period.close;

    if (
      typeof open?.day !== 'number' ||
      typeof open.hour !== 'number' ||
      typeof open.minute !== 'number'
    ) {
      continue;
    }

    if (!close) {
      DAY_KEYS.forEach((_, dayIndex) => {
        pushSlot(normalizedHours, dayIndex, START_OF_DAY, END_OF_DAY);
      });
      continue;
    }

    if (
      typeof close.day !== 'number' ||
      typeof close.hour !== 'number' ||
      typeof close.minute !== 'number'
    ) {
      continue;
    }

    const openTime = formatTime(open.hour, open.minute);
    const closeTime = formatTime(close.hour, close.minute);
    const dayDistance = (close.day - open.day + 7) % 7;

    if (dayDistance === 0 && toMinutes(closeTime) > toMinutes(openTime)) {
      pushSlot(normalizedHours, open.day, openTime, closeTime);
      continue;
    }

    for (let offset = 0; offset <= dayDistance; offset += 1) {
      const dayIndex = (open.day + offset) % 7;

      if (offset === 0) {
        pushSlot(normalizedHours, dayIndex, openTime, END_OF_DAY);
        continue;
      }

      if (offset === dayDistance) {
        pushSlot(normalizedHours, dayIndex, START_OF_DAY, closeTime);
        continue;
      }

      pushSlot(normalizedHours, dayIndex, START_OF_DAY, END_OF_DAY);
    }
  }

  return Object.entries(normalizedHours).reduce<HoursDataLike>((hours, [dayKey, slots]) => {
    const normalizedSlots = normalizeDaySlots(slots);

    if (normalizedSlots.length > 0) {
      hours[dayKey] = normalizedSlots;
    }

    return hours;
  }, {});
}
