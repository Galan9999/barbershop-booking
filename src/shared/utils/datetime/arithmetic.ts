/** Instant arithmetic. Timezone-safe because it never touches wall-clock fields. */

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * MINUTE_MS);
}

export function addDays(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * DAY_MS);
}

/** Rounds an instant up to the next slot boundary. */
export function ceilToSlot(instant: Date, slotMinutes: number): Date {
  const slotMs = slotMinutes * MINUTE_MS;
  return new Date(Math.ceil(instant.getTime() / slotMs) * slotMs);
}
