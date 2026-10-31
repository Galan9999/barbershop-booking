import type { NextResponse } from 'next/server';
import { getBookingService } from '@/modules/booking/booking.module';
import { cancelSchema } from '@/modules/booking/application/dto/booking.dto';
import { methodNotAllowed } from '@/shared/http/api-error';
import { handleJsonRoute } from '@/shared/http/route-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cancel — cancel by capability token.
 * Mutations are POST-only: email clients prefetch links, so GET must not act.
 */
export function POST(request: Request): Promise<NextResponse> {
  return handleJsonRoute(
    request,
    cancelSchema,
    async (input) => ({ body: await getBookingService().cancelBooking(input.token) }),
    'cancel',
  );
}

export function GET(): NextResponse {
  return methodNotAllowed('POST');
}
