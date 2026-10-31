'use client';

import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import styles from './BookingCalendar.module.css';

interface BookingCalendarProps {
  /** Day keys ("YYYY-MM-DD") that still have bookable slots. */
  availableDayKeys: string[];
  selectedDayKey: string | undefined;
  onSelectDay: (dayKey: string) => void;
}

/** Parses "YYYY-MM-DD" as a local calendar date, avoiding UTC drift. */
function parseDayKey(dayKey: string): Date {
  const [year = 0, month = 1, day = 1] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function BookingCalendar({
  availableDayKeys,
  selectedDayKey,
  onSelectDay,
}: BookingCalendarProps) {
  const availableDates = availableDayKeys.map(parseDayKey);
  const selected = selectedDayKey ? parseDayKey(selectedDayKey) : undefined;
  const firstAvailable = availableDates[0];
  const lastAvailable = availableDates.at(-1);

  return (
    <div className={styles.calendar}>
      <DayPicker
        mode="single"
        locale={es}
        required={false}
        selected={selected}
        onSelect={(date) => {
          if (date) onSelectDay(toDayKey(date));
        }}
        // Everything the business rules exclude (closed days, past dates,
        // days beyond the horizon) is simply absent from availableDayKeys.
        disabled={(date) => !availableDayKeys.includes(toDayKey(date))}
        startMonth={firstAvailable}
        endMonth={lastAvailable}
        showOutsideDays={false}
        weekStartsOn={1}
      />
    </div>
  );
}
