import { BUSINESS_NAME } from '@/lib/config';
import { getAvailability } from '@/lib/availability';
import { BookingForm } from './booking-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: `${BUSINESS_NAME} — Reservar cita` };

/**
 * QR landing page. Availability is computed server-side with the same rules
 * the reserve API enforces; the interactive form is a client leaf.
 * Optional ?barber=<name> preselects the barber (printed per-barber QRs).
 */
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string }>;
}) {
  const { barber } = await searchParams;
  const { days, barbers, degraded } = await getAvailability();
  const preselectedBarber = barbers.includes(barber ?? '') ? barber : undefined;

  return (
    <main
      style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '24px 16px 48px',
        fontFamily: 'system-ui',
        color: '#18181b',
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>{BUSINESS_NAME}</h1>
      <p style={{ marginTop: 0, color: '#71717a', fontSize: 15 }}>
        Reserva tu cita en un minuto.
      </p>
      {degraded && (
        <p style={{ color: '#b45309', fontSize: 14 }}>
          No hemos podido comprobar la disponibilidad en tiempo real. Puedes intentar
          reservar igualmente.
        </p>
      )}
      <BookingForm days={days} barbers={[...barbers]} preselectedBarber={preselectedBarber} />
    </main>
  );
}
