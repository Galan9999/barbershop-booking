import 'server-only';
import {
  APPOINTMENT_MINUTES,
  BUSINESS_ADDRESS,
  BUSINESS_NAME,
} from '@/lib/config';
import { assertBookable } from '@/lib/domain/booking-rules';
import { BookingError } from '@/lib/domain/errors';
import { sendConfirmationEmail } from '@/lib/email/send-confirmation';
import { env } from '@/lib/env';
import { buildGoogleCalendarUrl } from '@/lib/google-calendar';
import {
  cancelByToken,
  findByToken,
  findConfirmedBySlot,
  insertAppointment,
  SlotTakenError,
  type StoredAppointment,
} from '@/lib/repositories/appointment-repository';
import { addMinutes, formatForHumans } from '@/lib/time';

/**
 * Booking use cases. This layer owns the orchestration — rules, persistence,
 * calendar link, email — and knows nothing about HTTP: it takes plain input
 * and returns plain results or throws BookingError.
 */

export interface CreateBookingInput {
  clientName: string;
  clientEmail: string;
  startsAt: Date;
  barberName: string;
}

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
  /** True when this request re-confirmed a booking the same client already had. */
  idempotent_replay: boolean;
}

export async function createBooking(
  input: CreateBookingInput,
  now: Date = new Date(),
): Promise<BookingConfirmation> {
  assertBookable(input.startsAt, now, env.BUSINESS_TIMEZONE);

  let stored: StoredAppointment;
  try {
    stored = await insertAppointment(input);
  } catch (err) {
    if (!(err instanceof SlotTakenError)) throw err;
    // Lost the race, or the same client double-submitted. Only the latter is
    // safe to treat as success, so compare the owner before replaying.
    const existing = await findConfirmedBySlot(input.barberName, input.startsAt);
    if (existing?.client_email === input.clientEmail) {
      return presentBooking(existing, { emailSent: false, idempotentReplay: true });
    }
    throw new BookingError('SLOT_TAKEN', 'That slot has just been booked. Pick another one.');
  }

  // Side effect, deliberately after the write: a failed email must never undo
  // a stored booking, so its outcome is reported, not thrown.
  const { sent } = await sendConfirmationEmail({
    to: stored.client_email,
    clientName: stored.client_name,
    barberName: stored.barber_name,
    businessName: BUSINESS_NAME,
    businessAddress: BUSINESS_ADDRESS,
    formattedDateTime: formatForHumans(input.startsAt, env.BUSINESS_TIMEZONE),
    googleCalendarUrl: buildCalendarUrl(stored),
    cancelUrl: `${env.NEXT_PUBLIC_APP_URL}/cancel/${stored.cancel_token}`,
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
        barber_name: cancelled.barber_name,
        formatted_date_time: formatForHumans(
          new Date(cancelled.date_time),
          env.BUSINESS_TIMEZONE,
        ),
      },
    };
  }

  // Nothing was updated: say why, without revealing more than the token holder knows.
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

function buildCalendarUrl(stored: StoredAppointment): string {
  const start = new Date(stored.date_time);
  return buildGoogleCalendarUrl({
    title: `${BUSINESS_NAME} — ${stored.barber_name}`,
    start,
    end: addMinutes(start, APPOINTMENT_MINUTES),
    details: `Cita con ${stored.barber_name}. Reserva a nombre de ${stored.client_name}.`,
    location: BUSINESS_ADDRESS,
  });
}

function presentBooking(
  stored: StoredAppointment,
  flags: { emailSent: boolean; idempotentReplay: boolean },
): BookingConfirmation {
  const start = new Date(stored.date_time);
  return {
    appointment: {
      id: stored.id,
      client_name: stored.client_name,
      date_time: stored.date_time,
      barber_name: stored.barber_name,
      status: 'confirmed',
    },
    formatted_date_time: formatForHumans(start, env.BUSINESS_TIMEZONE),
    google_calendar_url: buildCalendarUrl(stored),
    email_sent: flags.emailSent,
    idempotent_replay: flags.idempotentReplay,
  };
}
