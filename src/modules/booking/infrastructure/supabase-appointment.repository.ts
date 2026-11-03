import 'server-only';
import { BookingError } from '@/modules/booking/domain/booking-errors';
import { Appointment } from '@/modules/booking/domain/entities/appointment.entity';
import type {
  AppointmentRepository,
  BookedInterval,
  NewAppointmentData,
} from '@/modules/booking/domain/interfaces/appointment-repository.interface';
import { SlotAlreadyTakenError } from '@/modules/booking/domain/interfaces/appointment-repository.interface';
import type { TimeSlot } from '@/modules/booking/domain/value-objects/time-slot';
import {
  PG_EXCLUSION_VIOLATION,
  PG_UNIQUE_VIOLATION,
  supabaseAdmin,
} from '@/shared/infrastructure/supabase/admin';
import type { AppointmentRow } from '@/shared/types/database.types';

/**
 * Supabase implementation of the AppointmentRepository port.
 *
 * The only module that queries `appointments`. It also maps rows (snake_case,
 * ISO strings) onto domain entities, so storage shapes never reach the layers
 * above.
 */

/* eslint-disable-next-line max-len -- supabase-js infers the row type from this
   literal, so it cannot be split or concatenated. */
const ENTITY_COLUMNS =
  'id, client_first_name, client_last_name, client_email, client_phone, service_name, price, date_time, ends_at, barber_name, status, cancel_token';

type EntityRow = Pick<
  AppointmentRow,
  | 'id'
  | 'client_first_name'
  | 'client_last_name'
  | 'client_email'
  | 'client_phone'
  | 'service_name'
  | 'price'
  | 'date_time'
  | 'ends_at'
  | 'barber_name'
  | 'status'
  | 'cancel_token'
>;

function toEntity(row: EntityRow): Appointment {
  return new Appointment({
    id: row.id,
    clientFirstName: row.client_first_name,
    clientLastName: row.client_last_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    serviceName: row.service_name,
    // numeric can arrive as a string depending on the driver; normalise here.
    price: Number(row.price),
    startsAt: new Date(row.date_time),
    endsAt: new Date(row.ends_at),
    barberName: row.barber_name,
    status: row.status,
    cancelToken: row.cancel_token,
  });
}

export class SupabaseAppointmentRepository implements AppointmentRepository {
  /**
   * Clashes are decided by the database, never by a prior read: the exclusion
   * constraint `appointments_no_overlap_ex` rejects any overlap (23P01) and the
   * partial index `appointments_active_slot_uq` the exact same start (23505).
   * Either one is a real race between concurrent requests.
   */
  async create(data: NewAppointmentData): Promise<Appointment> {
    const { data: row, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        client_first_name: data.clientFirstName,
        client_last_name: data.clientLastName,
        client_email: data.clientEmail,
        client_phone: data.clientPhone,
        service_name: data.serviceName,
        price: data.price,
        date_time: data.startsAt.toISOString(),
        ends_at: data.endsAt.toISOString(),
        barber_name: data.barberName,
      })
      .select(ENTITY_COLUMNS)
      .single();

    if (error) {
      if (error.code === PG_UNIQUE_VIOLATION || error.code === PG_EXCLUSION_VIOLATION) {
        throw new SlotAlreadyTakenError();
      }
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

  /**
   * Overlap test on [from, to): starts before the window ends and ends after
   * it begins. Returns null when the lookup fails, so callers can degrade
   * gracefully.
   */
  async findConfirmedBetween(from: Date, to: Date): Promise<BookedInterval[] | null> {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('date_time, ends_at, barber_name')
      .eq('status', 'confirmed')
      .lt('date_time', to.toISOString())
      .gt('ends_at', from.toISOString());

    if (error) {
      console.error('[appointments] busy-slots query failed', { code: error.code });
      return null;
    }
    return data.map((row) => ({
      barberName: row.barber_name,
      startsAt: new Date(row.date_time),
      endsAt: new Date(row.ends_at),
    }));
  }
}
