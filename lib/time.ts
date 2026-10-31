/**
 * Timezone helpers. The DB stores UTC (timestamptz); all business rules and
 * user-facing formatting run in the business timezone. No manual hour math.
 */

interface LocalParts {
  weekday: number; // 0 = Sunday
  hour: number;
  minute: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Decompose an instant into wall-clock parts in the given IANA timezone. */
export function getLocalParts(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    weekday: WEEKDAYS.indexOf(get('weekday')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
}

/** "YYYYMMDDTHHMMSSZ" — the UTC format Google Calendar template URLs expect. */
export function toGoogleCalendarUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Human date-time in the business timezone, e.g. "viernes, 7 de noviembre de 2026, 10:30". */
export function formatForHumans(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Slot starts must land exactly on the grid (e.g. :00 / :30 for 30-min slots). */
export function isSlotAligned(date: Date, slotMinutes: number, timeZone: string): boolean {
  const { minute } = getLocalParts(date, timeZone);
  return minute % slotMinutes === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;
}

/** Whole appointment (start..start+duration) must fit inside opening hours. */
export function isWithinOpeningHours(
  start: Date,
  durationMinutes: number,
  hours: Record<number, { open: string; close: string } | null>,
  timeZone: string,
): boolean {
  const s = getLocalParts(start, timeZone);
  const day = hours[s.weekday];
  if (!day) return false;
  const toMin = (hhmm: string) => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const startMin = s.hour * 60 + s.minute;
  return startMin >= toMin(day.open) && startMin + durationMinutes <= toMin(day.close);
}
