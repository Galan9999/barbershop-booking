'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  Availability,
  DayAvailability,
  SlotAvailability,
} from '@/modules/booking/application/availability.service';
import type { BookingConfirmation } from '@/modules/booking/application/booking.service';
import { reserveBooking } from '@/modules/booking/ui/booking.client';

export type BookingFormStatus = 'editing' | 'submitting' | 'confirmed';

interface UseBookingFormOptions {
  availability: Availability;
  initialBarber?: string;
}

export interface BookingFormState {
  status: BookingFormStatus;
  barber: string | undefined;
  dayKey: string | undefined;
  slotIso: string | undefined;
  clientName: string;
  clientEmail: string;
  errorMessage: string | undefined;
  confirmation: BookingConfirmation | undefined;
  selectedDay: DayAvailability | undefined;
  availableDayKeys: string[];
  canSubmit: boolean;
  isSlotTaken: (slot: SlotAvailability) => boolean;
  selectBarber: (barber: string) => void;
  selectDay: (dayKey: string) => void;
  selectSlot: (iso: string) => void;
  setClientName: (value: string) => void;
  setClientEmail: (value: string) => void;
  submit: () => Promise<void>;
}

/**
 * All booking form state in one place, so the components stay presentational.
 *
 * Slots taken after page load are tracked locally: when the API answers 409 we
 * mark that slot for that barber and clear the selection, instead of forcing a
 * reload to see a grid that is already out of date.
 */
export function useBookingForm({
  availability,
  initialBarber,
}: UseBookingFormOptions): BookingFormState {
  const [status, setStatus] = useState<BookingFormStatus>('editing');
  const [barber, setBarber] = useState<string | undefined>(initialBarber);
  const [dayKey, setDayKey] = useState<string | undefined>(availability.days[0]?.dayKey);
  const [slotIso, setSlotIso] = useState<string>();
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [confirmation, setConfirmation] = useState<BookingConfirmation>();
  const [takenSinceLoad, setTakenSinceLoad] = useState<Record<string, string[]>>({});

  const availableDayKeys = useMemo(
    () => availability.days.map((day) => day.dayKey),
    [availability.days],
  );

  const selectedDay = useMemo(
    () => availability.days.find((day) => day.dayKey === dayKey),
    [availability.days, dayKey],
  );

  const isSlotTaken = useCallback(
    (slot: SlotAvailability): boolean => {
      if (!barber) return false;
      return (
        slot.takenBy.includes(barber) || (takenSinceLoad[slot.iso] ?? []).includes(barber)
      );
    },
    [barber, takenSinceLoad],
  );

  const selectBarber = useCallback((next: string) => {
    setBarber(next);
    // Availability is per barber, so the chosen time no longer applies.
    setSlotIso(undefined);
    setErrorMessage(undefined);
  }, []);

  const selectDay = useCallback((next: string) => {
    setDayKey(next);
    setSlotIso(undefined);
  }, []);

  const selectSlot = useCallback((iso: string) => {
    setSlotIso(iso);
    setErrorMessage(undefined);
  }, []);

  const canSubmit =
    status === 'editing' &&
    Boolean(barber) &&
    Boolean(slotIso) &&
    clientName.trim().length >= 2 &&
    clientEmail.includes('@');

  const submit = useCallback(async () => {
    if (!barber || !slotIso || status === 'submitting') return;
    setStatus('submitting');
    setErrorMessage(undefined);

    const result = await reserveBooking({
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      date_time: slotIso,
      barber_name: barber,
    });

    if (result.ok) {
      setConfirmation(result.confirmation);
      setStatus('confirmed');
      return;
    }

    setStatus('editing');
    if (result.code === 'SLOT_TAKEN') {
      setTakenSinceLoad((previous) => ({
        ...previous,
        [slotIso]: [...(previous[slotIso] ?? []), barber],
      }));
      setSlotIso(undefined);
      setErrorMessage('Ese hueco se acaba de ocupar. Elige otra hora, por favor.');
      return;
    }
    setErrorMessage(result.message);
  }, [barber, clientEmail, clientName, slotIso, status]);

  return {
    status,
    barber,
    dayKey,
    slotIso,
    clientName,
    clientEmail,
    errorMessage,
    confirmation,
    selectedDay,
    availableDayKeys,
    canSubmit,
    isSlotTaken,
    selectBarber,
    selectDay,
    selectSlot,
    setClientName,
    setClientEmail,
    submit,
  };
}
