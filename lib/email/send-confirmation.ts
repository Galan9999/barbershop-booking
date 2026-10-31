import 'server-only';
import {
  confirmationHtml,
  confirmationSubject,
  confirmationText,
} from '@/lib/email/templates/confirmation';
import { getEmailTransport } from '@/lib/email/transport';

export interface ConfirmationEmailInput {
  to: string;
  clientName: string;
  barberName: string;
  businessName: string;
  businessAddress: string;
  formattedDateTime: string;
  googleCalendarUrl: string;
  cancelUrl: string;
}

/** Renders and delivers the booking confirmation. Never throws. */
export async function sendConfirmationEmail(
  input: ConfirmationEmailInput,
): Promise<{ sent: boolean }> {
  const { to, ...data } = input;
  return getEmailTransport().send({
    to,
    subject: confirmationSubject(data),
    html: confirmationHtml(data),
    text: confirmationText(data),
  });
}
