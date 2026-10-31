import 'server-only';
import type {
  BookingNotification,
  BookingNotifier,
  ShopNotification,
} from '@/modules/booking/domain/interfaces/booking-notifier.interface';
import {
  renderConfirmationHtml,
  renderConfirmationSubject,
  renderConfirmationText,
} from '@/modules/booking/infrastructure/templates/confirmation.template';
import {
  renderShopNoticeHtml,
  renderShopNoticeSubject,
  renderShopNoticeText,
  type ShopNoticeData,
} from '@/modules/booking/infrastructure/templates/shop-notice.template';
import {
  buildCalendarCancellation,
  buildCalendarInvite,
  type CalendarInvite,
} from '@/shared/utils/calendar/ics';
import {
  extractEmailAddress,
  type EmailTransport,
} from '@/shared/infrastructure/email/transports/types';

interface NotifierOptions {
  transport: EmailTransport;
  businessName: string;
  businessAddress: string;
  /** Where the shop receives bookings: the invitation's attendee. */
  businessEmail: string;
  /** The From header. Its address must also be the invitation's organizer. */
  emailFrom: string;
}

/** Email implementation of the BookingNotifier port. */
export class EmailBookingNotifier implements BookingNotifier {
  private readonly options: NotifierOptions;

  constructor(options: NotifierOptions) {
    this.options = options;
  }

  async sendConfirmation(notification: BookingNotification): Promise<{ sent: boolean }> {
    const data = {
      clientName: notification.clientName,
      barberName: notification.barberName,
      businessName: this.options.businessName,
      businessAddress: this.options.businessAddress,
      formattedDateTime: notification.formattedDateTime,
      googleCalendarUrl: notification.googleCalendarUrl,
      cancelUrl: notification.cancelUrl,
    };
    return this.options.transport.send({
      to: notification.to,
      subject: renderConfirmationSubject(data),
      html: renderConfirmationHtml(data),
      text: renderConfirmationText(data),
    });
  }

  notifyShopOfBooking(notification: ShopNotification): Promise<{ sent: boolean }> {
    return this.sendShopNotice(notification, 'booked');
  }

  notifyShopOfCancellation(notification: ShopNotification): Promise<{ sent: boolean }> {
    return this.sendShopNotice(notification, 'cancelled');
  }

  private sendShopNotice(
    notification: ShopNotification,
    kind: 'booked' | 'cancelled',
  ): Promise<{ sent: boolean }> {
    const data: ShopNoticeData = {
      clientName: notification.clientName,
      clientEmail: notification.clientEmail,
      clientPhone: notification.clientPhone,
      barberName: notification.barberName,
      formattedDateTime: notification.formattedDateTime,
    };

    const invite = this.buildInvite(notification);
    const booked = kind === 'booked';
    // Same UID as the original invite, so the cancellation replaces the event
    // instead of adding a second one.
    const calendar = booked ? buildCalendarInvite(invite) : buildCalendarCancellation(invite);

    return this.options.transport.send({
      to: this.options.businessEmail,
      subject: renderShopNoticeSubject(data, kind),
      html: renderShopNoticeHtml(data, kind),
      text: renderShopNoticeText(data, kind),
      attachments: [
        {
          filename: booked ? 'cita.ics' : 'cancelacion.ics',
          content: calendar,
          contentType: `text/calendar; charset=utf-8; method=${booked ? 'REQUEST' : 'CANCEL'}`,
        },
      ],
    });
  }

  private buildInvite(notification: ShopNotification): CalendarInvite {
    return {
      // Derived from the appointment id so the invite and its cancellation
      // always refer to the same calendar entry.
      uid: `appointment-${notification.appointmentId}@barbershop-booking`,
      start: notification.startsAt,
      end: notification.endsAt,
      summary: `${notification.clientName} — ${notification.barberName}`,
      description: [
        `Cliente: ${notification.clientName}`,
        `Teléfono: ${notification.clientPhone}`,
        `Email: ${notification.clientEmail}`,
        `Barbero: ${notification.barberName}`,
      ].join('\n'),
      location: this.options.businessAddress,
      // Organizer must match the sending address. A mismatch looks like
      // spoofing to Gmail, which then refuses to add the event by itself.
      organizerEmail: extractEmailAddress(this.options.emailFrom),
      organizerName: this.options.businessName,
      attendeeEmail: this.options.businessEmail,
      attendeeName: this.options.businessName,
    };
  }
}
