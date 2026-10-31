'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  AvailabilityDto,
  DayAvailabilityDto,
  SlotAvailabilityDto,
} from '@/modules/booking/application/availability.service';
import type { BookingConfirmationDto } from '@/modules/booking/application/dto/booking.dto';
import { reserveBooking } from '@/modules/booking/ui/booking.client';

export type BookingFormStatus = 'editing' | 'submitting' | 'confirmed';

interface UseBookingFormOptions {
  availability: AvailabilityDto;
  initialBarber?: string;
}

export interface BookingFormState {
  status: BookingFormStatus;
  barber: string | undefined;
  dayKey: string | undefined;
  slotIso: string | undefined;
  firstName: string;
  lastName: string;
  clientEmail: string;
  clientPhone: string;
  errorMessage: string | undefined;
  confirmation: BookingConfirmationDto | undefined;
  selectedDay: DayAvailabilityDto | undefined;
  availableDayKeys: string[];
  canSubmit: boolean;
  isSlotTaken: (slot: SlotAvailabilityDto) => boolean;
  selectBarber: (barber: string) => void;
  selectDay: (dayKey: string) => void;
  selectSlot: (iso: string) => void;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setClientEmail: (value: string) => void;
  setClientPhone: (value: string) => void;
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [confirmation, setConfirmation] = useState<BookingConfirmationDto>();
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
    (slot: SlotAvailabilityDto): boolean => {
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

  // Mirrors the server schema closely enough to avoid a pointless round trip,
  // but the API stays the authority: this only decides when to enable submit.
  const hasEnoughDigits = (clientPhone.match(/[0-9]/g) ?? []).length >= 7;
  const canSubmit =
    status === 'editing' &&
    Boolean(barber) &&
    Boolean(slotIso) &&
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    clientEmail.includes('@') &&
    hasEnoughDigits;

  const submit = useCallback(async () => {
    if (!barber || !slotIso || status === 'submitting') return;
    setStatus('submitting');
    setErrorMessage(undefined);

    const result = await reserveBooking({
      client_first_name: firstName.trim(),
      client_last_name: lastName.trim(),
      client_email: clientEmail.trim(),
      client_phone: clientPhone.trim(),
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
  }, [barber, clientEmail, clientPhone, firstName, lastName, slotIso, status]);

  return {
    status,
    barber,
    dayKey,
    slotIso,
    firstName,
    lastName,
    clientEmail,
    clientPhone,
    errorMessage,
    confirmation,
    selectedDay,
    availableDayKeys,
    canSubmit,
    isSlotTaken,
    selectBarber,
    selectDay,
    selectSlot,
    setFirstName,
    setLastName,
    setClientEmail,
    setClientPhone,
    submit,
  };
}
