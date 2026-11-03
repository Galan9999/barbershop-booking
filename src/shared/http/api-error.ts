import { NextResponse } from 'next/server';
import type { BookingErrorCode } from '@/modules/booking/domain/booking-errors';

/** Transport-level codes, on top of the domain ones. Both are API contract. */
export type ApiErrorCode =
  | BookingErrorCode
  | 'VALIDATION_ERROR'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL';

/** HTTP status for each domain failure: the single place that mapping lives. */
const DOMAIN_STATUS: Record<BookingErrorCode, number> = {
  SLOT_TAKEN: 409,
  OUTSIDE_OPENING_HOURS: 422,
  TOO_SOON: 422,
  TOO_FAR_AHEAD: 422,
  UNKNOWN_SERVICE: 422,
  TOKEN_NOT_FOUND: 404,
  APPOINTMENT_IN_PAST: 410,
  STORAGE_FAILURE: 500,
};

export function statusForDomainError(code: BookingErrorCode): number {
  return DOMAIN_STATUS[code];
}

/** Stable error envelope: { error: { code, message } }. */
export function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export function methodNotAllowed(allow: string): NextResponse {
  const res = jsonError('METHOD_NOT_ALLOWED', `Use ${allow}.`, 405);
  res.headers.set('Allow', allow);
  return res;
}
