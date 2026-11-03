import {
  MAX_ADVANCE_DAYS,
  MIN_ADVANCE_MINUTES,
  OPENING_HOURS,
  SLOT_MINUTES,
} from '@/shared/config/business.config';
import { BookingError } from '@/modules/booking/domain/booking-errors';
import { DAY_MS, MINUTE_MS, isSlotAligned, isWithinOpeningHours } from '@/shared/utils/datetime';

/**
 * Pure booking rules: no I/O, no environment reads. The clock and the timezone
 * are arguments, which keeps these testable and lets both the write path and
 * the availability grid apply exactly the same checks.
 */

export function getUnbookableReason(
  start: Date,
  durationMinutes: number,
  now: Date,
  timeZone: string,
): BookingError | null {
  if (start.getTime() < now.getTime() + MIN_ADVANCE_MINUTES * MINUTE_MS) {
    return new BookingError(
      'TOO_SOON',
      `Bookings need at least ${MIN_ADVANCE_MINUTES} minutes notice.`,
    );
  }
  if (start.getTime() > now.getTime() + MAX_ADVANCE_DAYS * DAY_MS) {
    return new BookingError(
      'TOO_FAR_AHEAD',
      `Bookings open up to ${MAX_ADVANCE_DAYS} days ahead.`,
    );
  }
  if (
    !isSlotAligned(start, SLOT_MINUTES, timeZone) ||
    !isWithinOpeningHours(start, durationMinutes, OPENING_HOURS, timeZone)
  ) {
    return new BookingError('OUTSIDE_OPENING_HOURS', 'That time is not available for booking.');
  }
  return null;
}

export function isBookable(
  start: Date,
  durationMinutes: number,
  now: Date,
  timeZone: string,
): boolean {
  return getUnbookableReason(start, durationMinutes, now, timeZone) === null;
}

export function assertBookable(
  start: Date,
  durationMinutes: number,
  now: Date,
  timeZone: string,
): void {
  const reason = getUnbookableReason(start, durationMinutes, now, timeZone);
  if (reason) throw reason;
}
