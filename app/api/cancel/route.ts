import type { NextResponse } from 'next/server';
import { handleJsonRoute } from '@/lib/api/handle-route';
import { methodNotAllowed } from '@/lib/api/response';
import { cancelBooking } from '@/lib/services/booking-service';
import { cancelSchema } from '@/lib/validation/appointment';

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
    async (input) => ({ body: await cancelBooking(input.token) }),
    'cancel',
  );
}

export function GET(): NextResponse {
  return methodNotAllowed('POST');
}
