/**
 * Display formatting (en-GB). Pure functions, unit-tested.
 */
const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/** "2026-11-03" → "3 Nov 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return DATE.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** Age from date of birth: "8 months", "3 years 2 months", "2 weeks". */
export function formatAge(dobIso: string | null, todayIso: string): string | null {
  if (!dobIso) return null;
  const [by, bm, bd] = dobIso.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = todayIso.split("-").map(Number) as [number, number, number];
  let months = (ty - by) * 12 + (tm - bm);
  if (td < bd) months -= 1;
  if (months < 0) return null;
  if (months === 0) {
    const days = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(by, bm - 1, bd)) / 86_400_000);
    const weeks = Math.floor(days / 7);
    if (weeks >= 1) return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  if (months < 24) return `${months} ${months === 1 ? "month" : "months"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} years ${rest} ${rest === 1 ? "month" : "months"}` : `${years} years`;
}

/** 850 → "850 g"; 25500 → "25.5 kg"; 600000 → "600 kg". */
export function formatWeight(grams: number): string {
  if (grams < 1000) return `${grams} g`;
  const kg = grams / 1000;
  const digits = kg >= 100 ? 0 : kg >= 10 ? 1 : 2;
  return `${Number(kg.toFixed(digits))} kg`;
}

/** Horse height: 62 inches → "15.2 hh". */
export function formatHands(inches: number | null): string | null {
  if (!inches) return null;
  return `${Math.floor(inches / 4)}.${inches % 4} hh`;
}

/** "15.2" or "15" → 62 / 60 inches; null if not valid hands notation. */
export function parseHands(value: string): number | null {
  const m = /^\s*(\d{1,2})(?:\.([0-3]))?\s*(?:hh)?\s*$/i.exec(value);
  if (!m) return null;
  return Number(m[1]) * 4 + Number(m[2] ?? 0);
}

/** "12.50" → 1250 pence; null if blank or invalid. */
export function parsePounds(value: string): number | null {
  const m = /^\s*£?\s*(\d{1,7})(?:\.(\d{1,2}))?\s*$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

export function formatPounds(pence: number | null | undefined): string | null {
  if (pence === null || pence === undefined) return null;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

/** Weight input in kg or g → grams. */
export function toGrams(value: string, unit: "kg" | "g"): number | null {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(unit === "kg" ? n * 1000 : n);
}

export function relativeDays(daysUntil: number): string {
  if (daysUntil === 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  if (daysUntil === -1) return "yesterday";
  return daysUntil > 0 ? `in ${daysUntil} days` : `${-daysUntil} days ago`;
}
