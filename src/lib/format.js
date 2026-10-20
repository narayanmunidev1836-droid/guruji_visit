// Display + parsing helpers for dates and sizes. All dates are handled in UTC on purpose:
// Visit dates are DATE columns and EXIF times are stored as the camera's wall-clock time (no time zone).

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const localDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function formatDate(value) {
  if (!value) return "-";
  return dateFormatter.format(new Date(value));
}

/** Wall-clock EXIF time (stored as UTC). */
export function formatExifDateTime(value) {
  if (!value) return "-";
  return dateTimeFormatter.format(new Date(value));
}

/** Real instants such as "last scan at" - shown in the server's local zone. */
export function formatInstant(value) {
  if (!value) return "-";
  return localDateTimeFormatter.format(new Date(value));
}

/** YYYY-MM-DD for <input type="date">. */
export function toDateInputValue(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

/** Parses YYYY-MM-DD into a UTC midnight Date. Returns null when empty and undefined when invalid. */
export function parseDateInput(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return undefined;
  return date;
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value ?? 0);
}

export function timeAgo(value, now = new Date()) {
  if (!value) return "never";
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
