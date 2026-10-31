import type { NextResponse } from 'next/server';
import { getBookingService } from '@/modules/booking/booking.module';
import { reserveSchema } from '@/modules/booking/application/dto/booking.dto';
import { methodNotAllowed } from '@/shared/http/api-error';
import { handleJsonRoute } from '@/shared/http/route-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/reserve — create a booking. Presentation only translates. */
export function POST(request: Request): Promise<NextResponse> {
  return handleJsonRoute(
    request,
    reserveSchema,
    async (input) => {
      const confirmation = await getBookingService().createBooking({
        clientFirstName: input.client_first_name,
        clientLastName: input.client_last_name,
        clientEmail: input.client_email,
        clientPhone: input.client_phone,
        startsAt: input.date_time,
        barberName: input.barber_name,
      });
      return { body: confirmation, status: confirmation.idempotent_replay ? 200 : 201 };
    },
    'reserve',
  );
}

export function GET(): NextResponse {
  return methodNotAllowed('POST');
}
