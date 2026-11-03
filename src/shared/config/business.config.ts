import 'server-only';
import { z } from 'zod';
import type { WeeklyOpeningHours } from '@/shared/utils/datetime';

export interface BookableService {
  id: string;
  label: string;
  minutes: number;
  /** In euros, paid at the shop. */
  price: number;
}

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

/** What a client can book, and how long each one takes. */
const DEFAULT_SERVICES = [
  { id: 'haircut', label: 'Corte de pelo', minutes: 30, price: 15 },
  { id: 'beard', label: 'Barba', minutes: 30, price: 15 },
  { id: 'haircut_beard', label: 'Corte y barba', minutes: 60, price: 30 },
];

const servicesSchema = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z0-9_]{2,40}$/, 'id en minúsculas, dígitos o _'),
      label: z.string().min(2).max(60),
      minutes: z.coerce.number().int().positive().max(480),
      price: z.coerce.number().nonnegative().max(10_000),
    }),
  )
  .min(1, 'Define al menos un servicio en BUSINESS_SERVICES')
  .refine(
    (services) => new Set(services.map((service) => service.id)).size === services.length,
    'Los id de BUSINESS_SERVICES no pueden repetirse',
  );

function parseJsonEnv(
  name: string,
  value: string | undefined,
  fallback: unknown,
  example: string,
): unknown {
  if (!value?.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} no es JSON válido. Ejemplo:\n  ${example}`);
  }
}

const businessSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(4),
  /** Optional. Shown to clients in the confirmation email and screen. */
  phone: z
    .string()
    .regex(/^\+?[0-9 ().-]{7,24}$/, 'Teléfono no válido')
    .optional(),
  /** Comma-separated in the environment, e.g. "Carlos, Miguel". */
  barbers: z
    .array(z.string().min(2).max(40))
    .min(1, 'Define al menos un peluquero en BUSINESS_BARBERS'),
  openingHours: openingHoursSchema,
  slotMinutes: z.coerce.number().int().positive().max(240),
  services: servicesSchema,
  /** Shown next to the price in the form and in the confirmation email. */
  paymentNote: z.string().min(2).max(120),
  minAdvanceMinutes: z.coerce.number().int().nonnegative().max(10_080),
  maxAdvanceDays: z.coerce.number().int().positive().max(365),
});

function loadBusinessConfig() {
  const parsed = businessSchema.safeParse({
    name: process.env.BUSINESS_NAME ?? 'Barbería Central',
    address: process.env.BUSINESS_ADDRESS ?? 'Calle Mayor 1, Madrid',
    phone: process.env.BUSINESS_PHONE?.trim() || undefined,
    barbers: (process.env.BUSINESS_BARBERS ?? 'Carlos, Miguel')
      .split(',')
      .map((barber) => barber.trim())
      .filter(Boolean),
    openingHours: parseJsonEnv(
      'BUSINESS_OPENING_HOURS',
      process.env.BUSINESS_OPENING_HOURS,
      DEFAULT_OPENING_HOURS,
      '{"0":null,"1":{"open":"09:00","close":"20:00"}}',
    ),
    services: parseJsonEnv(
      'BUSINESS_SERVICES',
      process.env.BUSINESS_SERVICES,
      DEFAULT_SERVICES,
      '[{"id":"haircut","label":"Corte de pelo","minutes":30,"price":15}]',
    ),
    slotMinutes: process.env.BUSINESS_SLOT_MINUTES ?? 30,
    paymentNote: process.env.BUSINESS_PAYMENT_NOTE?.trim() || 'Se paga en efectivo en la barbería.',
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
  for (const service of config.services) {
    if (service.minutes % config.slotMinutes !== 0) {
      throw new Error(
        `El servicio "${service.label}" dura ${service.minutes} min, que no es ` +
          `múltiplo de BUSINESS_SLOT_MINUTES (${config.slotMinutes}): la rejilla ` +
          'de horas dejaría huecos imposibles de reservar.',
      );
    }
  }
  return config;
}

const business = loadBusinessConfig();

/**
 * BUSINESS_NAME may mark line breaks for the page heading with "|", e.g.
 * "Barbershop | Armando Britez". Everywhere else (emails, tab title, calendar)
 * the name reads as one line.
 */
export const BUSINESS_NAME_LINES: readonly string[] = business.name
  .split('|')
  .map((line) => line.trim())
  .filter(Boolean);
export const BUSINESS_NAME = BUSINESS_NAME_LINES.join(' ');
export const BUSINESS_ADDRESS = business.address;
export const BUSINESS_PHONE: string | undefined = business.phone;
export const BARBERS: readonly string[] = business.barbers;
export const SLOT_MINUTES = business.slotMinutes;
export const SERVICES: readonly BookableService[] = business.services;
export const PAYMENT_NOTE = business.paymentNote;
export const MIN_ADVANCE_MINUTES = business.minAdvanceMinutes;
export const MAX_ADVANCE_DAYS = business.maxAdvanceDays;

/** Numeric weekday keys, as the datetime helpers expect. */
export const OPENING_HOURS: WeeklyOpeningHours = Object.fromEntries(
  Object.entries(business.openingHours).map(([day, hours]) => [Number(day), hours]),
);
