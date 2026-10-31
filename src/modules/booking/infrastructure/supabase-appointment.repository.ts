import 'server-only';
import { BookingError } from '@/modules/booking/domain/booking-errors';
import { Appointment } from '@/modules/booking/domain/entities/appointment.entity';
import type {
  AppointmentRepository,
  NewAppointmentData,
} from '@/modules/booking/domain/interfaces/appointment-repository.interface';
import { SlotAlreadyTakenError } from '@/modules/booking/domain/interfaces/appointment-repository.interface';
import { TimeSlot } from '@/modules/booking/domain/value-objects/time-slot';
import { PG_UNIQUE_VIOLATION, supabaseAdmin } from '@/shared/infrastructure/supabase/admin';
import type { AppointmentRow } from '@/shared/types/database.types';

/**
 * Supabase implementation of the AppointmentRepository port.
 *
 * The only module that queries `appointments`. It also maps rows (snake_case,
 * ISO strings) onto domain entities, so storage shapes never reach the layers
 * above.
 */

const ENTITY_COLUMNS =
  'id, client_name, client_email, date_time, barber_name, status, cancel_token';

type EntityRow = Pick<
  AppointmentRow,
  | 'id'
  | 'client_name'
  | 'client_email'
  | 'date_time'
  | 'barber_name'
  | 'status'
  | 'cancel_token'
>;

function toEntity(row: EntityRow): Appointment {
  return new Appointment({
    id: row.id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    startsAt: new Date(row.date_time),
    barberName: row.barber_name,
    status: row.status,
    cancelToken: row.cancel_token,
  });
}

export class SupabaseAppointmentRepository implements AppointmentRepository {
  /**
   * Slot uniqueness is decided by the partial index
   * `appointments_active_slot_uq`, never by a prior read: a 23505 here is the
   * database rejecting a real race between concurrent requests.
   */
  async create(data: NewAppointmentData): Promise<Appointment> {
    const { data: row, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        client_name: data.clientName,
        client_email: data.clientEmail,
        date_time: data.startsAt.toISOString(),
        barber_name: data.barberName,
      })
      .select(ENTITY_COLUMNS)
      .single();

    if (error) {
      if (error.code === PG_UNIQUE_VIOLATION) throw new SlotAlreadyTakenError();
      console.error('[appointments] insert failed', { code: error.code });
      throw new BookingError('STORAGE_FAILURE', 'Could not create the booking.');
    }
    return toEntity(row);
  }

  async findConfirmedAt(slot: TimeSlot): Promise<Appointment | null> {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(ENTITY_COLUMNS)
      .eq('barber_name', slot.barberName)
      .eq('date_time', slot.startsAt.toISOString())
      .eq('status', 'confirmed')
      .maybeSingle();

    if (error) {
      console.error('[appointments] slot lookup failed', { code: error.code });
      return null;
    }
    return data ? toEntity(data) : null;
  }

  async findByCancelToken(token: string): Promise<Appointment | null> {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(ENTITY_COLUMNS)
      .eq('cancel_token', token)
      .maybeSingle();

    if (error) {
      console.error('[appointments] token lookup failed', { code: error.code });
      throw new BookingError('STORAGE_FAILURE', 'Could not read the appointment.');
    }
    return data ? toEntity(data) : null;
  }

  /**
   * Conditional UPDATE: atomic and idempotent. A second call updates no rows,
   * and cancelling drops the row out of the partial index, freeing the slot.
   */
  async cancel(token: string, now: Date): Promise<boolean> {
    const nowIso = now.toISOString();
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled', cancelled_at: nowIso })
      .eq('cancel_token', token)
      .eq('status', 'confirmed')
      .gt('date_time', nowIso)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[appointments] cancel failed', { code: error.code });
      throw new BookingError('STORAGE_FAILURE', 'Could not cancel the appointment.');
    }
    return data !== null;
  }

  /** Returns null when the lookup fails, so callers can degrade gracefully. */
  async findConfirmedBetween(from: Date, to: Date): Promise<TimeSlot[] | null> {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('date_time, barber_name')
      .eq('status', 'confirmed')
      .gte('date_time', from.toISOString())
      .lte('date_time', to.toISOString());

    if (error) {
      console.error('[appointments] busy-slots query failed', { code: error.code });
      return null;
    }
    return data.map((row) => new TimeSlot(row.barber_name, new Date(row.date_time)));
  }
}
