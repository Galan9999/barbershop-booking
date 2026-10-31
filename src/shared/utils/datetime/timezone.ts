/**
 * Wall-clock reasoning in a given IANA timezone.
 *
 * The database stores instants in UTC; opening hours and slot grids are
 * statements about local wall-clock time. Everything here goes through
 * Intl so daylight-saving transitions are handled by the platform instead
 * of by hand-rolled hour arithmetic.
 */

export interface LocalTimeParts {
  /** 0 = Sunday, matching Date.getDay(). */
  weekday: number;
  hour: number;
  minute: number;
}

export interface OpeningHours {
  open: string;
  close: string;
}

/** Opening hours per weekday; null means closed that day. */
export type WeeklyOpeningHours = Record<number, OpeningHours | null>;

const WEEKDAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Intl formatters are expensive to build and the availability grid asks for
// thousands of slots per request, so keep one per timezone.
const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Decomposes an instant into wall-clock parts in the given timezone. */
export function getLocalTimeParts(instant: Date, timeZone: string): LocalTimeParts {
  const parts = getPartsFormatter(timeZone).formatToParts(instant);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    weekday: WEEKDAY_ORDER.indexOf(valueOf('weekday')),
    // Intl renders midnight as 24 in hourCycle h24.
    hour: Number(valueOf('hour')) % 24,
    minute: Number(valueOf('minute')),
  };
}

/** Minutes since local midnight, from a "HH:mm" string. */
export function parseClockTime(clockTime: string): number {
  const [hours = 0, minutes = 0] = clockTime.split(':').map(Number);
  return hours * 60 + minutes;
}

/** True when the slot starts exactly on the grid (e.g. :00 or :30). */
export function isSlotAligned(start: Date, slotMinutes: number, timeZone: string): boolean {
  const { minute } = getLocalTimeParts(start, timeZone);
  return (
    minute % slotMinutes === 0 && start.getSeconds() === 0 && start.getMilliseconds() === 0
  );
}

/** True when the whole appointment fits inside that weekday's opening hours. */
export function isWithinOpeningHours(
  start: Date,
  durationMinutes: number,
  openingHours: WeeklyOpeningHours,
  timeZone: string,
): boolean {
  const local = getLocalTimeParts(start, timeZone);
  const day = openingHours[local.weekday];
  if (!day) return false;

  const startMinute = local.hour * 60 + local.minute;
  return (
    startMinute >= parseClockTime(day.open) &&
    startMinute + durationMinutes <= parseClockTime(day.close)
  );
}
