import type { BookingConfirmationDto } from '@/modules/booking/application/dto/booking.dto';
import { formatPrice } from '@/shared/utils/money/format-price';
import styles from './BookingConfirmation.module.css';

interface BookingConfirmationProps {
  confirmation: BookingConfirmationDto;
  businessAddress: string;
  businessPhone?: string;
  paymentNote: string;
}

export function BookingConfirmation({
  confirmation,
  businessAddress,
  businessPhone,
  paymentNote,
}: BookingConfirmationProps) {
  return (
    <section className={styles.panel} aria-live="polite">
      <p className={styles.check} aria-hidden="true">
        ✓
      </p>
      <h2 className={styles.title}>Cita confirmada</h2>

      <dl className={styles.details}>
        <div className={styles.row}>
          <dt>Cuándo</dt>
          <dd>{confirmation.formatted_date_time}</dd>
        </div>
        <div className={styles.row}>
          <dt>Servicio</dt>
          <dd>{confirmation.appointment.service_name}</dd>
        </div>
        <div className={styles.row}>
          <dt>Precio</dt>
          <dd>
            {formatPrice(confirmation.appointment.service_price)} · {paymentNote}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Barbero</dt>
          <dd>{confirmation.appointment.barber_name}</dd>
        </div>
        <div className={styles.row}>
          <dt>Dónde</dt>
          <dd>{businessAddress}</dd>
        </div>
        {businessPhone && (
          <div className={styles.row}>
            <dt>Teléfono</dt>
            <dd>
              <a href={`tel:${businessPhone.replace(/\s/g, '')}`}>{businessPhone}</a>
            </dd>
          </div>
        )}
      </dl>

      <a
        className={styles.calendarLink}
        href={confirmation.google_calendar_url}
        target="_blank"
        rel="noreferrer"
      >
        Añadir a Google Calendar
      </a>

      <p className={styles.note}>
        {confirmation.email_sent
          ? 'Te hemos enviado un email con los detalles y un enlace para cancelar.'
          : 'Tu cita está guardada, pero no pudimos enviarte el email de confirmación.'}
      </p>
    </section>
  );
}
