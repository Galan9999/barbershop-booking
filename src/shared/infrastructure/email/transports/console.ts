import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EmailTransport, OutgoingEmail } from '@/shared/infrastructure/email/transports/types';

const OUTBOX_DIR = '.dev-emails';

/**
 * Development transport: nothing leaves the machine. Writes the message to
 * .dev-emails/ and logs its path, so cancellation links stay testable without
 * a provider account or a verified domain.
 */
export function createConsoleTransport(): EmailTransport {
  return {
    async send(email: OutgoingEmail) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const slug = email.to.replace(/[^a-z0-9]/gi, '_');
      try {
        await mkdir(OUTBOX_DIR, { recursive: true });
        const file = join(OUTBOX_DIR, `${stamp}_${slug}.html`);
        await writeFile(file, email.html, 'utf8');
        console.info(`[email:dev] "${email.subject}" -> ${email.to}\n  saved: ${file}`);
        console.info(`[email:dev] text body:\n${email.text}`);
        return { sent: true };
      } catch (err) {
        console.error('[email:dev] could not write the message', {
          cause: err instanceof Error ? err.message : 'unknown',
        });
        return { sent: false };
      }
    },
  };
}
