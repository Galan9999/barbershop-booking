import 'server-only';
import {
  renderConfirmationHtml,
  renderConfirmationSubject,
  renderConfirmationText,
  type ConfirmationEmailData,
} from '@/modules/booking/infrastructure/templates/confirmation.template';
import { getEmailTransport } from '@/shared/infrastructure/email/transport';

export interface ConfirmationEmailInput extends ConfirmationEmailData {
  to: string;
}

/** Renders and delivers the booking confirmation. Never throws. */
export async function sendConfirmationEmail(
  input: ConfirmationEmailInput,
): Promise<{ sent: boolean }> {
  const { to, ...data } = input;
  return getEmailTransport().send({
    to,
    subject: renderConfirmationSubject(data),
    html: renderConfirmationHtml(data),
    text: renderConfirmationText(data),
  });
}
