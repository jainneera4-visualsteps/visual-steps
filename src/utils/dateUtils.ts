
/**
 * Gets the current date/time adjusted to a specific timezone.
 * Returns an object with the local numerical components.
 */
export function getZonedTime(timezone?: string, date: Date = new Date()) {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';

    return {
      year: parseInt(getPart('year'), 10),
      month: parseInt(getPart('month'), 10),
      day: parseInt(getPart('day'), 10),
      hour: parseInt(getPart('hour'), 10),
      minute: parseInt(getPart('minute'), 10),
      second: parseInt(getPart('second'), 10),
      isoDate: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
      isoDateTime: `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}`,
      totalMinutes: parseInt(getPart('hour'), 10) * 60 + parseInt(getPart('minute'), 10)
    };
  } catch (e) {
    console.error('Error in getZonedTime:', e);
    // Fallback to local time
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      isoDate: date.toISOString().split('T')[0],
      isoDateTime: date.toISOString(),
      totalMinutes: date.getHours() * 60 + date.getMinutes()
    };
  }
}

/**
 * Formats a date using a specific timezone.
 */
export function formatInTimezone(date: Date | string | number, timezone?: string, options: Intl.DateTimeFormatOptions = {}) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      ...options,
      timeZone: tz
    }).format(d);
    return formatted.replace(/\b(\d{1,2}) ([A-Za-z]{3}) (\d{4})\b/, '$1 $2, $3');
  } catch (e) {
    console.error('Error in formatInTimezone:', e);
    const formatted = new Intl.DateTimeFormat('en-GB', options).format(d);
    return formatted.replace(/\b(\d{1,2}) ([A-Za-z]{3}) (\d{4})\b/, '$1 $2, $3');
  }
}

/** Formats every user-facing date consistently as `24 Aug, 2026`. */
export function formatAppDate(date: Date | string | number, timezone?: string) {
  return formatInTimezone(date, timezone, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Adds a time while preserving the shared user-facing date convention. */
export function formatAppDateTime(date: Date | string | number, timezone?: string) {
  return formatInTimezone(date, timezone, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Helper function to convert a UTC date to the kid's timezone date string for saving.
 */
export function convertDateToTimeZone(dateString: string | Date, timezone: string): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';
  
  // Format the date in the target timezone
  // This produces a local-like date representation for that timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  // Return in a standard format (e.g., YYYY-MM-DD HH:MM:SS)
  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}
