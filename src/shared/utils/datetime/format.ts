/** Human-facing date formatting, always in the business timezone. */

const LOCALE = 'es-ES';

/** e.g. "lunes, 2 de noviembre de 2026, 10:00". */
export function formatFullDateTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(instant);
}

/** e.g. "lun, 2 nov". */
export function formatDayLabel(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(instant);
}

/** e.g. "09:30". */
export function formatTimeLabel(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instant);
}

/** Stable calendar-day key in the business timezone, e.g. "2026-11-07". */
export function formatDayKey(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** "YYYYMMDDTHHMMSSZ", the UTC shape Google Calendar template URLs expect. */
export function formatAsCalendarTimestamp(instant: Date): string {
  return instant.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
