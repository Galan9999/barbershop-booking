'use client';

import type { SlotAvailabilityDto } from '@/modules/booking/application/availability.service';
import styles from './SlotPicker.module.css';

interface SlotPickerProps {
  slots: SlotAvailabilityDto[];
  selectedIso: string | undefined;
  /** Slots this barber cannot take, including ones taken since page load. */
  isTaken: (slot: SlotAvailabilityDto) => boolean;
  onSelect: (iso: string) => void;
}

export function SlotPicker({ slots, selectedIso, isTaken, onSelect }: SlotPickerProps) {
  const available = slots.filter((slot) => !isTaken(slot));

  if (available.length === 0) {
    return (
      <p className={styles.empty} role="status">
        No quedan horas libres este día. Prueba con otra fecha.
      </p>
    );
  }

  return (
    <div className={styles.grid} role="radiogroup" aria-label="Hora">
      {slots.map((slot) => {
        const taken = isTaken(slot);
        const isSelected = selectedIso === slot.iso;
        return (
          <button
            key={slot.iso}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={taken ? `${slot.timeLabel}, no disponible` : slot.timeLabel}
            disabled={taken}
            className={`${styles.slot} ${isSelected ? styles.selected : ''}`}
            onClick={() => onSelect(slot.iso)}
          >
            {slot.timeLabel}
          </button>
        );
      })}
    </div>
  );
}
