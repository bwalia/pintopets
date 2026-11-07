/**
 * Community safety rules. Pure functions (unit-tested); the service applies them.
 *
 * Why these rules: a public pet forum attracts scam sellers ("puppy for sale,
 * message me"), link spam and people over-sharing personal details. We keep
 * people's contact details off the page, cap links, slow down floods, and let
 * the community hide anything harmful until a moderator looks.
 */

/** Per-person limits, counted from the database so they hold across servers. */
export const RATE_LIMITS = {
  /** New threads per hour. */
  threadsPerHour: 5,
  /** Replies per hour. */
  repliesPerHour: 40,
  /** Helpful votes per hour. */
  votesPerHour: 200,
  /** Reports per day. */
  reportsPerDay: 30,
} as const;

/** Distinct people reporting a post before it is hidden pending review. */
export const AUTO_HIDE_REPORTS = 3;
/** Links allowed in one post. */
export const MAX_LINKS = 3;

export type Activity = { threads: number; replies: number; votes: number; reports: number };

export type RuleViolation = { field: "title" | "body"; message: string };

/** Removes invisible/control characters and trims runs of blank lines. */
export function cleanText(input: string): string {
  return (
    input
      .normalize("NFC")
      // zero-width, bidi overrides and other control characters (keep \n and \t)
      .replace(
        // eslint-disable-next-line no-control-regex -- stripping control characters is the point
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,
        "",
      )
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

const URL_RE = /\bhttps?:\/\/[^\s<>()]+|\bwww\.[^\s<>()]+/gi;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// UK and international phone numbers: 10+ digits allowing spaces, dashes, brackets, leading +.
const PHONE_RE = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?){2,4}\d{3,4}/g;
const SHORTENERS = /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|cutt\.ly|rb\.gy)\//i;

export function countLinks(text: string): number {
  return text.match(URL_RE)?.length ?? 0;
}

function hasPhoneNumber(text: string): boolean {
  return (text.match(PHONE_RE) ?? []).some((m) => m.replace(/\D/g, "").length >= 10);
}

function mostlyCapitals(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 25) return false;
  return letters.replace(/[^A-Z]/g, "").length / letters.length > 0.7;
}

/** Checks a title/body against the community rules. Empty array = fine. */
export function checkContent(post: { title?: string; body: string }): RuleViolation[] {
  const out: RuleViolation[] = [];
  const all = `${post.title ?? ""}\n${post.body}`;
  if (EMAIL_RE.test(all)) {
    out.push({
      field: post.title && EMAIL_RE.test(post.title) ? "title" : "body",
      message:
        "For your safety, please don't share email addresses publicly. People can find you through PintoPets.",
    });
  }
  if (hasPhoneNumber(all)) {
    out.push({
      field: post.title && hasPhoneNumber(post.title) ? "title" : "body",
      message: "For your safety, please don't share phone numbers publicly.",
    });
  }
  if (countLinks(post.title ?? "") > 0) {
    out.push({ field: "title", message: "Please put links in the message, not the title." });
  }
  if (countLinks(post.body) > MAX_LINKS) {
    out.push({ field: "body", message: `Please include no more than ${MAX_LINKS} links.` });
  }
  if (SHORTENERS.test(all)) {
    out.push({
      field: "body",
      message:
        "Please use the full link rather than a link shortener, so people can see where it goes.",
    });
  }
  if (post.title && mostlyCapitals(post.title)) {
    out.push({ field: "title", message: "Please don't write the title in capital letters." });
  } else if (mostlyCapitals(post.body)) {
    out.push({ field: "body", message: "Please don't write in capital letters." });
  }
  if (/(.)\1{14,}/u.test(all)) {
    out.push({
      field: "body",
      message: "That looks like repeated characters. Please check your message.",
    });
  }
  return out;
}

/** Text compared for duplicate detection: case, spacing and punctuation ignored. */
export function fingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function isDuplicate(body: string, recentBodies: readonly string[]): boolean {
  const f = fingerprint(body);
  return f.length > 0 && recentBodies.some((b) => fingerprint(b) === f);
}

export type LimitKind = "thread" | "reply" | "vote" | "report";

/** The message to show when `kind` is over its limit, or null when it's allowed. */
export function overLimit(kind: LimitKind, hour: Activity, day: Activity): string | null {
  switch (kind) {
    case "thread":
      return hour.threads >= RATE_LIMITS.threadsPerHour
        ? "You've started a lot of discussions in the last hour. Please try again a little later."
        : null;
    case "reply":
      return hour.replies >= RATE_LIMITS.repliesPerHour
        ? "You're replying very quickly. Please take a short break and try again."
        : null;
    case "vote":
      return hour.votes >= RATE_LIMITS.votesPerHour
        ? "You've voted a lot in the last hour. Please try again later."
        : null;
    case "report":
      return day.reports >= RATE_LIMITS.reportsPerDay
        ? "Thank you for helping. You've reached today's report limit; our moderators are looking."
        : null;
  }
}

/** Names nobody may pick: they would look official. */
const RESERVED =
  /\b(?:admin|administrator|moderator|mod|pintopets|staff|support|official|vet|veterinary|rcvs)\b/i;

export function checkDisplayName(name: string): string | null {
  if (RESERVED.test(name.replace(/[._-]/g, " ")))
    return "That name could look official. Please choose another.";
  if (EMAIL_RE.test(name) || /\d{6,}/.test(name))
    return "Please don't use contact details in your name.";
  return null;
}

/** A starting community name: first name from the account, else "Pet lover 1234". */
export function suggestDisplayName(accountName: string, userId: string): string {
  const first = accountName.includes("@") ? "" : (accountName.trim().split(/\s+/)[0] ?? "");
  const suffix = parseInt(userId.replace(/-/g, "").slice(-4), 16) % 10_000;
  const base =
    first && /^[\p{L}][\p{L}'-]{1,20}$/u.test(first) && !checkDisplayName(first)
      ? first
      : "Pet lover";
  return `${base} ${String(suffix).padStart(4, "0")}`;
}

/** Suspension lengths moderators can choose, in days (0 = lift). */
export const SUSPENSION_DAYS = [1, 7, 30, 365] as const;

export function isSuspended(until: string | null | undefined, now = new Date()): boolean {
  return Boolean(until && new Date(until) > now);
}

/** Splits text into plain-text and link parts for safe rendering (no HTML). */
export function linkify(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[0].replace(/[.,;:!?'"]+$/, "");
    const start = m.index;
    if (start > last) parts.push({ text: text.slice(last, start) });
    const href = raw.startsWith("www.") ? `https://${raw}` : raw;
    try {
      const u = new URL(href);
      if (u.protocol === "https:" || u.protocol === "http:")
        parts.push({ text: raw, href: u.href });
      else parts.push({ text: raw });
    } catch {
      parts.push({ text: raw });
    }
    last = start + raw.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
