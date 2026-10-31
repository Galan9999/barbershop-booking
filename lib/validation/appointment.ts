import { z } from 'zod';
import { BARBERS } from '@/lib/config';

export const reserveSchema = z.object({
  client_name: z.string().trim().min(2).max(100),
  client_email: z.string().trim().toLowerCase().email().max(254),
  /** ISO 8601 with offset or Z, e.g. "2026-11-07T10:30:00+01:00". */
  date_time: z
    .string()
    .datetime({ offset: true })
    .transform((s) => new Date(s)),
  barber_name: z.enum(BARBERS),
});
export type ReserveInput = z.infer<typeof reserveSchema>;

export const cancelSchema = z.object({
  token: z.string().uuid(),
});
export type CancelInput = z.infer<typeof cancelSchema>;
