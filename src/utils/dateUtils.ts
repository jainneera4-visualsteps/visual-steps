
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
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: tz
    }).format(d);
  } catch (e) {
    console.error('Error in formatInTimezone:', e);
    return d.toLocaleString();
  }
}
