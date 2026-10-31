import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'SLOT_TAKEN'
  | 'OUTSIDE_OPENING_HOURS'
  | 'TOO_SOON'
  | 'TOO_FAR_AHEAD'
  | 'TOKEN_NOT_FOUND'
  | 'ALREADY_CANCELLED'
  | 'APPOINTMENT_IN_PAST'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL';

/** Stable error envelope: { error: { code, message } }. Codes are API contract. */
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
