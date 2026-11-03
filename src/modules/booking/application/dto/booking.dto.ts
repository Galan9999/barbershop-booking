import { z } from 'zod';
import { BARBERS, SERVICES } from '@/shared/config/business.config';

/**
 * Input and output contracts of the booking use cases.
 *
 * Validation lives here, not in the domain: zod is an external library and the
 * domain stays dependency-free. The schemas describe what crosses the
 * application boundary; entities describe what is true inside it.
 */

/**
 * Accepts Spanish and international formats: "+34 600 00 00 00",
 * "600 000 000", "(+34) 600-000-000". Stored as typed, minus surrounding
 * whitespace: the shop reads it, no system parses it.
 */
const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(24)
  .regex(/^\+?[0-9 ().-]+$/, 'Introduce un teléfono válido')
  .refine(
    (value) => (value.match(/[0-9]/g) ?? []).length >= 7,
    'El teléfono necesita al menos 7 dígitos',
  );

export const reserveSchema = z.object({
  client_first_name: z.string().trim().min(2).max(60),
  client_last_name: z.string().trim().min(2).max(80),
  client_email: z.string().trim().toLowerCase().email().max(254),
  client_phone: phoneSchema,
  /** ISO 8601 with offset or Z, e.g. "2026-11-07T10:30:00+01:00". */
  date_time: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  // The barber list comes from configuration, so it cannot be a literal enum.
  barber_name: z
    .string()
    .trim()
    .refine((name) => BARBERS.includes(name), 'Ese peluquero no existe'),
  // Also configuration-driven. The duration and price are looked up on the
  // server from this id: the client never says how long or how much.
  service_id: z
    .string()
    .trim()
    .refine((id) => SERVICES.some((service) => service.id === id), 'Ese servicio no existe'),
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
    service_name: string;
    /** Euros. */
    service_price: number;
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
  clientPhone: string;
  barberName: string;
  serviceName: string;
  formattedDateTime: string;
  status: 'confirmed' | 'cancelled';
  canBeCancelled: boolean;
}
