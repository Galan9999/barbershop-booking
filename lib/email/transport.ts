import 'server-only';
import { env } from '@/lib/env';
import { createConsoleTransport } from './transports/console';
import { createResendTransport } from './transports/resend';
import type { EmailTransport } from './transports/types';

let cached: EmailTransport | undefined;

/** Picks the transport once per process, from EMAIL_TRANSPORT. */
export function getEmailTransport(): EmailTransport {
  cached ??= env.EMAIL_TRANSPORT === 'console' ? createConsoleTransport() : createResendTransport();
  return cached;
}
