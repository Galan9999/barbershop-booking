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
  startsAt: Date;
  barberName: string;
}

export interface AppointmentRepository {
  /**
   * Persists a booking. Implementations MUST rely on a uniqueness constraint
   * for the slot rather than a prior read, and MUST signal a lost race by
   * throwing SlotAlreadyTakenError.
   */
  create(data: NewAppointmentData): Promise<Appointment>;

  findConfirmedAt(slot: TimeSlot): Promise<Appointment | null>;

  findByCancelToken(token: string): Promise<Appointment | null>;

  /**
   * Cancels atomically and idempotently: a second call must change nothing.
   * Resolves to true when this call performed the cancellation.
   */
  cancel(token: string, now: Date): Promise<boolean>;

  findConfirmedBetween(from: Date, to: Date): Promise<TimeSlot[] | null>;
}

/** Thrown by an implementation when the slot was taken concurrently. */
export class SlotAlreadyTakenError extends Error {
  constructor() {
    super('slot already booked');
    this.name = 'SlotAlreadyTakenError';
  }
}
