/** Business failures the application expects. Transport-agnostic on purpose:
 *  the domain never knows about HTTP. Routes map these onto status codes. */
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

export function isBookingError(err: unknown): err is BookingError {
  return err instanceof BookingError;
}
