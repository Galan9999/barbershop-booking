import { z } from 'zod';
import { BARBERS } from '@/shared/config/business.config';

/**
 * Input and output contracts of the booking use cases.
 *
 * Validation lives here, not in the domain: zod is an external library and the
 * domain stays dependency-free. The schemas describe what crosses the
 * application boundary; entities describe what is true inside it.
 */

export const reserveSchema = z.object({
  client_name: z.string().trim().min(2).max(100),
  client_email: z.string().trim().toLowerCase().email().max(254),
  /** ISO 8601 with offset or Z, e.g. "2026-11-07T10:30:00+01:00". */
  date_time: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  barber_name: z.enum(BARBERS),
});
export type ReserveRequestDto = z.infer<typeof reserveSchema>;

export const cancelSchema = z.object({
  token: z.string().uuid(),
});
export type CancelRequestDto = z.infer<typeof cancelSchema>;

/** Shape returned to clients on a successful booking. */
export interface BookingConfirmationDto {
  appointment: {
    id: string;
    client_name: string;
    date_time: string;
    barber_name: string;
    status: 'confirmed';
  };
  formatted_date_time: string;
  google_calendar_url: string;
  email_sent: boolean;
  /** True when this request re-confirmed a booking the client already had. */
  idempotent_replay: boolean;
}

export interface CancellationDto {
  cancelled: true;
  already_cancelled?: boolean;
  appointment?: { id: string; barber_name: string; formatted_date_time: string };
}

/** Read model for the cancellation page: no entity leaves the application layer. */
export interface AppointmentViewDto {
  clientName: string;
  barberName: string;
  formattedDateTime: string;
  status: 'confirmed' | 'cancelled';
  canBeCancelled: boolean;
}
