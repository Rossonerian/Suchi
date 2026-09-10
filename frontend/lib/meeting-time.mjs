import { getDaysInMonth } from 'date-fns';

function pad(value) {
  return String(value).padStart(2, '0');
}

function partsForTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
}

function sameWallClock(parts, target) {
  return (
    parts.year === target.year &&
    parts.month === target.month &&
    parts.day === target.day &&
    parts.hour === target.hour &&
    parts.minute === target.minute
  );
}

function resolveWallClock(value, timeZone) {
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) throw new Error('Invalid datetime value.');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const expected = {
    year: String(year),
    month: pad(month),
    day: pad(day),
    hour: pad(hour),
    minute: pad(minute),
  };

  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const candidates = new Set();
  const offsetsToProbe = [
    0,
    -14 * 60,
    -12 * 60,
    -10 * 60,
    -8 * 60,
    -6 * 60,
    -5 * 60,
    -4 * 60,
    0,
    60,
    2 * 60,
    3 * 60,
    4 * 60,
    5 * 60,
    5.5 * 60,
    6 * 60,
    8 * 60,
    9 * 60,
    10 * 60,
    12 * 60,
  ];

  for (const offsetMinutes of offsetsToProbe) {
    const candidate = naiveUtc - offsetMinutes * 60 * 1000;
    if (sameWallClock(partsForTimeZone(new Date(candidate), timeZone), expected)) candidates.add(candidate);
  }

  if (!candidates.size) throw new Error(`The selected time does not exist in ${timeZone}; choose another time.`);
  return new Date(Math.min(...candidates)).toISOString();
}

/** Convert a datetime-local value interpreted in an IANA timezone to an instant. */
export function localDateTimeToIso(value, timeZone) {
  if (!value || !timeZone) throw new Error('A date, time, and timezone are required.');
  // Constructing the formatter validates the IANA timezone before resolving
  // the value, so an invalid zone cannot silently fall back to local time.
  new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions();
  return resolveWallClock(value, timeZone);
}

export function formatMeetingTime(iso, timeZone, options = {}) {
  if (!iso) return 'Time unavailable';
  const { locale, ...formatOptions } = options;
  try {
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone, ...formatOptions }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString(locale || undefined);
  }
}

export function isoToLocalDateTime(iso, timeZone) {
  if (!iso) return '';
  const parts = partsForTimeZone(new Date(iso), timeZone || 'UTC');
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;
}

/**
 * Preserve an existing instant when an edit leaves its ambiguous wall-clock
 * value untouched. This matters during the repeated hour at DST fall-back,
 * where a datetime-local input cannot represent which occurrence was meant.
 */
export function localDateTimeToIsoPreservingInstant(originalIso, nextWallClock, nextTimeZone, originalTimeZone) {
  if (!nextWallClock) return null;
  if (!originalIso) return localDateTimeToIso(nextWallClock, nextTimeZone);
  const zoneToUse = nextTimeZone || originalTimeZone;
  if (originalTimeZone && nextTimeZone && originalTimeZone !== nextTimeZone) {
    return localDateTimeToIso(nextWallClock, nextTimeZone);
  }
  const originalWallClock = isoToLocalDateTime(originalIso, zoneToUse);
  if (originalWallClock === nextWallClock) return originalIso;
  return localDateTimeToIso(nextWallClock, zoneToUse);
}
