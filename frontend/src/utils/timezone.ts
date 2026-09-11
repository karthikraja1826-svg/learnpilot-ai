export function getMinutesSinceMidnightInTimezone(timezone?: string): number {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date());

      const hour = Number(parts.find((part) => part.type === 'hour')?.value);
      const minute = Number(parts.find((part) => part.type === 'minute')?.value);

      if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
        return hour * 60 + minute;
      }
    } catch {
      // Invalid IANA timezone string; fall through to browser local time.
    }
  }

  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
