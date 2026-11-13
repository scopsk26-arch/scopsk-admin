/** Platform clock. Dubai is UTC+4 and does not use daylight saving. */
export const DUBAI_TIME_ZONE = "Asia/Dubai";

export function formatDubaiDateTime(value?: string | Date | null, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DUBAI_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** Calendar day in Dubai. A date-only string is kept as that day. */
export function formatDubaiDate(value?: string | Date | null, fallback = ""): string {
  if (value == null || value === "") return fallback;
  const raw = value instanceof Date ? "" : String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DUBAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
