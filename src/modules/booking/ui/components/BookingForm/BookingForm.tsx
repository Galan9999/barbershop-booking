'use client';

import type { FormEvent } from 'react';
import type { AvailabilityDto } from '@/modules/booking/application/availability.service';
import { BarberPicker } from '@/modules/booking/ui/components/BarberPicker/BarberPicker';
import { BookingCalendar } from '@/modules/booking/ui/components/BookingCalendar/BookingCalendar';
import { BookingConfirmation } from '@/modules/booking/ui/components/BookingConfirmation/BookingConfirmation';
import { SlotPicker } from '@/modules/booking/ui/components/SlotPicker/SlotPicker';
import { useBookingForm } from '@/modules/booking/ui/hooks/use-booking-form';
import { Button } from '@/shared/ui/components/Button/Button';
import { Callout } from '@/shared/ui/components/Callout/Callout';
import { Field } from '@/shared/ui/components/Field/Field';
import styles from './BookingForm.module.css';

interface BookingFormProps {
  availability: AvailabilityDto;
  businessAddress: string;
  initialBarber?: string;
}

/**
 * Presentation only: every piece of state and the submit call live in
 * `useBookingForm`, which keeps this component readable as a layout.
 */
export function BookingForm({
  availability,
  businessAddress,
  initialBarber,
}: BookingFormProps) {
  const form = useBookingForm({ availability, initialBarber });

  if (form.status === 'confirmed' && form.confirmation) {
    return (
      <BookingConfirmation
        confirmation={form.confirmation}
        businessAddress={businessAddress}
      />
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void form.submit();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <section className={styles.step}>
        <h2 className={styles.stepTitle}>
          <span className={styles.stepNumber}>1</span> Elige barbero
        </h2>
        <BarberPicker
          barbers={availability.barbers}
          selected={form.barber}
          onSelect={form.selectBarber}
        />
      </section>

      <section className={styles.step}>
        <h2 className={styles.stepTitle}>
          <span className={styles.stepNumber}>2</span> Elige día
        </h2>
        <BookingCalendar
          availableDayKeys={form.availableDayKeys}
          selectedDayKey={form.dayKey}
          onSelectDay={form.selectDay}
        />
      </section>

      <section className={styles.step}>
        <h2 className={styles.stepTitle}>
          <span className={styles.stepNumber}>3</span> Elige hora
        </h2>
        {!form.barber ? (
          <p className={styles.placeholder}>Primero elige con qué barbero quieres ir.</p>
        ) : (
          <SlotPicker
            slots={form.selectedDay?.slots ?? []}
            selectedIso={form.slotIso}
            isTaken={form.isSlotTaken}
            onSelect={form.selectSlot}
          />
        )}
      </section>

      <section className={styles.step}>
        <h2 className={styles.stepTitle}>
          <span className={styles.stepNumber}>4</span> Tus datos
        </h2>
        <div className={styles.fields}>
          <Field
            label="Nombre y apellido"
            name="client_name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            value={form.clientName}
            onChange={(event) => form.setClientName(event.target.value)}
          />
          <Field
            label="Email"
            name="client_email"
            type="email"
            autoComplete="email"
            required
            hint="Te enviamos la confirmación y el enlace para cancelar."
            value={form.clientEmail}
            onChange={(event) => form.setClientEmail(event.target.value)}
          />
        </div>
      </section>

      {form.errorMessage && <Callout tone="danger">{form.errorMessage}</Callout>}

      <Button type="submit" size="lg" fullWidth disabled={!form.canSubmit}>
        {form.status === 'submitting' ? 'Reservando…' : 'Confirmar reserva'}
      </Button>
    </form>
  );
}
