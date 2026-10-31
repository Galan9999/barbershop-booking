import 'server-only';
import { BookingError } from '@/lib/domain/errors';
import { PG_UNIQUE_VIOLATION, supabaseAdmin } from '@/lib/supabase/admin';
import type { AppointmentRow } from '@/lib/supabase/types';

/** Every query against `appointments` lives here. Nothing else touches the DB. */

export interface NewAppointment {
  clientName: string;
  clientEmail: string;
  startsAt: Date;
  barberName: string;
}

export type StoredAppointment = Pick<
  AppointmentRow,
  'id' | 'client_name' | 'client_email' | 'date_time' | 'barber_name' | 'cancel_token'
>;

const STORED_COLUMNS = 'id, client_name, client_email, date_time, barber_name, cancel_token';

export class SlotTakenError extends Error {
  constructor() {
    super('slot already booked');
    this.name = 'SlotTakenError';
  }
}

/**
 * Inserts a booking. Slot uniqueness is decided by the partial unique index
 * `appointments_active_slot_uq`, never by a prior read: a 23505 here is the
 * database rejecting a genuine race, and surfaces as SlotTakenError.
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
    console.error('[repository] insert failed', { code: error.code });
    throw new BookingError('STORAGE_FAILURE', 'Could not create the booking.');
  }
  return data;
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
    console.error('[repository] slot lookup failed', { code: error.code });
    return null;
  }
  return data;
}

export interface CancelledAppointment {
  id: string;
  date_time: string;
  barber_name: string;
}

/**
 * Conditional UPDATE: atomic and idempotent. A second click updates no rows,
 * and cancelling drops the row out of the partial index, freeing the slot.
 * Returns null when nothing matched, which the caller then explains.
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
    console.error('[repository] cancel failed', { code: error.code });
    throw new BookingError('STORAGE_FAILURE', 'Could not cancel the appointment.');
  }
  return data;
}

export type AppointmentByToken = Pick<
  AppointmentRow,
  'client_name' | 'date_time' | 'barber_name' | 'status'
>;

export async function findByToken(token: string): Promise<AppointmentByToken | null> {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('client_name, date_time, barber_name, status')
    .eq('cancel_token', token)
    .maybeSingle();
  if (error) {
    console.error('[repository] token lookup failed', { code: error.code });
    throw new BookingError('STORAGE_FAILURE', 'Could not read the appointment.');
  }
  return data;
}

export interface BusySlot {
  date_time: string;
  barber_name: string;
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
    console.error('[repository] busy-slots query failed', { code: error.code });
    return null;
  }
  return data;
}
