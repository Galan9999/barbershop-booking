import type { BarberName } from '@/shared/config/business.config';

/** Domain shapes for the booking module, independent of storage and transport. */

export type AppointmentStatus = 'confirmed' | 'cancelled';

export interface NewAppointment {
  clientName: string;
  clientEmail: string;
  startsAt: Date;
  barberName: BarberName;
}

/** A stored booking, as the rest of the module consumes it. */
export interface StoredAppointment {
  id: string;
  clientName: string;
  clientEmail: string;
  startsAt: Date;
  barberName: string;
  cancelToken: string;
}

export interface CancelledAppointment {
  id: string;
  startsAt: Date;
  barberName: string;
}

export interface AppointmentSummary {
  clientName: string;
  startsAt: Date;
  barberName: string;
  status: AppointmentStatus;
}

export interface BusySlot {
  startsAt: Date;
  barberName: string;
}
