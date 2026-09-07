function partsForTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

/** Convert a datetime-local value interpreted in an IANA timezone to an instant. */
export function localDateTimeToIso(value, timeZone) {
  if (!value || !timeZone) throw new Error('A date, time, and timezone are required.');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw new Error('Enter a valid date and time.');
  const [, year, month, day, hour, minute, second = '00'] = match;
  const wallClock = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const displayed = partsForTimeZone(new Date(wallClock), timeZone);
  const asUtc = Date.UTC(Number(displayed.year), Number(displayed.month) - 1, Number(displayed.day), Number(displayed.hour), Number(displayed.minute), Number(displayed.second));
  return new Date(wallClock - (asUtc - wallClock)).toISOString();
}

export function formatMeetingTime(iso, timeZone, options = {}) {
  if (!iso) return 'Time unavailable';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone, ...options }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function isoToLocalDateTime(iso, timeZone) {
  if (!iso) return '';
  const parts = partsForTimeZone(new Date(iso), timeZone || 'UTC');
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;
}
