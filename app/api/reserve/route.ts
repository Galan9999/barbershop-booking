import type { NextResponse } from 'next/server';
import { handleJsonRoute } from '@/lib/api/handle-route';
import { methodNotAllowed } from '@/lib/api/response';
import { createBooking } from '@/lib/services/booking-service';
import { reserveSchema } from '@/lib/validation/appointment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/reserve — create a booking. */
export function POST(request: Request): Promise<NextResponse> {
  return handleJsonRoute(
    request,
    reserveSchema,
    async (input) => {
      const confirmation = await createBooking({
        clientName: input.client_name,
        clientEmail: input.client_email,
        startsAt: input.date_time,
        barberName: input.barber_name,
      });
      return {
        body: confirmation,
        status: confirmation.idempotent_replay ? 200 : 201,
      };
    },
    'reserve',
  );
}

export function GET(): NextResponse {
  return methodNotAllowed('POST');
}
