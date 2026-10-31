import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  APPOINTMENT_MINUTES,
  BUSINESS_ADDRESS,
  BUSINESS_NAME,
  MAX_ADVANCE_DAYS,
  MIN_ADVANCE_MINUTES,
  OPENING_HOURS,
  SLOT_MINUTES,
} from '@/lib/config';
import { jsonError, methodNotAllowed } from '@/lib/api/response';
import { env } from '@/lib/env';
import { sendConfirmationEmail } from '@/lib/email/resend';
import { buildGoogleCalendarUrl } from '@/lib/google-calendar';
import { PG_UNIQUE_VIOLATION, supabaseAdmin } from '@/lib/supabase/admin';
import {
  addMinutes,
  formatForHumans,
  isSlotAligned,
  isWithinOpeningHours,
} from '@/lib/time';
import { reserveSchema, type ReserveInput } from '@/lib/validation/appointment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PublicAppointment {
  id: string;
  client_name: string;
  date_time: string;
  barber_name: string;
  status: 'confirmed';
}

/**
 * POST /api/reserve
 * Creates a booking. Concurrency is settled by the DB partial unique index:
 * on 23505 we return 409 SLOT_TAKEN, or replay the success response when the
 * same client retries the same slot (idempotent double-submit).
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    // 1. Parse + validate shape.
    let input: ReserveInput;
    try {
      input = reserveSchema.parse(await request.json());
    } catch (err) {
      if (err instanceof ZodError) {
        return jsonError('VALIDATION_ERROR', 'Invalid booking data.', 422, {
          issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      return jsonError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400);
    }

    // 2. Business rules (evaluated in the business timezone).
    const now = new Date();
    const start = input.date_time;
    if (start.getTime() < now.getTime() + MIN_ADVANCE_MINUTES * 60_000) {
      return jsonError(
        'TOO_SOON',
        `Bookings need at least ${MIN_ADVANCE_MINUTES} minutes notice.`,
        422,
      );
    }
    if (start.getTime() > now.getTime() + MAX_ADVANCE_DAYS * 86_400_000) {
      return jsonError(
        'TOO_FAR_AHEAD',
        `Bookings open up to ${MAX_ADVANCE_DAYS} days ahead.`,
        422,
      );
    }
    if (
      !isSlotAligned(start, SLOT_MINUTES, env.BUSINESS_TIMEZONE) ||
      !isWithinOpeningHours(start, APPOINTMENT_MINUTES, OPENING_HOURS, env.BUSINESS_TIMEZONE)
    ) {
      return jsonError('OUTSIDE_OPENING_HOURS', 'That time is not available for booking.', 422);
    }

    // 3. Insert. The partial unique index is the single source of truth for slots.
    const { data: created, error: insertError } = await supabaseAdmin
      .from('appointments')
      .insert({
        client_name: input.client_name,
        client_email: input.client_email,
        date_time: start.toISOString(),
        barber_name: input.barber_name,
      })
      .select('id, client_name, client_email, date_time, barber_name, status, cancel_token')
      .single();

    if (insertError) {
      if (insertError.code === PG_UNIQUE_VIOLATION) {
        // Same client retrying the same slot? Replay success instead of 409.
        const { data: existing } = await supabaseAdmin
          .from('appointments')
          .select('id, client_name, client_email, date_time, barber_name, status')
          .eq('barber_name', input.barber_name)
          .eq('date_time', start.toISOString())
          .eq('status', 'confirmed')
          .maybeSingle();
        if (existing && existing.client_email === input.client_email) {
          return NextResponse.json(
            buildSuccessPayload(existing, start, { sent: false }, true),
            { status: 200 },
          );
        }
        return jsonError('SLOT_TAKEN', 'That slot has just been booked. Pick another one.', 409);
      }
      console.error('[reserve] insert failed', { code: insertError.code });
      return jsonError('INTERNAL', 'Could not create the booking. Try again.', 500);
    }

    // 4. Side effects: calendar link + confirmation email (failure never rolls back).
    const end = addMinutes(start, APPOINTMENT_MINUTES);
    const googleCalendarUrl = buildGoogleCalendarUrl({
      title: `${BUSINESS_NAME} — ${created.barber_name}`,
      start,
      end,
      details: `Cita con ${created.barber_name}. Reserva a nombre de ${created.client_name}.`,
      location: BUSINESS_ADDRESS,
    });
    const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/cancel/${created.cancel_token}`;
    const emailResult = await sendConfirmationEmail({
      to: created.client_email,
      clientName: created.client_name,
      barberName: created.barber_name,
      businessName: BUSINESS_NAME,
      businessAddress: BUSINESS_ADDRESS,
      formattedDateTime: formatForHumans(start, env.BUSINESS_TIMEZONE),
      googleCalendarUrl,
      cancelUrl,
    });

    // 5. Respond. cancel_token is deliberately NOT included (S6).
    return NextResponse.json(buildSuccessPayload(created, start, emailResult, false), {
      status: 201,
    });
  } catch (err) {
    console.error('[reserve] unexpected error', {
      cause: err instanceof Error ? err.message : 'unknown',
    });
    return jsonError('INTERNAL', 'Unexpected error. Try again.', 500);
  }
}

function buildSuccessPayload(
  row: { id: string; client_name: string; date_time: string; barber_name: string },
  start: Date,
  email: { sent: boolean },
  idempotentReplay: boolean,
) {
  const appointment: PublicAppointment = {
    id: row.id,
    client_name: row.client_name,
    date_time: row.date_time,
    barber_name: row.barber_name,
    status: 'confirmed',
  };
  return {
    appointment,
    formatted_date_time: formatForHumans(start, env.BUSINESS_TIMEZONE),
    google_calendar_url: buildGoogleCalendarUrl({
      title: `${BUSINESS_NAME} — ${row.barber_name}`,
      start,
      end: addMinutes(start, APPOINTMENT_MINUTES),
      details: `Cita con ${row.barber_name}. Reserva a nombre de ${row.client_name}.`,
      location: BUSINESS_ADDRESS,
    }),
    email_sent: email.sent,
    idempotent_replay: idempotentReplay,
  };
}

export function GET(): NextResponse {
  return methodNotAllowed('POST');
}
