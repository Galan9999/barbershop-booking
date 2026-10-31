/**
 * Business failures the application expects. Deliberately transport-agnostic:
 * the domain never knows about HTTP. The mapping to status codes lives in
 * `@/shared/http/api-error`.
 */
export type BookingErrorCode =
  | 'SLOT_TAKEN'
  | 'OUTSIDE_OPENING_HOURS'
  | 'TOO_SOON'
  | 'TOO_FAR_AHEAD'
  | 'TOKEN_NOT_FOUND'
  | 'APPOINTMENT_IN_PAST'
  | 'STORAGE_FAILURE';

export class BookingError extends Error {
  readonly code: BookingErrorCode;

  constructor(code: BookingErrorCode, message: string) {
    super(message);
    this.name = 'BookingError';
    this.code = code;
  }
}

export function isBookingError(error: unknown): error is BookingError {
  return error instanceof BookingError;
}
