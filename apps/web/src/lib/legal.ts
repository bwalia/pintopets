/**
 * Who is responsible for PintoPets and how to reach them. Used by /privacy,
 * /terms and /support (and by the App Store listing's privacy/support URLs).
 */
// CONFIRM before launch: controller name and contact email with the owner.
export const LEGAL = {
  /** Data controller (UK GDPR) and operator of the service. */
  controllerName: "Balinder Walia",
  /** Support, privacy and data-protection requests. */
  contactEmail: "support@workstation.co.uk",
} as const;

/** Shown as "Last updated" on the policy pages. Change it whenever they change. */
export const POLICIES_UPDATED = "2026-11-26";

export function formatPolicyDate(iso: string = POLICIES_UPDATED): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  });
}
