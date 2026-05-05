export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export const DAY_LABELS_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export const SLOTS = [
  { key: "am_snack", label: "AM Snack" },
  { key: "lunch", label: "Lunch" },
  { key: "pm_snack", label: "PM Snack" },
] as const;

export type SlotKey = (typeof SLOTS)[number]["key"];

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function toIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Snap any Date or YYYY-MM-DD string to the Monday of its week (UTC, ISO 8601). */
export function snapToMonday(input: Date | string): string {
  const date = typeof input === "string" ? parseIsoDate(input) : new Date(input);
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = utc.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return toIsoDate(utc);
}

export function todayMondayIso(): string {
  return snapToMonday(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

export function previousMonday(iso: string): string {
  return addDays(iso, -7);
}

export function nextMonday(iso: string): string {
  return addDays(iso, 7);
}

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_SHORT = MONTH_LONG.map((m) => m.slice(0, 3));

export function formatLong(iso: string): string {
  const d = parseIsoDate(iso);
  return `${MONTH_LONG[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatShort(iso: string): string {
  const d = parseIsoDate(iso);
  return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatWeekRange(weekStartIso: string): string {
  const friday = addDays(weekStartIso, 4);
  const start = parseIsoDate(weekStartIso);
  const end = parseIsoDate(friday);
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${MONTH_LONG[start.getUTCMonth()]} ${start.getUTCDate()}-${end.getUTCDate()}, ${start.getUTCFullYear()}`;
  }
  return `${formatShort(weekStartIso)} - ${formatShort(friday)}, ${start.getUTCFullYear()}`;
}
