export interface CalendarEventDetails {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizerName: string;
  organizerEmail: string;
  attendees: Array<{ name: string; email: string }>;
  method?: "REQUEST" | "CANCEL";
  sequence?: number;
}

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, "");
}

function escapeICSString(str: string): string {
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateIcsFile(event: CalendarEventDetails): string {
  const nowStr = formatDateToICS(new Date());
  const startStr = formatDateToICS(event.startTime);
  const endStr = formatDateToICS(event.endTime);
  const method = event.method || "REQUEST";
  const sequence = event.sequence || 0;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Khademni//Teacher Recruitment Platform//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SEQUENCE:${sequence}`,
    `SUMMARY:${escapeICSString(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSString(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSString(event.location)}`);
  }

  lines.push(
    `ORGANIZER;CN="${escapeICSString(event.organizerName)}":mailto:${event.organizerEmail}`,
  );

  event.attendees.forEach((attendee) => {
    lines.push(
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${escapeICSString(attendee.name)}":mailto:${attendee.email}`,
    );
  });

  lines.push("STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

export function generateGoogleCalendarUrl(event: CalendarEventDetails): string {
  const startStr = formatDateToICS(event.startTime);
  const endStr = formatDateToICS(event.endTime);
  
  const baseUrl = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${startStr}/${endStr}`,
    details: event.description || "",
    location: event.location || "",
  });

  return `${baseUrl}?${params.toString()}`;
}

export function generateOutlookCalendarUrl(event: CalendarEventDetails): string {
  const baseUrl = "https://outlook.live.com/calendar/0/deeplink/compose";
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startTime.toISOString(),
    enddt: event.endTime.toISOString(),
    body: event.description || "",
    location: event.location || "",
  });

  return `${baseUrl}?${params.toString()}`;
}
