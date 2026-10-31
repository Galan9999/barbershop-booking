/** A transport delivers a rendered message. It never throws: a failed email
 *  must not roll back a stored booking. */

export interface EmailAttachment {
  filename: string;
  /** UTF-8 content. Calendar invitations are plain text. */
  content: string;
  /** e.g. 'text/calendar; charset=utf-8; method=REQUEST'. */
  contentType?: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

export interface EmailTransport {
  send(email: OutgoingEmail): Promise<{ sent: boolean }>;
}

/** Pulls the bare address out of `Name <addr@host>`, or returns it unchanged. */
export function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim();
}
