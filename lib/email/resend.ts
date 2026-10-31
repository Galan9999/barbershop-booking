import 'server-only';
import { Resend } from 'resend';
import { env } from '@/lib/env';
import {
  confirmationHtml,
  confirmationSubject,
  confirmationText,
} from '@/lib/email/templates/confirmation';

const resend = new Resend(env.RESEND_API_KEY);

interface ConfirmationEmailInput {
  to: string;
  clientName: string;
  barberName: string;
  businessName: string;
  businessAddress: string;
  formattedDateTime: string;
  googleCalendarUrl: string;
  cancelUrl: string;
}

/**
 * Sends the booking confirmation. Never throws: an email failure must not
 * roll back a stored booking (CLAUDE.md §3.6) — callers get { sent: false }.
 */
export async function sendConfirmationEmail(
  input: ConfirmationEmailInput,
): Promise<{ sent: boolean }> {
  const data = {
    clientName: input.clientName,
    barberName: input.barberName,
    businessName: input.businessName,
    businessAddress: input.businessAddress,
    formattedDateTime: input.formattedDateTime,
    googleCalendarUrl: input.googleCalendarUrl,
    cancelUrl: input.cancelUrl,
  };
  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: confirmationSubject(data),
      html: confirmationHtml(data),
      text: confirmationText(data),
    });
    if (error) {
      console.error('[email] resend rejected confirmation', { name: error.name });
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error('[email] confirmation send failed', {
      cause: err instanceof Error ? err.message : 'unknown',
    });
    return { sent: false };
  }
}
