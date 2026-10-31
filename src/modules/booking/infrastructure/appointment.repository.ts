import 'server-only';
import { BookingError } from '@/modules/booking/domain/booking-errors';
import type {
  AppointmentSummary,
  BusySlot,
  CancelledAppointment,
  NewAppointment,
  StoredAppointment,
} from '@/modules/booking/domain/appointment.types';
import { PG_UNIQUE_VIOLATION, supabaseAdmin } from '@/shared/infrastructure/supabase/admin';
import type { AppointmentRow } from '@/shared/types/database.types';

/**
 * The only module that queries `appointments`. It also maps database rows
 * (snake_case, ISO strings) onto domain objects, so no other layer deals with
 * storage shapes.
 */

const STORED_COLUMNS = 'id, client_name, client_email, date_time, barber_name, cancel_token';

type StoredRow = Pick<
  AppointmentRow,
  'id' | 'client_name' | 'client_email' | 'date_time' | 'barber_name' | 'cancel_token'
>;

function toStoredAppointment(row: StoredRow): StoredAppointment {
  return {
    id: row.id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    startsAt: new Date(row.date_time),
    barberName: row.barber_name,
    cancelToken: row.cancel_token,
  };
}

/** Raised when the partial unique index rejects a second booking for a slot. */
export class SlotTakenError extends Error {
  constructor() {
    super('slot already booked');
    this.name = 'SlotTakenError';
  }
}

/**
 * Inserts a booking. Slot uniqueness is decided by the index
 * `appointments_active_slot_uq`, never by a prior read: a 23505 here is the
 * database rejecting a real race between concurrent requests.
 */
export async function insertAppointment(input: NewAppointment): Promise<StoredAppointment> {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .insert({
      client_name: input.clientName,
      client_email: input.clientEmail,
      date_time: input.startsAt.toISOString(),
      barber_name: input.barberName,
    })
    .select(STORED_COLUMNS)
    .single();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) throw new SlotTakenError();
    console.error('[appointments] insert failed', { code: error.code });
    throw new BookingError('STORAGE_FAILURE', 'Could not create the booking.');
  }
  return toStoredAppointment(data);
}

/** The confirmed booking occupying a slot, if any. */
export async function findConfirmedBySlot(
  barberName: string,
  startsAt: Date,
): Promise<StoredAppointment | null> {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(STORED_COLUMNS)
    .eq('barber_name', barberName)
    .eq('date_time', startsAt.toISOString())
    .eq('status', 'confirmed')
    .maybeSingle();

  if (error) {
    console.error('[appointments] slot lookup failed', { code: error.code });
    return null;
  }
  return data ? toStoredAppointment(data) : null;
}

/**
 * Conditional UPDATE: atomic and idempotent. A second click updates no rows,
 * and cancelling drops the row out of the partial index, freeing the slot.
 * Returns null when nothing matched; the caller explains why.
 */
export async function cancelByToken(
  token: string,
  now: Date,
): Promise<CancelledAppointment | null> {
  const nowIso = now.toISOString();
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled', cancelled_at: nowIso })
    .eq('cancel_token', token)
    .eq('status', 'confirmed')
    .gt('date_time', nowIso)
    .select('id, date_time, barber_name')
    .maybeSingle();

  if (error) {
    console.error('[appointments] cancel failed', { code: error.code });
    throw new BookingError('STORAGE_FAILURE', 'Could not cancel the appointment.');
  }
  if (!data) return null;
  return { id: data.id, startsAt: new Date(data.date_time), barberName: data.barber_name };
}

export async function findByToken(token: string): Promise<AppointmentSummary | null> {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('client_name, date_time, barber_name, status')
    .eq('cancel_token', token)
    .maybeSingle();

  if (error) {
    console.error('[appointments] token lookup failed', { code: error.code });
    throw new BookingError('STORAGE_FAILURE', 'Could not read the appointment.');
  }
  if (!data) return null;
  return {
    clientName: data.client_name,
    startsAt: new Date(data.date_time),
    barberName: data.barber_name,
    status: data.status,
  };
}

/** Confirmed bookings inside the booking window, for the availability grid. */
export async function findBusySlots(from: Date, to: Date): Promise<BusySlot[] | null> {
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
  return data.map((row) => ({
    startsAt: new Date(row.date_time),
    barberName: row.barber_name,
  }));
}
