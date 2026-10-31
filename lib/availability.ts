import 'server-only';
import {
  APPOINTMENT_MINUTES,
  BARBERS,
  MAX_ADVANCE_DAYS,
  MIN_ADVANCE_MINUTES,
  OPENING_HOURS,
  SLOT_MINUTES,
} from '@/lib/config';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  formatDayKey,
  formatDayLabel,
  formatTimeLabel,
  isSlotAligned,
  isWithinOpeningHours,
} from '@/lib/time';

export interface SlotAvailability {
  /** Slot start as UTC ISO string: exactly what POST /api/reserve expects. */
  iso: string;
  /** "HH:mm" in the business timezone. */
  time_label: string;
  /** Barbers already booked at this slot. */
  taken_by: string[];
}

export interface DayAvailability {
  /** Calendar day key in the business timezone, e.g. "2026-11-07". */
  day_key: string;
  /** e.g. "vie 7 nov". */
  day_label: string;
  slots: SlotAvailability[];
}

/**
 * Builds the bookable grid by iterating slot-boundary instants and applying the
 * SAME rules the reserve endpoint enforces (alignment, opening hours, notice,
 * horizon), so what the UI offers is exactly what the API accepts. A booking
 * race in between still resolves at the DB index → 409.
 */
export async function getAvailability(): Promise<{
  days: DayAvailability[];
  barbers: readonly string[];
  degraded: boolean;
}> {
  const timeZone = env.BUSINESS_TIMEZONE;
  const now = new Date();
  const slotMs = SLOT_MINUTES * 60_000;
  const windowStart = new Date(Math.ceil(now.getTime() / slotMs) * slotMs);
  const windowEnd = new Date(now.getTime() + MAX_ADVANCE_DAYS * 86_400_000);
  const minStartMs = now.getTime() + MIN_ADVANCE_MINUTES * 60_000;

  // Busy slots inside the window, keyed by normalized UTC ISO.
  const { data: busyRows, error } = await supabaseAdmin
    .from('appointments')
    .select('date_time, barber_name')
    .eq('status', 'confirmed')
    .gte('date_time', windowStart.toISOString())
    .lte('date_time', windowEnd.toISOString());
  if (error) {
    console.error('[availability] busy-slots query failed', { code: error.code });
  }
  const busy = new Map<string, string[]>();
  for (const row of busyRows ?? []) {
    const key = new Date(row.date_time).toISOString();
    busy.set(key, [...(busy.get(key) ?? []), row.barber_name]);
  }

  const days: DayAvailability[] = [];
  for (let t = windowStart.getTime(); t <= windowEnd.getTime(); t += slotMs) {
    const start = new Date(t);
    if (t < minStartMs) continue;
    if (!isSlotAligned(start, SLOT_MINUTES, timeZone)) continue;
    if (!isWithinOpeningHours(start, APPOINTMENT_MINUTES, OPENING_HOURS, timeZone)) continue;

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

  return { days, barbers: BARBERS, degraded: Boolean(error) };
}
