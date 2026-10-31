import { NextResponse } from 'next/server';
import { ZodError, type ZodType, type ZodTypeDef } from 'zod';
import { jsonError, statusForDomainError } from '@/shared/http/api-error';
import { isBookingError } from '@/modules/booking/domain/booking-errors';

/**
 * The one place HTTP concerns live. Parses and validates the body, runs the
 * handler, and turns domain errors into responses, so each route file is left
 * with nothing but its own wiring.
 */
export async function handleJsonRoute<TParsed, TOutput>(
  request: Request,
  // Input stays `unknown`: schemas may transform (ISO string -> Date), so the
  // parsed type is not the raw body type.
  schema: ZodType<TParsed, ZodTypeDef, unknown>,
  handler: (input: TParsed) => Promise<{ body: TOutput; status?: number }>,
  routeName: string,
): Promise<NextResponse> {
  let input: TParsed;
  try {
    input = schema.parse(await request.json());
  } catch (err) {
    if (err instanceof ZodError) {
      return jsonError('VALIDATION_ERROR', 'Invalid request data.', 422, {
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return jsonError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400);
  }

  try {
    const { body, status = 200 } = await handler(input);
    return NextResponse.json(body, { status });
  } catch (err) {
    if (isBookingError(err)) {
      const status = statusForDomainError(err.code);
      // Expected 4xx failures are not incidents; 5xx ones are.
      if (status >= 500) console.error(`[${routeName}] domain failure`, { code: err.code });
      return jsonError(err.code, err.message, status);
    }
    console.error(`[${routeName}] unexpected error`, {
      cause: err instanceof Error ? err.message : 'unknown',
    });
    return jsonError('INTERNAL', 'Unexpected error. Try again.', 500);
  }
}
