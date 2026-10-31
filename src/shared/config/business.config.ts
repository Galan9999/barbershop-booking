import type { WeeklyOpeningHours } from '@/shared/utils/datetime';

/** Business constants. Plain data, importable from both server and client. */

export const BUSINESS_NAME = 'Barbería Central';
export const BUSINESS_ADDRESS = 'Calle Mayor 1, Madrid';

export const BARBERS = ['Carlos', 'Miguel'] as const;
export type BarberName = (typeof BARBERS)[number];

/** Grid resolution and appointment length, in minutes. */
export const SLOT_MINUTES = 30;
export const APPOINTMENT_MINUTES = 30;

/** How soon a booking can be made, and how far ahead booking is open. */
export const MIN_ADVANCE_MINUTES = 60;
export const MAX_ADVANCE_DAYS = 30;

/** Opening hours in business-local wall-clock time; null means closed. */
export const OPENING_HOURS: WeeklyOpeningHours = {
  0: null,
  1: { open: '09:00', close: '20:00' },
  2: { open: '09:00', close: '20:00' },
  3: { open: '09:00', close: '20:00' },
  4: { open: '09:00', close: '20:00' },
  5: { open: '09:00', close: '20:00' },
  6: { open: '09:00', close: '14:00' },
};
