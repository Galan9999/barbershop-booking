import 'server-only';
import { env } from '@/shared/config/env';
import { createConsoleTransport } from '@/shared/infrastructure/email/transports/console';
import { createResendTransport } from '@/shared/infrastructure/email/transports/resend';
import type { EmailTransport } from '@/shared/infrastructure/email/transports/types';

let cached: EmailTransport | undefined;

/** Picks the transport once per process, from EMAIL_TRANSPORT. */
export function getEmailTransport(): EmailTransport {
  cached ??= env.EMAIL_TRANSPORT === 'console' ? createConsoleTransport() : createResendTransport();
  return cached;
}
