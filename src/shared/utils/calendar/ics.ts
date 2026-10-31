import { formatAsCalendarTimestamp } from '@/shared/utils/datetime';

/**
 * iCalendar (RFC 5545) invitations.
 *
 * An .ics attachment with METHOD:REQUEST is what makes Gmail and Outlook show
 * the booking as a real invitation and add it to the calendar, instead of the
 * recipient having to click a link. METHOD:CANCEL on the same UID later
 * removes it again.
 */

export interface CalendarInvite {
  /** Stable across the invite and its cancellation: both must share it. */
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  attendeeName: string;
  /** Bumped on every update of the same UID; 0 for the original invite. */
  sequence?: number;
}

/** Escapes the characters RFC 5545 reserves inside a text value. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Folds a line to 75 octets, as the spec requires. Folding counts bytes, not
 * characters, so accented text is measured after encoding.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const character of line) {
    const size = encoder.encode(character).length;
    // Continuation lines start with a space, which costs one octet.
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += character;
    currentBytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function buildCalendar(invite: CalendarInvite, method: 'REQUEST' | 'CANCEL'): string {
  const status = method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barbershop Booking//ES',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${invite.uid}`,
    `DTSTAMP:${formatAsCalendarTimestamp(new Date())}`,
    `DTSTART:${formatAsCalendarTimestamp(invite.start)}`,
    `DTEND:${formatAsCalendarTimestamp(invite.end)}`,
    `SUMMARY:${escapeText(invite.summary)}`,
    `DESCRIPTION:${escapeText(invite.description)}`,
    `LOCATION:${escapeText(invite.location)}`,
    `ORGANIZER;CN=${escapeText(invite.organizerName)}:mailto:${invite.organizerEmail}`,
    `ATTENDEE;CN=${escapeText(invite.attendeeName)};RSVP=FALSE;` +
      `PARTSTAT=ACCEPTED;ROLE=REQ-PARTICIPANT:mailto:${invite.attendeeEmail}`,
    `SEQUENCE:${invite.sequence ?? 0}`,
    `STATUS:${status}`,
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // CRLF endings are required; many parsers reject bare newlines.
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export function buildCalendarInvite(invite: CalendarInvite): string {
  return buildCalendar(invite, 'REQUEST');
}

export function buildCalendarCancellation(invite: CalendarInvite): string {
  return buildCalendar({ ...invite, sequence: invite.sequence ?? 1 }, 'CANCEL');
}
