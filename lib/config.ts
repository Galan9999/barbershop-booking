/** Business configuration. Plain data, safe to import anywhere. */

export const BARBERS = ['Carlos', 'Miguel'] as const;
export type BarberName = (typeof BARBERS)[number];

export const SLOT_MINUTES = 30;
export const APPOINTMENT_MINUTES = 30;

/** Minimum notice to book, and how far ahead booking is open. */
export const MIN_ADVANCE_MINUTES = 60;
export const MAX_ADVANCE_DAYS = 30;

/** Opening hours in business-local time. Key = weekday (0 = Sunday). */
export const OPENING_HOURS: Record<number, { open: string; close: string } | null> = {
  0: null, // Sunday closed
  1: { open: '09:00', close: '20:00' },
  2: { open: '09:00', close: '20:00' },
  3: { open: '09:00', close: '20:00' },
  4: { open: '09:00', close: '20:00' },
  5: { open: '09:00', close: '20:00' },
  6: { open: '09:00', close: '14:00' },
};

export const BUSINESS_NAME = 'Barbería Central';
export const BUSINESS_ADDRESS = 'Calle Mayor 1, Madrid';
