import 'server-only';
import { AvailabilityService } from '@/modules/booking/application/availability.service';
import { BookingService } from '@/modules/booking/application/booking.service';
import { systemClock } from '@/modules/booking/domain/interfaces/clock.interface';
import { EmailBookingNotifier } from '@/modules/booking/infrastructure/email-booking.notifier';
import { SupabaseAppointmentRepository } from '@/modules/booking/infrastructure/supabase-appointment.repository';
import {
  BARBERS,
  BUSINESS_ADDRESS,
  BUSINESS_NAME,
  BUSINESS_PHONE,
  PAYMENT_NOTE,
  SERVICES,
} from '@/shared/config/business.config';
import { env } from '@/shared/config/env';
import { getEmailTransport } from '@/shared/infrastructure/email/transport';

/**
 * Composition root for the booking module: the one place where concrete
 * implementations are chosen and wired into the use cases.
 *
 * This is what keeps the dependency rule honest. Services declare the ports
 * they need; only this file knows that persistence is Supabase, that
 * notifications are email, and that configuration comes from the environment.
 * A DI container would do the same job, with a dependency we do not need at
 * this size.
 */

let bookingService: BookingService | undefined;
let availabilityService: AvailabilityService | undefined;

function createRepository(): SupabaseAppointmentRepository {
  return new SupabaseAppointmentRepository();
}

export function getBookingService(): BookingService {
  bookingService ??= new BookingService({
    repository: createRepository(),
    notifier: new EmailBookingNotifier({
      transport: getEmailTransport(),
      businessName: BUSINESS_NAME,
      businessAddress: BUSINESS_ADDRESS,
      businessEmail: env.BUSINESS_EMAIL,
      emailFrom: env.EMAIL_FROM,
      paymentNote: PAYMENT_NOTE,
      businessPhone: BUSINESS_PHONE,
    }),
    clock: systemClock,
    timeZone: env.BUSINESS_TIMEZONE,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    businessName: BUSINESS_NAME,
    businessAddress: BUSINESS_ADDRESS,
    services: SERVICES,
  });
  return bookingService;
}

export function getAvailabilityService(): AvailabilityService {
  availabilityService ??= new AvailabilityService({
    repository: createRepository(),
    clock: systemClock,
    timeZone: env.BUSINESS_TIMEZONE,
    barbers: BARBERS,
    services: SERVICES,
    paymentNote: PAYMENT_NOTE,
  });
  return availabilityService;
}
