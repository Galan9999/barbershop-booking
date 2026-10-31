import 'server-only';
import type {
  BookingNotification,
  BookingNotifier,
} from '@/modules/booking/domain/interfaces/booking-notifier.interface';
import {
  renderConfirmationHtml,
  renderConfirmationSubject,
  renderConfirmationText,
} from '@/modules/booking/infrastructure/templates/confirmation.template';
import type { EmailTransport } from '@/shared/infrastructure/email/transports/types';

/** Email implementation of the BookingNotifier port. */
export class EmailBookingNotifier implements BookingNotifier {
  private readonly transport: EmailTransport;
  private readonly businessName: string;
  private readonly businessAddress: string;

  constructor(options: {
    transport: EmailTransport;
    businessName: string;
    businessAddress: string;
  }) {
    this.transport = options.transport;
    this.businessName = options.businessName;
    this.businessAddress = options.businessAddress;
  }

  /** Never throws: the transport already reports failure as { sent: false }. */
  async sendConfirmation(notification: BookingNotification): Promise<{ sent: boolean }> {
    const data = {
      clientName: notification.clientName,
      barberName: notification.barberName,
      businessName: this.businessName,
      businessAddress: this.businessAddress,
      formattedDateTime: notification.formattedDateTime,
      googleCalendarUrl: notification.googleCalendarUrl,
      cancelUrl: notification.cancelUrl,
    };
    return this.transport.send({
      to: notification.to,
      subject: renderConfirmationSubject(data),
      html: renderConfirmationHtml(data),
      text: renderConfirmationText(data),
    });
  }
}
