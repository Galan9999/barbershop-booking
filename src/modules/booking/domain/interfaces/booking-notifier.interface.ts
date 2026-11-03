/**
 * Port for notifying about a booking. The domain states what must be
 * communicated; infrastructure decides how (email provider, template,
 * calendar attachment).
 */

export interface BookingNotification {
  to: string;
  clientName: string;
  barberName: string;
  serviceName: string;
  /** In euros. */
  price: number;
  formattedDateTime: string;
  googleCalendarUrl: string;
  cancelUrl: string;
}

/** What the shop needs to act on a booking, including how to reach the client. */
export interface ShopNotification {
  appointmentId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  barberName: string;
  serviceName: string;
  /** In euros. */
  price: number;
  formattedDateTime: string;
  startsAt: Date;
  endsAt: Date;
}

export interface BookingNotifier {
  /**
   * Delivers the confirmation to the client. MUST NOT throw: a failed
   * notification can never undo a stored booking, so the outcome is reported.
   */
  sendConfirmation(notification: BookingNotification): Promise<{ sent: boolean }>;

  /**
   * Tells the shop about a new booking, with a calendar invitation attached so
   * it lands in their calendar without anyone clicking anything.
   */
  notifyShopOfBooking(notification: ShopNotification): Promise<{ sent: boolean }>;

  /**
   * Tells the shop a booking is off. Carries a cancellation for the same
   * calendar entry, so it disappears instead of lingering.
   */
  notifyShopOfCancellation(notification: ShopNotification): Promise<{ sent: boolean }>;
}
