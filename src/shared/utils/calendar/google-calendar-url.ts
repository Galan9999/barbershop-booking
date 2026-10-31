import { formatAsCalendarTimestamp } from '@/shared/utils/datetime';

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  details: string;
  location: string;
}

/**
 * Google Calendar web template link. No API and no OAuth: the link opens a
 * prefilled "save event" screen, which keeps the integration free.
 */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatAsCalendarTimestamp(event.start)}/${formatAsCalendarTimestamp(event.end)}`,
    details: event.details,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
