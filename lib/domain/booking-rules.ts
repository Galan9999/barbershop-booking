import {
  APPOINTMENT_MINUTES,
  MAX_ADVANCE_DAYS,
  MIN_ADVANCE_MINUTES,
  OPENING_HOURS,
  SLOT_MINUTES,
} from '@/lib/config';
import { BookingError } from '@/lib/domain/errors';
import { isSlotAligned, isWithinOpeningHours } from '@/lib/time';

/**
 * Pure booking rules. No I/O, no env reads, no HTTP: the timezone and the
 * clock are arguments, which is what makes these testable and what keeps the
 * same checks usable from both the API and the availability grid.
 */
export function isBookable(start: Date, now: Date, timeZone: string): boolean {
  return getUnbookableReason(start, now, timeZone) === null;
}

export function getUnbookableReason(
  start: Date,
  now: Date,
  timeZone: string,
): BookingError | null {
  if (start.getTime() < now.getTime() + MIN_ADVANCE_MINUTES * 60_000) {
    return new BookingError(
      'TOO_SOON',
      `Bookings need at least ${MIN_ADVANCE_MINUTES} minutes notice.`,
    );
  }
  if (start.getTime() > now.getTime() + MAX_ADVANCE_DAYS * 86_400_000) {
    return new BookingError(
      'TOO_FAR_AHEAD',
      `Bookings open up to ${MAX_ADVANCE_DAYS} days ahead.`,
    );
  }
  if (
    !isSlotAligned(start, SLOT_MINUTES, timeZone) ||
    !isWithinOpeningHours(start, APPOINTMENT_MINUTES, OPENING_HOURS, timeZone)
  ) {
    return new BookingError(
      'OUTSIDE_OPENING_HOURS',
      'That time is not available for booking.',
    );
  }
  return null;
}

export function assertBookable(start: Date, now: Date, timeZone: string): void {
  const reason = getUnbookableReason(start, now, timeZone);
  if (reason) throw reason;
}
