import type {
  AppointmentViewDto,
  BookingConfirmationDto,
  CancellationDto,
} from '@/modules/booking/application/dto/booking.dto';
import { BookingError } from '@/modules/booking/domain/booking-errors';
import { assertBookable } from '@/modules/booking/domain/booking-rules';
import type { Appointment } from '@/modules/booking/domain/entities/appointment.entity';
import type {
  AppointmentRepository,
  NewAppointmentData,
} from '@/modules/booking/domain/interfaces/appointment-repository.interface';
import { SlotAlreadyTakenError } from '@/modules/booking/domain/interfaces/appointment-repository.interface';
import type { BookingNotifier } from '@/modules/booking/domain/interfaces/booking-notifier.interface';
import type { Clock } from '@/modules/booking/domain/interfaces/clock.interface';
import { TimeSlot } from '@/modules/booking/domain/value-objects/time-slot';
import { APPOINTMENT_MINUTES } from '@/shared/config/business.config';
import { buildGoogleCalendarUrl } from '@/shared/utils/calendar/google-calendar-url';
import { formatFullDateTime } from '@/shared/utils/datetime';

/** Everything the use cases need from the outside world, injected explicitly. */
export interface BookingServiceDependencies {
  repository: AppointmentRepository;
  notifier: BookingNotifier;
  clock: Clock;
  timeZone: string;
  appUrl: string;
  businessName: string;
  businessAddress: string;
}

/**
 * Booking use cases. Depends only on domain ports and plain configuration, so
 * it can be exercised with fakes and knows nothing about HTTP, SQL or email
 * providers. Assembled in `booking.module.ts`.
 */
export class BookingService {
  private readonly deps: BookingServiceDependencies;

  constructor(dependencies: BookingServiceDependencies) {
    this.deps = dependencies;
  }

  async createBooking(data: NewAppointmentData): Promise<BookingConfirmationDto> {
    const now = this.deps.clock.now();
    assertBookable(data.startsAt, now, this.deps.timeZone);

    let appointment: Appointment;
    try {
      appointment = await this.deps.repository.create(data);
    } catch (error) {
      if (!(error instanceof SlotAlreadyTakenError)) throw error;
      return this.resolveLostRace(data);
    }

    // Deliberately after the write: a failed notification must never undo a
    // stored booking, so its outcome is reported rather than thrown.
    const { sent } = await this.deps.notifier.sendConfirmation({
      to: appointment.clientEmail,
      clientName: appointment.clientName,
      barberName: appointment.barberName,
      formattedDateTime: this.formatDateTime(appointment.startsAt),
      googleCalendarUrl: this.buildCalendarUrl(appointment),
      cancelUrl: this.buildCancelUrl(appointment.cancelToken),
    });

    return this.toConfirmationDto(appointment, { emailSent: sent, idempotentReplay: false });
  }

  async cancelBooking(token: string): Promise<CancellationDto> {
    const now = this.deps.clock.now();
    const didCancel = await this.deps.repository.cancel(token, now);

    const appointment = await this.deps.repository.findByCancelToken(token);
    if (!appointment) {
      throw new BookingError('TOKEN_NOT_FOUND', 'This cancellation link is not valid.');
    }

    if (didCancel) {
      return {
        cancelled: true,
        appointment: {
          id: appointment.id,
          barber_name: appointment.barberName,
          formatted_date_time: this.formatDateTime(appointment.startsAt),
        },
      };
    }

    // Nothing changed: the entity itself says whether that is fine or an error.
    const problem = appointment.reasonCancellationIsImpossible(now);
    if (problem) throw problem;
    return { cancelled: true, already_cancelled: true };
  }

  /** Read model for the cancellation page. Entities never leave this layer. */
  async getAppointmentByToken(token: string): Promise<AppointmentViewDto | null> {
    const appointment = await this.deps.repository.findByCancelToken(token);
    if (!appointment) return null;
    return {
      clientName: appointment.clientName,
      barberName: appointment.barberName,
      formattedDateTime: this.formatDateTime(appointment.startsAt),
      status: appointment.status,
      canBeCancelled: appointment.canBeCancelledAt(this.deps.clock.now()),
    };
  }

  /**
   * A unique-constraint rejection means either a genuine race or the same
   * client submitting twice. Only the second is safe to report as success.
   */
  private async resolveLostRace(data: NewAppointmentData): Promise<BookingConfirmationDto> {
    const existing = await this.deps.repository.findConfirmedAt(
      new TimeSlot(data.barberName, data.startsAt),
    );
    if (existing?.belongsTo(data.clientEmail)) {
      return this.toConfirmationDto(existing, { emailSent: false, idempotentReplay: true });
    }
    throw new BookingError('SLOT_TAKEN', 'That slot has just been booked. Pick another one.');
  }

  private formatDateTime(instant: Date): string {
    return formatFullDateTime(instant, this.deps.timeZone);
  }

  private buildCancelUrl(cancelToken: string): string {
    return `${this.deps.appUrl}/cancel/${cancelToken}`;
  }

  private buildCalendarUrl(appointment: Appointment): string {
    return buildGoogleCalendarUrl({
      title: `${this.deps.businessName} — ${appointment.barberName}`,
      start: appointment.startsAt,
      end: appointment.endsAt(APPOINTMENT_MINUTES),
      details: `Cita con ${appointment.barberName}. Reserva a nombre de ${appointment.clientName}.`,
      location: this.deps.businessAddress,
    });
  }

  private toConfirmationDto(
    appointment: Appointment,
    flags: { emailSent: boolean; idempotentReplay: boolean },
  ): BookingConfirmationDto {
    return {
      appointment: {
        id: appointment.id,
        client_name: appointment.clientName,
        date_time: appointment.startsAt.toISOString(),
        barber_name: appointment.barberName,
        status: 'confirmed',
      },
      formatted_date_time: this.formatDateTime(appointment.startsAt),
      google_calendar_url: this.buildCalendarUrl(appointment),
      email_sent: flags.emailSent,
      idempotent_replay: flags.idempotentReplay,
    };
  }
}
