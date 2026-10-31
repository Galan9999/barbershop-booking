import { findByToken } from '@/modules/booking/infrastructure/appointment.repository';
import { CancelBookingButton } from '@/modules/booking/ui/components/CancelBooking/CancelBookingButton';
import { BUSINESS_NAME } from '@/shared/config/business.config';
import { env } from '@/shared/config/env';
import { formatFullDateTime } from '@/shared/utils/datetime';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Where the cancellation link in the email lands. This page only shows the
 * appointment: email clients prefetch links, so the GET must not cancel.
 */
export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const appointment = UUID_PATTERN.test(token) ? await findByToken(token) : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{BUSINESS_NAME}</h1>
      </header>

      <section className={styles.card}>
        {!appointment ? (
          <p className={styles.message}>Este enlace de cancelación no es válido.</p>
        ) : appointment.status === 'cancelled' ? (
          <p className={styles.message}>
            Esta cita ya estaba cancelada. No tienes que hacer nada más.
          </p>
        ) : appointment.startsAt.getTime() <= Date.now() ? (
          <p className={styles.message}>Esta cita ya ha pasado y no se puede cancelar.</p>
        ) : (
          <>
            <h2 className={styles.question}>¿Cancelar esta cita?</h2>
            <dl className={styles.details}>
              <div className={styles.row}>
                <dt>Cuándo</dt>
                <dd>{formatFullDateTime(appointment.startsAt, env.BUSINESS_TIMEZONE)}</dd>
              </div>
              <div className={styles.row}>
                <dt>Barbero</dt>
                <dd>{appointment.barberName}</dd>
              </div>
              <div className={styles.row}>
                <dt>A nombre de</dt>
                <dd>{appointment.clientName}</dd>
              </div>
            </dl>
            <CancelBookingButton token={token} />
          </>
        )}
      </section>
    </main>
  );
}
