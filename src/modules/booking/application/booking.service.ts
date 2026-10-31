import 'server-only';
import type {
  NewAppointment,
  StoredAppointment,
} from '@/modules/booking/domain/appointment.types';
import { BookingError } from '@/modules/booking/domain/booking-errors';
import { assertBookable } from '@/modules/booking/domain/booking-rules';
import { sendConfirmationEmail } from '@/modules/booking/infrastructure/confirmation-email';
import {
  cancelByToken,
  findByToken,
  findConfirmedBySlot,
  insertAppointment,
  SlotTakenError,
} from '@/modules/booking/infrastructure/appointment.repository';
import {
  APPOINTMENT_MINUTES,
  BUSINESS_ADDRESS,
  BUSINESS_NAME,
} from '@/shared/config/business.config';
import { env } from '@/shared/config/env';
import { buildGoogleCalendarUrl } from '@/shared/utils/calendar/google-calendar-url';
import { addMinutes, formatFullDateTime } from '@/shared/utils/datetime';

/**
 * Booking use cases. This layer orchestrates rules, persistence and side
 * effects, and knows nothing about HTTP: it takes plain input and either
 * returns a result or throws a BookingError.
 */

/** What the API returns on a successful booking. */
export interface BookingConfirmation {
  appointment: {
    id: string;
    client_name: string;
    date_time: string;
    barber_name: string;
    status: 'confirmed';
  };
  formatted_date_time: string;
  google_calendar_url: string;
  email_sent: boolean;
  /** True when this request re-confirmed a booking the client already had. */
  idempotent_replay: boolean;
}

export async function createBooking(
  input: NewAppointment,
  now: Date = new Date(),
): Promise<BookingConfirmation> {
  assertBookable(input.startsAt, now, env.BUSINESS_TIMEZONE);

  let stored: StoredAppointment;
  try {
    stored = await insertAppointment(input);
  } catch (error) {
    if (!(error instanceof SlotTakenError)) throw error;
    // Either we lost the race, or the same client double-submitted. Only the
    // second case is safe to report as success, so check who owns the slot.
    const existing = await findConfirmedBySlot(input.barberName, input.startsAt);
    if (existing?.clientEmail === input.clientEmail) {
      return presentBooking(existing, { emailSent: false, idempotentReplay: true });
    }
    throw new BookingError('SLOT_TAKEN', 'That slot has just been booked. Pick another one.');
  }

  // Deliberately after the write: a failed email must never undo a stored
  // booking, so its outcome is reported rather than thrown.
  const { sent } = await sendConfirmationEmail({
    to: stored.clientEmail,
    clientName: stored.clientName,
    barberName: stored.barberName,
    businessName: BUSINESS_NAME,
    businessAddress: BUSINESS_ADDRESS,
    formattedDateTime: formatFullDateTime(stored.startsAt, env.BUSINESS_TIMEZONE),
    googleCalendarUrl: buildCalendarUrlFor(stored),
    cancelUrl: buildCancelUrl(stored.cancelToken),
  });

  return presentBooking(stored, { emailSent: sent, idempotentReplay: false });
}

export interface CancellationResult {
  cancelled: true;
  already_cancelled?: boolean;
  appointment?: { id: string; barber_name: string; formatted_date_time: string };
}

export async function cancelBooking(
  token: string,
  now: Date = new Date(),
): Promise<CancellationResult> {
  const cancelled = await cancelByToken(token, now);
  if (cancelled) {
    return {
      cancelled: true,
      appointment: {
        id: cancelled.id,
        barber_name: cancelled.barberName,
        formatted_date_time: formatFullDateTime(cancelled.startsAt, env.BUSINESS_TIMEZONE),
      },
    };
  }

  // Nothing was updated: explain why, without revealing more than the token
  // holder already knows.
  const existing = await findByToken(token);
  if (!existing) {
    throw new BookingError('TOKEN_NOT_FOUND', 'This cancellation link is not valid.');
  }
  if (existing.status === 'cancelled') {
    return { cancelled: true, already_cancelled: true };
  }
  throw new BookingError(
    'APPOINTMENT_IN_PAST',
    'This appointment already took place and can no longer be cancelled.',
  );
}

function buildCancelUrl(cancelToken: string): string {
  return `${env.NEXT_PUBLIC_APP_URL}/cancel/${cancelToken}`;
}

function buildCalendarUrlFor(appointment: StoredAppointment): string {
  return buildGoogleCalendarUrl({
    title: `${BUSINESS_NAME} — ${appointment.barberName}`,
    start: appointment.startsAt,
    end: addMinutes(appointment.startsAt, APPOINTMENT_MINUTES),
    details: `Cita con ${appointment.barberName}. Reserva a nombre de ${appointment.clientName}.`,
    location: BUSINESS_ADDRESS,
  });
}

function presentBooking(
  appointment: StoredAppointment,
  flags: { emailSent: boolean; idempotentReplay: boolean },
): BookingConfirmation {
  return {
    appointment: {
      id: appointment.id,
      client_name: appointment.clientName,
      date_time: appointment.startsAt.toISOString(),
      barber_name: appointment.barberName,
      status: 'confirmed',
    },
    formatted_date_time: formatFullDateTime(appointment.startsAt, env.BUSINESS_TIMEZONE),
    google_calendar_url: buildCalendarUrlFor(appointment),
    email_sent: flags.emailSent,
    idempotent_replay: flags.idempotentReplay,
  };
}
