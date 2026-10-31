import { isBookable } from '@/modules/booking/domain/booking-rules';
import type { AppointmentRepository } from '@/modules/booking/domain/interfaces/appointment-repository.interface';
import type { Clock } from '@/modules/booking/domain/interfaces/clock.interface';
import { TimeSlot } from '@/modules/booking/domain/value-objects/time-slot';
import { MAX_ADVANCE_DAYS, SLOT_MINUTES } from '@/shared/config/business.config';
import {
  MINUTE_MS,
  addDays,
  ceilToSlot,
  formatDayKey,
  formatDayLabel,
  formatTimeLabel,
} from '@/shared/utils/datetime';

/** Serializable read models: these cross the server/client boundary as props. */

export interface SlotAvailabilityDto {
  /** Slot start as UTC ISO string: exactly what the reserve endpoint expects. */
  iso: string;
  timeLabel: string;
  takenBy: string[];
}

export interface DayAvailabilityDto {
  /** Calendar day in the business timezone, e.g. "2026-11-07". */
  dayKey: string;
  dayLabel: string;
  slots: SlotAvailabilityDto[];
}

export interface AvailabilityDto {
  days: DayAvailabilityDto[];
  barbers: string[];
  /** True when the busy-slot lookup failed and the grid may be stale. */
  degraded: boolean;
}

export interface AvailabilityServiceDependencies {
  repository: AppointmentRepository;
  clock: Clock;
  timeZone: string;
  barbers: readonly string[];
}

/**
 * Builds the bookable grid with the same domain rules the booking use case
 * enforces, so the UI cannot offer a slot the API would reject. A booking that
 * lands between page load and submit still resolves at the database index.
 */
export class AvailabilityService {
  private readonly deps: AvailabilityServiceDependencies;

  constructor(dependencies: AvailabilityServiceDependencies) {
    this.deps = dependencies;
  }

  async getAvailability(): Promise<AvailabilityDto> {
    const { clock, repository, timeZone, barbers } = this.deps;
    const now = clock.now();
    const windowStart = ceilToSlot(now, SLOT_MINUTES);
    const windowEnd = addDays(now, MAX_ADVANCE_DAYS);

    const busySlots = await repository.findConfirmedBetween(windowStart, windowEnd);
    const takenByInstant = groupBarbersByInstant(busySlots ?? []);

    const slotMs = SLOT_MINUTES * MINUTE_MS;
    const days: DayAvailabilityDto[] = [];

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
        takenBy: takenByInstant.get(iso) ?? [],
      });
    }

    return { days, barbers: [...barbers], degraded: busySlots === null };
  }
}

function groupBarbersByInstant(slots: TimeSlot[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const slot of slots) {
    const key = slot.startsAt.toISOString();
    grouped.set(key, [...(grouped.get(key) ?? []), slot.barberName]);
  }
  return grouped;
}
