'use client';

import styles from './BarberPicker.module.css';

interface BarberPickerProps {
  barbers: string[];
  selected: string | undefined;
  onSelect: (barber: string) => void;
}

export function BarberPicker({ barbers, selected, onSelect }: BarberPickerProps) {
  return (
    <div className={styles.group} role="radiogroup" aria-label="Barbero">
      {barbers.map((barber) => {
        const isSelected = selected === barber;
        return (
          <button
            key={barber}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`${styles.option} ${isSelected ? styles.selected : ''}`}
            onClick={() => onSelect(barber)}
          >
            <span className={styles.avatar} aria-hidden="true">
              {barber.charAt(0)}
            </span>
            <span className={styles.name}>{barber}</span>
          </button>
        );
      })}
    </div>
  );
}
