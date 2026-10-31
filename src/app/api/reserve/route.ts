import type { NextResponse } from 'next/server';
import { handleJsonRoute } from '@/shared/http/route-handler';
import { methodNotAllowed } from '@/shared/http/api-error';
import { createBooking } from '@/modules/booking/application/booking.service';
import { reserveSchema } from '@/modules/booking/domain/booking.schemas';

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
