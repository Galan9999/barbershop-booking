import { toGoogleCalendarUtc } from '@/lib/time';

interface CalendarEventInput {
  title: string;
  start: Date;
  end: Date;
  details: string;
  location: string;
}

/**
 * Google Calendar web template link ("render?action=TEMPLATE").
 * No API, no OAuth: the user lands on a prefilled "save event" screen.
 */
export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toGoogleCalendarUtc(event.start)}/${toGoogleCalendarUtc(event.end)}`,
    details: event.details,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
