import 'server-only';
import { BARBERS, MAX_ADVANCE_DAYS, SLOT_MINUTES } from '@/lib/config';
import { isBookable } from '@/lib/domain/booking-rules';
import { env } from '@/lib/env';
import { findBusySlots } from '@/lib/repositories/appointment-repository';
import { formatDayKey, formatDayLabel, formatTimeLabel } from '@/lib/time';

export interface SlotAvailability {
  /** Slot start as UTC ISO string: exactly what the reserve endpoint expects. */
  iso: string;
  time_label: string;
  taken_by: string[];
}

export interface DayAvailability {
  day_key: string;
  day_label: string;
  slots: SlotAvailability[];
}

export interface Availability {
  days: DayAvailability[];
  barbers: readonly string[];
  /** True when the busy-slot lookup failed and the grid may show stale slots. */
  degraded: boolean;
}

/**
 * Builds the bookable grid using the same domain rules the reserve endpoint
 * enforces, so the UI cannot offer a slot the API would reject. A booking that
 * lands between page load and submit still resolves at the database index.
 */
export async function getAvailability(now: Date = new Date()): Promise<Availability> {
  const timeZone = env.BUSINESS_TIMEZONE;
  const slotMs = SLOT_MINUTES * 60_000;
  const windowStart = new Date(Math.ceil(now.getTime() / slotMs) * slotMs);
  const windowEnd = new Date(now.getTime() + MAX_ADVANCE_DAYS * 86_400_000);

  const busyRows = await findBusySlots(windowStart, windowEnd);
  const busy = new Map<string, string[]>();
  for (const row of busyRows ?? []) {
    const key = new Date(row.date_time).toISOString();
    busy.set(key, [...(busy.get(key) ?? []), row.barber_name]);
  }

  const days: DayAvailability[] = [];
  for (let t = windowStart.getTime(); t <= windowEnd.getTime(); t += slotMs) {
    const start = new Date(t);
    if (!isBookable(start, now, timeZone)) continue;

    const dayKey = formatDayKey(start, timeZone);
    let day = days[days.length - 1];
    if (!day || day.day_key !== dayKey) {
      day = { day_key: dayKey, day_label: formatDayLabel(start, timeZone), slots: [] };
      days.push(day);
    }
    const iso = start.toISOString();
    day.slots.push({
      iso,
      time_label: formatTimeLabel(start, timeZone),
      taken_by: busy.get(iso) ?? [],
    });
  }

  return { days, barbers: BARBERS, degraded: busyRows === null };
}
