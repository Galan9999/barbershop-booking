import { getAvailabilityService } from '@/modules/booking/booking.module';
import { BookingForm } from '@/modules/booking/ui/components/BookingForm/BookingForm';
import {
  BUSINESS_ADDRESS,
  BUSINESS_NAME,
  BUSINESS_PHONE,
} from '@/shared/config/business.config';
import { Callout } from '@/shared/ui/components/Callout/Callout';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = { title: `${BUSINESS_NAME} — Reservar cita` };

/**
 * Landing page for the QR code. Availability is resolved on the server with
 * the domain rules; only the form itself is a Client Component.
 * `?barber=<name>` preselects a barber, for per-barber printed codes.
 */
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string }>;
}) {
  const { barber } = await searchParams;
  const availability = await getAvailabilityService().getAvailability();
  const initialBarber = availability.barbers.find((name) => name === barber);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Reserva online</p>
        <h1 className={styles.title}>{BUSINESS_NAME}</h1>
        <p className={styles.subtitle}>{BUSINESS_ADDRESS}</p>
      </header>

      {availability.degraded && (
        <Callout tone="warning">
          No hemos podido comprobar la disponibilidad en tiempo real. Puedes intentar
          reservar igualmente.
        </Callout>
      )}

      <BookingForm
        availability={availability}
        businessAddress={BUSINESS_ADDRESS}
        businessPhone={BUSINESS_PHONE}
        initialBarber={initialBarber}
      />
    </main>
  );
}
