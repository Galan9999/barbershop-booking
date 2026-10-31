import 'server-only';
import { Resend } from 'resend';
import { env } from '@/shared/config/env';
import type { EmailTransport, OutgoingEmail } from '@/shared/infrastructure/email/transports/types';

export function createResendTransport(): EmailTransport {
  const client = new Resend(env.RESEND_API_KEY);
  return {
    async send(email: OutgoingEmail) {
      try {
        const { error } = await client.emails.send({
          from: env.EMAIL_FROM,
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          attachments: email.attachments?.map((attachment) => ({
            filename: attachment.filename,
            content: Buffer.from(attachment.content, 'utf8'),
            contentType: attachment.contentType,
          })),
        });
        if (error) {
          console.error('[email] resend rejected the message', { name: error.name });
          return { sent: false };
        }
        return { sent: true };
      } catch (err) {
        console.error('[email] resend send failed', {
          cause: err instanceof Error ? err.message : 'unknown',
        });
        return { sent: false };
      }
    },
  };
}
