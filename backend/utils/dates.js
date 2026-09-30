function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function dateParts(dateText) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || "");
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function timeParts(timeText = "00:00") {
  const match = /^(\d{2}):(\d{2})$/.exec(timeText);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function partsAt(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

function localDateTimeToUtc(dateText, timeText, timeZone) {
  if (!isValidTimeZone(timeZone)) return null;
  const date = dateParts(dateText);
  const time = timeParts(timeText);
  if (!date || !time) return null;

  const target = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute);
  let timestamp = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = partsAt(new Date(timestamp), timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    const difference = target - actualAsUtc;
    timestamp += difference;
    if (difference === 0) break;
  }

  const result = new Date(timestamp);
  const actual = partsAt(result, timeZone);
  if (actual.year !== date.year || actual.month !== date.month || actual.day !== date.day || actual.hour !== time.hour || actual.minute !== time.minute) return null;
  return result;
}

function parseTransactionDate(dateValue, timeValue, timeZone) {
  if (typeof dateValue !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return localDateTimeToUtc(dateValue, timeValue || "00:00", timeZone);
  }
  if (timeValue) return null;
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localDateKey(date, timeZone) {
  const parts = partsAt(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function localDateAtMidnight(dateText, timeZone) {
  return localDateTimeToUtc(dateText, "00:00", timeZone);
}

function localDateAtEndOfDay(dateText, timeZone) {
  const nextDay = dateParts(dateText);
  if (!nextDay) return null;
  const next = new Date(Date.UTC(nextDay.year, nextDay.month - 1, nextDay.day + 1));
  const nextText = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  const nextMidnight = localDateAtMidnight(nextText, timeZone);
  return nextMidnight ? new Date(nextMidnight.getTime() - 1) : null;
}

function addCalendarDays(dateText, amount) {
  const parts = dateParts(dateText);
  if (!parts) return null;
  const result = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}

function currentMonth(timeZone) {
  const parts = partsAt(new Date(), timeZone);
  return { month: parts.month, year: parts.year };
}

module.exports = {
  addCalendarDays,
  currentMonth,
  dateParts,
  isValidTimeZone,
  localDateAtEndOfDay,
  localDateAtMidnight,
  localDateKey,
  localDateTimeToUtc,
  parseTransactionDate,
};
