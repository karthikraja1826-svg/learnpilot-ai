const formatterCache = new Map();

export const isValidTimezone = (timeZone) => {
  if (typeof timeZone !== 'string' || timeZone.trim().length === 0) {
    return false;
  }
  try {
    Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch (err) {
    return false;
  }
};

export const resolveTimezone = (timeZone) => (isValidTimezone(timeZone) ? timeZone : 'UTC');

const getFormatter = (timeZone) => {
  const zone = resolveTimezone(timeZone);
  if (!formatterCache.has(zone)) {
    formatterCache.set(
      zone,
      new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    );
  }
  return formatterCache.get(zone);
};

export const getLocalDateKey = (date, timeZone) => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const lookup = {};
  parts.forEach((part) => {
    lookup[part.type] = part.value;
  });
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
};

export const startOfLocalDay = (date, timeZone) => new Date(`${getLocalDateKey(date, timeZone)}T00:00:00.000Z`);

export const startOfCalendarDay = (date) => {
  const instant = new Date(date);
  return new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()));
};

export const addCalendarDays = (date, days) => {
  const base = startOfCalendarDay(date);
  base.setUTCDate(base.getUTCDate() + days);
  return base;
};

export const toDateKey = (date) => startOfCalendarDay(date).toISOString().slice(0, 10);

export const getCalendarWeekday = (date) => startOfCalendarDay(date).getUTCDay();

const isExactUTCMidnight = (date) =>
  date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;

export const resolveLocalCalendarDate = (date, timeZone) => {
  const instant = new Date(date);
  if (isExactUTCMidnight(instant)) {
    return startOfCalendarDay(instant);
  }
  return startOfLocalDay(instant, timeZone);
};

export const localDateTimeToUTC = (date, timeStr, timeZone) => {
  const dateKey = toDateKey(date);
  const zone = resolveTimezone(timeZone);
  const naiveUTC = new Date(`${dateKey}T${timeStr}:00.000Z`);
  const zonedAsUTC = new Date(naiveUTC.toLocaleString('en-US', { timeZone: zone }));
  const offset = naiveUTC.getTime() - zonedAsUTC.getTime();
  return new Date(naiveUTC.getTime() + offset);
};
