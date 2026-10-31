/**
 * Port for notifying a client about their booking. The domain states what must
 * be communicated; infrastructure decides how (email provider, template, file).
 */

export interface BookingNotification {
  to: string;
  clientName: string;
  barberName: string;
  formattedDateTime: string;
  googleCalendarUrl: string;
  cancelUrl: string;
}

export interface BookingNotifier {
  /**
   * Delivers the confirmation. MUST NOT throw: a failed notification can never
   * undo a stored booking, so the outcome is reported instead.
   */
  sendConfirmation(notification: BookingNotification): Promise<{ sent: boolean }>;
}
