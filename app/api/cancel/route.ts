import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { jsonError, methodNotAllowed } from '@/lib/api/response';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatForHumans } from '@/lib/time';
import { cancelSchema } from '@/lib/validation/appointment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cancel  { token: uuid }
 * Cancels by capability token. Mutation is POST-only: email-client link
 * scanners follow GETs, so GET /cancel/[token] only renders a page.
 *
 * The conditional UPDATE (status='confirmed' AND future) makes it atomic and
 * idempotent: a double click cannot cancel twice, and cancelling flips the row
 * out of the partial unique index, freeing the slot instantly.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    let token: string;
    try {
      token = cancelSchema.parse(await request.json()).token;
    } catch (err) {
      if (err instanceof ZodError) {
        return jsonError('VALIDATION_ERROR', 'A valid cancellation token is required.', 422);
      }
      return jsonError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400);
    }

    const nowIso = new Date().toISOString();
    const { data: cancelled, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled', cancelled_at: nowIso })
      .eq('cancel_token', token)
      .eq('status', 'confirmed')
      .gt('date_time', nowIso)
      .select('id, date_time, barber_name')
      .maybeSingle();

    if (updateError) {
      console.error('[cancel] update failed', { code: updateError.code });
      return jsonError('INTERNAL', 'Could not cancel the appointment. Try again.', 500);
    }

    if (cancelled) {
      return NextResponse.json({
        cancelled: true,
        appointment: {
          id: cancelled.id,
          barber_name: cancelled.barber_name,
          formatted_date_time: formatForHumans(
            new Date(cancelled.date_time),
            env.BUSINESS_TIMEZONE,
          ),
        },
      });
    }

    // Nothing updated: distinguish why, without leaking data beyond the token holder.
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('appointments')
      .select('status, date_time')
      .eq('cancel_token', token)
      .maybeSingle();

    if (lookupError) {
      console.error('[cancel] lookup failed', { code: lookupError.code });
      return jsonError('INTERNAL', 'Could not cancel the appointment. Try again.', 500);
    }
    if (!existing) {
      return jsonError('TOKEN_NOT_FOUND', 'This cancellation link is not valid.', 404);
    }
    if (existing.status === 'cancelled') {
      // Idempotent outcome: the appointment is cancelled either way.
      return NextResponse.json({ cancelled: true, already_cancelled: true });
    }
    return jsonError(
      'APPOINTMENT_IN_PAST',
      'This appointment already took place and can no longer be cancelled.',
      410,
    );
  } catch (err) {
    console.error('[cancel] unexpected error', {
      cause: err instanceof Error ? err.message : 'unknown',
    });
    return jsonError('INTERNAL', 'Unexpected error. Try again.', 500);
  }
}

export function GET(): NextResponse {
  return methodNotAllowed('POST');
}
