import { BookingError } from '@/modules/booking/domain/booking-errors';

/**
 * An appointment, with the behaviour that belongs to it.
 *
 * Pure domain: no persistence, no transport, no environment. Anything that
 * answers "what is true about this appointment?" lives here rather than being
 * re-derived by each caller.
 */

export type AppointmentStatus = 'confirmed' | 'cancelled';

export interface AppointmentProps {
  id: string;
  clientName: string;
  clientEmail: string;
  startsAt: Date;
  barberName: string;
  status: AppointmentStatus;
  cancelToken: string;
}

export class Appointment {
  readonly id: string;
  readonly clientName: string;
  readonly clientEmail: string;
  readonly startsAt: Date;
  readonly barberName: string;
  readonly status: AppointmentStatus;
  readonly cancelToken: string;

  constructor(props: AppointmentProps) {
    this.id = props.id;
    this.clientName = props.clientName;
    this.clientEmail = props.clientEmail;
    this.startsAt = props.startsAt;
    this.barberName = props.barberName;
    this.status = props.status;
    this.cancelToken = props.cancelToken;
  }

  get isConfirmed(): boolean {
    return this.status === 'confirmed';
  }

  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  hasPassed(now: Date): boolean {
    return this.startsAt.getTime() <= now.getTime();
  }

  /** Who may act on this booking: whoever holds the matching email. */
  belongsTo(clientEmail: string): boolean {
    return this.clientEmail.toLowerCase() === clientEmail.toLowerCase();
  }

  canBeCancelledAt(now: Date): boolean {
    return this.isConfirmed && !this.hasPassed(now);
  }

  /** Explains why cancelling is impossible, or null when it is allowed. */
  reasonCancellationIsImpossible(now: Date): BookingError | null {
    if (this.isCancelled) return null; // already in the desired state
    if (this.hasPassed(now)) {
      return new BookingError(
        'APPOINTMENT_IN_PAST',
        'This appointment already took place and can no longer be cancelled.',
      );
    }
    return null;
  }

  endsAt(durationMinutes: number): Date {
    return new Date(this.startsAt.getTime() + durationMinutes * 60_000);
  }
}
