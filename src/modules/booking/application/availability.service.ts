import { isBookable } from '@/modules/booking/domain/booking-rules';
import type {
  AppointmentRepository,
  BookedInterval,
} from '@/modules/booking/domain/interfaces/appointment-repository.interface';
import type { Clock } from '@/modules/booking/domain/interfaces/clock.interface';
import {
  MAX_ADVANCE_DAYS,
  MIN_ADVANCE_MINUTES,
  SLOT_MINUTES,
  type BookableService,
} from '@/shared/config/business.config';
import {
  MINUTE_MS,
  addDays,
  ceilToSlot,
  formatDayKey,
  formatDayLabel,
  formatTimeLabel,
} from '@/shared/utils/datetime';
import { formatPrice } from '@/shared/utils/money/format-price';

/** Serializable read models: these cross the server/client boundary as props. */

export interface SlotAvailabilityDto {
  /** Slot start as UTC ISO string: exactly what the reserve endpoint expects. */
  iso: string;
  timeLabel: string;
  /** Barbers busy at any point of this slot, including by a longer booking. */
  takenBy: string[];
}

export interface ServiceDto {
  id: string;
  label: string;
  minutes: number;
  price: number;
  /** "15 €", formatted once on the server. */
  priceLabel: string;
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
  services: ServiceDto[];
  /** Grid step. A service of N minutes needs N / slotMinutes free slots in a row. */
  slotMinutes: number;
  /** Same notice the server enforces, so an open page can expire slots itself. */
  minAdvanceMinutes: number;
  paymentNote: string;
  /** True when the busy-slot lookup failed and the grid may be stale. */
  degraded: boolean;
}

export interface AvailabilityServiceDependencies {
  repository: AppointmentRepository;
  clock: Clock;
  timeZone: string;
  barbers: readonly string[];
  services: readonly BookableService[];
  paymentNote: string;
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
    const { clock, repository, timeZone, barbers, services, paymentNote } = this.deps;
    const now = clock.now();
    const windowStart = ceilToSlot(now, SLOT_MINUTES);
    const windowEnd = addDays(now, MAX_ADVANCE_DAYS);

    const busySlots = await repository.findConfirmedBetween(windowStart, windowEnd);
    const takenByInstant = groupBarbersBySlot(busySlots ?? []);

    const slotMs = SLOT_MINUTES * MINUTE_MS;
    const days: DayAvailabilityDto[] = [];

    for (let time = windowStart.getTime(); time <= windowEnd.getTime(); time += slotMs) {
      const start = new Date(time);
      // Each grid cell is one slot. Whether a longer service fits from here
      // (enough free slots in a row before closing) is decided per service by
      // the form, and re-checked by the booking use case and the database.
      if (!isBookable(start, SLOT_MINUTES, now, timeZone)) continue;

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

    return {
      days,
      barbers: [...barbers],
      services: services.map((service) => ({
        ...service,
        priceLabel: formatPrice(service.price),
      })),
      slotMinutes: SLOT_MINUTES,
      minAdvanceMinutes: MIN_ADVANCE_MINUTES,
      paymentNote,
      degraded: busySlots === null,
    };
  }
}

/**
 * Spreads each booking over every grid slot it covers, so a one-hour booking
 * at 10:00 marks both 10:00 and 10:30 as taken. Keyed by slot start ISO.
 */
function groupBarbersBySlot(bookings: BookedInterval[]): Map<string, string[]> {
  const slotMs = SLOT_MINUTES * MINUTE_MS;
  const grouped = new Map<string, string[]>();
  for (const booking of bookings) {
    const firstSlot = Math.floor(booking.startsAt.getTime() / slotMs) * slotMs;
    for (let time = firstSlot; time < booking.endsAt.getTime(); time += slotMs) {
      const key = new Date(time).toISOString();
      grouped.set(key, [...(grouped.get(key) ?? []), booking.barberName]);
    }
  }
  return grouped;
}
