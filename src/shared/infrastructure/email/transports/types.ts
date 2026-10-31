/** A transport delivers a rendered message. It never throws: a failed email
 *  must not roll back a stored booking. */
export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailTransport {
  send(email: OutgoingEmail): Promise<{ sent: boolean }>;
}
