'use client';

import type { ServiceDto } from '@/modules/booking/application/availability.service';
import { ServiceIcon } from './ServiceIcon';
import styles from './ServicePicker.module.css';

interface ServicePickerProps {
  services: ServiceDto[];
  selected: string | undefined;
  paymentNote: string;
  onSelect: (serviceId: string) => void;
}

export function ServicePicker({ services, selected, paymentNote, onSelect }: ServicePickerProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.group} role="radiogroup" aria-label="Servicio">
        {services.map((service) => {
          const isSelected = selected === service.id;
          return (
            <button
              key={service.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.option} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelect(service.id)}
            >
              <ServiceIcon serviceId={service.id} className={styles.icon} />
              <span className={styles.label}>{service.label}</span>
              <span className={styles.meta}>
                <span>{service.minutes} min</span>
                <span className={styles.price}>{service.priceLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className={styles.note}>{paymentNote}</p>
    </div>
  );
}
