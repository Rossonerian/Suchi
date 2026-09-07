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

function wallClockParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw new Error('Enter a valid date and time.');
  const [, year, month, day, hour, minute, second = '00'] = match;
  return { year, month, day, hour, minute, second };
}

function wallClockAsUtc(parts) {
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
}

function sameWallClock(parts, expected) {
  // Some Intl implementations represent midnight as 24:xx. Treat it as the
  // start of that displayed day for a stable comparison.
  return parts.year === expected.year && parts.month === expected.month && parts.day === expected.day && (parts.hour === expected.hour || (expected.hour === '00' && parts.hour === '24')) && parts.minute === expected.minute && parts.second === expected.second;
}

function resolveWallClock(value, timeZone) {
  const expected = wallClockParts(value);
  const wallClock = wallClockAsUtc(expected);
  // A local time can be ambiguous during a fall-back transition. Seed from
  // both sides of the transition and choose the earlier valid instant. A
  // spring-forward time has no valid candidate and is rejected below.
  const seeds = [wallClock, wallClock - 86_400_000, wallClock + 86_400_000, wallClock - 3_600_000, wallClock + 3_600_000];
  const candidates = new Set();

  for (const seed of seeds) {
    let candidate = seed;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const displayed = partsForTimeZone(new Date(candidate), timeZone);
      const displayedAsUtc = wallClockAsUtc({ ...displayed, hour: displayed.hour === '24' ? '00' : displayed.hour });
      const next = candidate + (wallClock - displayedAsUtc);
      if (next === candidate) break;
      candidate = next;
    }
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
