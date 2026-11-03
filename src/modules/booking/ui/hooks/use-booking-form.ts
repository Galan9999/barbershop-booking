'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AvailabilityDto,
  DayAvailabilityDto,
  ServiceDto,
  SlotAvailabilityDto,
} from '@/modules/booking/application/availability.service';
import type { BookingConfirmationDto } from '@/modules/booking/application/dto/booking.dto';
import { reserveBooking } from '@/modules/booking/ui/booking.client';
import { useNow } from '@/modules/booking/ui/hooks/use-now';

/**
 * What the client reads when the API refuses. The domain messages are for
 * logs and developers; these are the words a customer should see.
 */
const GENERIC_ERROR_MESSAGE = 'No se pudo completar la reserva. Inténtalo de nuevo.';

const ERROR_MESSAGES: Record<string, string> = {
  TOO_SOON: 'Esa hora ya ha pasado o está demasiado cerca. Elige otra, por favor.',
  TOO_FAR_AHEAD: 'Todavía no se puede reservar para esa fecha.',
  OUTSIDE_OPENING_HOURS: 'Esa hora no está disponible. Elige otra, por favor.',
  UNKNOWN_SERVICE: 'Ese servicio ya no está disponible. Recarga la página.',
  VALIDATION_ERROR: 'Revisa los datos: falta alguno o no es válido.',
};

export type BookingFormStatus = 'editing' | 'submitting' | 'confirmed';

interface UseBookingFormOptions {
  availability: AvailabilityDto;
  initialBarber?: string;
}

export interface BookingFormState {
  status: BookingFormStatus;
  serviceId: string | undefined;
  selectedService: ServiceDto | undefined;
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
  /** True when the chosen service cannot start at this slot for this barber. */
  isSlotTaken: (slot: SlotAvailabilityDto) => boolean;
  selectService: (serviceId: string) => void;
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
  const [serviceId, setServiceId] = useState<string>();
  // A one-barber shop has nothing to choose: preselect so the step can hide.
  const onlyBarber = availability.barbers.length === 1 ? availability.barbers[0] : undefined;
  const [barber, setBarber] = useState<string | undefined>(initialBarber ?? onlyBarber);
  const [dayKey, setDayKey] = useState<string | undefined>(availability.days[0]?.dayKey);
  const [slotIso, setSlotIso] = useState<string>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [confirmation, setConfirmation] = useState<BookingConfirmationDto>();
  const [takenSinceLoad, setTakenSinceLoad] = useState<Record<string, string[]>>({});

  // Back from a tab hidden for a while: other people may have booked since.
  const router = useRouter();
  const refreshAvailability = useCallback(() => router.refresh(), [router]);
  const now = useNow({ intervalMs: 30_000, staleAfterMs: 120_000, onResume: refreshAvailability });

  /** Earliest bookable instant right now; null before mount (trust the server grid). */
  const cutoff = now === null ? null : now + availability.minAdvanceMinutes * 60_000;
  const hasPassed = useCallback(
    (slot: SlotAvailabilityDto) => cutoff !== null && Date.parse(slot.iso) < cutoff,
    [cutoff],
  );

  // A day stays selectable only while some hour on it is still ahead.
  const availableDayKeys = useMemo(
    () =>
      availability.days
        .filter((day) => day.slots.some((slot) => !hasPassed(slot)))
        .map((day) => day.dayKey),
    [availability.days, hasPassed],
  );

  const selectedDay = useMemo(
    () => availability.days.find((day) => day.dayKey === dayKey),
    [availability.days, dayKey],
  );

  const selectedService = useMemo(
    () => availability.services.find((service) => service.id === serviceId),
    [availability.services, serviceId],
  );

  /**
   * A service of N minutes needs N / slotMinutes consecutive free slots on the
   * same day: an hour-long cut at 20:00 does not fit a shop that closes at
   * 20:30, and one at 10:00 does not fit if 10:30 is booked. The server and
   * the database enforce the same thing; this only keeps the grid honest.
   */
  const isSlotTaken = useCallback(
    (slot: SlotAvailabilityDto): boolean => {
      if (!barber || !selectedDay) return false;
      const busy = (candidate: SlotAvailabilityDto) =>
        candidate.takenBy.includes(barber) ||
        (takenSinceLoad[candidate.iso] ?? []).includes(barber);

      const needed = Math.max(1, (selectedService?.minutes ?? 0) / availability.slotMinutes);
      const slotMs = availability.slotMinutes * 60_000;
      if (hasPassed(slot)) return true;
      const start = selectedDay.slots.findIndex((candidate) => candidate.iso === slot.iso);
      if (start === -1) return true;

      for (let offset = 0; offset < needed; offset += 1) {
        const candidate = selectedDay.slots[start + offset];
        const expected = new Date(Date.parse(slot.iso) + offset * slotMs).toISOString();
        if (!candidate || candidate.iso !== expected || busy(candidate)) return true;
      }
      return false;
    },
    [availability.slotMinutes, barber, hasPassed, selectedDay, selectedService, takenSinceLoad],
  );

  // Time moved on under an open form: drop a choice that is no longer valid
  // instead of letting the submit fail.
  useEffect(() => {
    if (slotIso && cutoff !== null && Date.parse(slotIso) < cutoff) {
      setSlotIso(undefined);
      setErrorMessage('La hora que habías elegido ya ha pasado. Elige otra, por favor.');
    }
  }, [cutoff, slotIso]);

  useEffect(() => {
    if (dayKey && !availableDayKeys.includes(dayKey)) setDayKey(availableDayKeys[0]);
  }, [availableDayKeys, dayKey]);

  const selectService = useCallback((next: string) => {
    setServiceId(next);
    // A longer service may no longer fit where the chosen time was.
    setSlotIso(undefined);
    setErrorMessage(undefined);
  }, []);

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
    Boolean(serviceId) &&
    Boolean(barber) &&
    Boolean(slotIso) &&
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    clientEmail.includes('@') &&
    hasEnoughDigits;

  const submit = useCallback(async () => {
    if (!serviceId || !barber || !slotIso || status === 'submitting') return;
    setStatus('submitting');
    setErrorMessage(undefined);

    const result = await reserveBooking({
      client_first_name: firstName.trim(),
      client_last_name: lastName.trim(),
      client_email: clientEmail.trim(),
      client_phone: clientPhone.trim(),
      date_time: slotIso,
      barber_name: barber,
      service_id: serviceId,
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
    // NETWORK is worded by the browser client already; anything unexpected
    // from the server gets a generic line rather than its internal message.
    setErrorMessage(
      ERROR_MESSAGES[result.code] ??
        (result.code === 'NETWORK' ? result.message : GENERIC_ERROR_MESSAGE),
    );
  }, [barber, clientEmail, clientPhone, firstName, lastName, serviceId, slotIso, status]);

  return {
    status,
    serviceId,
    selectedService,
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
    selectService,
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
