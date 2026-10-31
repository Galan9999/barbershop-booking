/**
 * A bookable slot: a barber plus an instant. Value object, compared by value,
 * which is what makes it safe as a map key for the availability grid.
 */
export class TimeSlot {
  readonly barberName: string;
  readonly startsAt: Date;

  constructor(barberName: string, startsAt: Date) {
    this.barberName = barberName;
    this.startsAt = startsAt;
  }

  /** Stable identity for lookups: the same slot always yields the same key. */
  get key(): string {
    return `${this.barberName}@${this.startsAt.toISOString()}`;
  }

  equals(other: TimeSlot): boolean {
    return this.key === other.key;
  }
}
