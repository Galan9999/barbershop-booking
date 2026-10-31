import 'server-only';
import { isBookable } from '@/modules/booking/domain/booking-rules';
import { findBusySlots } from '@/modules/booking/infrastructure/appointment.repository';
import {
  BARBERS,
  MAX_ADVANCE_DAYS,
  SLOT_MINUTES,
} from '@/shared/config/business.config';
import { env } from '@/shared/config/env';
import {
  MINUTE_MS,
  addDays,
  ceilToSlot,
  formatDayKey,
  formatDayLabel,
  formatTimeLabel,
} from '@/shared/utils/datetime';

/** Serializable shapes: these cross the server/client boundary as props. */

export interface SlotAvailability {
  /** Slot start as UTC ISO string: exactly what the reserve endpoint expects. */
  iso: string;
  timeLabel: string;
  takenBy: string[];
}

export interface DayAvailability {
  /** Calendar day in the business timezone, e.g. "2026-11-07". */
  dayKey: string;
  dayLabel: string;
  slots: SlotAvailability[];
}

export interface Availability {
  days: DayAvailability[];
  barbers: string[];
  /** True when the busy-slot lookup failed and the grid may be stale. */
  degraded: boolean;
}

/**
 * Builds the bookable grid with the same domain rules the reserve endpoint
 * enforces, so the UI cannot offer a slot the API would reject. A booking that
 * lands between page load and submit still resolves at the database index.
 */
export async function getAvailability(now: Date = new Date()): Promise<Availability> {
  const timeZone = env.BUSINESS_TIMEZONE;
  const windowStart = ceilToSlot(now, SLOT_MINUTES);
  const windowEnd = addDays(now, MAX_ADVANCE_DAYS);

  const busyRows = await findBusySlots(windowStart, windowEnd);
  const busyByInstant = new Map<string, string[]>();
  for (const row of busyRows ?? []) {
    const key = row.startsAt.toISOString();
    busyByInstant.set(key, [...(busyByInstant.get(key) ?? []), row.barberName]);
  }

  const slotMs = SLOT_MINUTES * MINUTE_MS;
  const days: DayAvailability[] = [];

  for (let time = windowStart.getTime(); time <= windowEnd.getTime(); time += slotMs) {
    const start = new Date(time);
    if (!isBookable(start, now, timeZone)) continue;

    const dayKey = formatDayKey(start, timeZone);
    let day = days.at(-1);
    if (!day || day.dayKey !== dayKey) {
      day = { dayKey, dayLabel: formatDayLabel(start, timeZone), slots: [] };
      days.push(day);
    }

    const iso = start.toISOString();
    day.slots.push({
      iso,
      timeLabel: formatTimeLabel(start, timeZone),
      takenBy: busyByInstant.get(iso) ?? [],
    });
  }

  return { days, barbers: [...BARBERS], degraded: busyRows === null };
}
