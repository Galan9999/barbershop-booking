import type { Appointment } from '@/modules/booking/domain/entities/appointment.entity';
import type { TimeSlot } from '@/modules/booking/domain/value-objects/time-slot';

/**
 * Port for appointment persistence, declared by the domain and implemented by
 * infrastructure. Services depend on this interface, never on a concrete
 * database client, so no storage type reaches the layers above.
 */

export interface NewAppointmentData {
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  serviceName: string;
  price: number;
  startsAt: Date;
  endsAt: Date;
  barberName: string;
}

/** Time a barber is already committed to, as the availability grid needs it. */
export interface BookedInterval {
  barberName: string;
  startsAt: Date;
  endsAt: Date;
}

export interface AppointmentRepository {
  /**
   * Persists a booking. Implementations MUST rely on a database constraint
   * rather than a prior read to reject a booking that overlaps another
   * confirmed one of the same barber (not just one with the same start), and
   * MUST signal that lost race by throwing SlotAlreadyTakenError.
   */
  create(data: NewAppointmentData): Promise<Appointment>;

  findConfirmedAt(slot: TimeSlot): Promise<Appointment | null>;

  findByCancelToken(token: string): Promise<Appointment | null>;

  /**
   * Cancels atomically and idempotently: a second call must change nothing.
   * Resolves to true when this call performed the cancellation.
   */
  cancel(token: string, now: Date): Promise<boolean>;

  /**
   * Confirmed bookings that overlap [from, to), including one that started
   * before `from` and is still running. Null when the lookup fails.
   */
  findConfirmedBetween(from: Date, to: Date): Promise<BookedInterval[] | null>;
}

/** Thrown by an implementation when the slot was taken concurrently. */
export class SlotAlreadyTakenError extends Error {
  constructor() {
    super('slot already booked');
    this.name = 'SlotAlreadyTakenError';
  }
}
