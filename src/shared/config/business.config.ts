import 'server-only';
import { z } from 'zod';
import type { WeeklyOpeningHours } from '@/shared/utils/datetime';

/**
 * Per-shop configuration, read from the environment.
 *
 * Everything a salon needs to change — its name, its barbers, its opening
 * hours, how long a cut takes — lives here, so installing this for another
 * shop is a matter of setting variables, never of editing code.
 */

const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const openingHoursSchema = z
  .record(
    z.enum(['0', '1', '2', '3', '4', '5', '6']),
    z
      .object({
        open: z.string().regex(CLOCK_TIME, 'Usa el formato HH:mm'),
        close: z.string().regex(CLOCK_TIME, 'Usa el formato HH:mm'),
      })
      .nullable(),
  )
  .refine(
    (hours) =>
      Object.values(hours).every(
        (day) => day === null || day.open < day.close,
      ),
    'La hora de cierre debe ser posterior a la de apertura',
  );

/** Monday to Friday 9-20, Saturday 9-14, Sunday closed. */
const DEFAULT_OPENING_HOURS = {
  '0': null,
  '1': { open: '09:00', close: '20:00' },
  '2': { open: '09:00', close: '20:00' },
  '3': { open: '09:00', close: '20:00' },
  '4': { open: '09:00', close: '20:00' },
  '5': { open: '09:00', close: '20:00' },
  '6': { open: '09:00', close: '14:00' },
};

function parseJsonEnv(value: string | undefined, fallback: unknown): unknown {
  if (!value?.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(
      'BUSINESS_OPENING_HOURS no es JSON válido. Ejemplo:\n' +
        '  {"0":null,"1":{"open":"09:00","close":"20:00"}}',
    );
  }
}

const businessSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(4),
  /** Comma-separated in the environment, e.g. "Carlos, Miguel". */
  barbers: z
    .array(z.string().min(2).max(40))
    .min(1, 'Define al menos un peluquero en BUSINESS_BARBERS'),
  openingHours: openingHoursSchema,
  slotMinutes: z.coerce.number().int().positive().max(240),
  appointmentMinutes: z.coerce.number().int().positive().max(480),
  minAdvanceMinutes: z.coerce.number().int().nonnegative().max(10_080),
  maxAdvanceDays: z.coerce.number().int().positive().max(365),
});

function loadBusinessConfig() {
  const parsed = businessSchema.safeParse({
    name: process.env.BUSINESS_NAME ?? 'Barbería Central',
    address: process.env.BUSINESS_ADDRESS ?? 'Calle Mayor 1, Madrid',
    barbers: (process.env.BUSINESS_BARBERS ?? 'Carlos, Miguel')
      .split(',')
      .map((barber) => barber.trim())
      .filter(Boolean),
    openingHours: parseJsonEnv(process.env.BUSINESS_OPENING_HOURS, DEFAULT_OPENING_HOURS),
    slotMinutes: process.env.BUSINESS_SLOT_MINUTES ?? 30,
    appointmentMinutes: process.env.BUSINESS_APPOINTMENT_MINUTES ?? 30,
    minAdvanceMinutes: process.env.BUSINESS_MIN_ADVANCE_MINUTES ?? 60,
    maxAdvanceDays: process.env.BUSINESS_MAX_ADVANCE_DAYS ?? 30,
  });

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Configuración del negocio inválida.\n${problems}\n\n` +
        'Revisa las variables BUSINESS_* . Ver docs/PERSONALIZAR.md',
    );
  }

  const config = parsed.data;
  if (config.appointmentMinutes % config.slotMinutes !== 0) {
    throw new Error(
      `BUSINESS_APPOINTMENT_MINUTES (${config.appointmentMinutes}) debe ser ` +
        `múltiplo de BUSINESS_SLOT_MINUTES (${config.slotMinutes}), o la rejilla ` +
        'de horas dejaría huecos imposibles de reservar.',
    );
  }
  return config;
}

const business = loadBusinessConfig();

export const BUSINESS_NAME = business.name;
export const BUSINESS_ADDRESS = business.address;
export const BARBERS: readonly string[] = business.barbers;
export const SLOT_MINUTES = business.slotMinutes;
export const APPOINTMENT_MINUTES = business.appointmentMinutes;
export const MIN_ADVANCE_MINUTES = business.minAdvanceMinutes;
export const MAX_ADVANCE_DAYS = business.maxAdvanceDays;

/** Numeric weekday keys, as the datetime helpers expect. */
export const OPENING_HOURS: WeeklyOpeningHours = Object.fromEntries(
  Object.entries(business.openingHours).map(([day, hours]) => [Number(day), hours]),
);
