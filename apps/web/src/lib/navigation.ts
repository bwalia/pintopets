/**
 * Main navigation (section 8). Which items a user sees depends on their roles.
 * Auth arrives in M2; until then everyone is treated as an owner.
 */
export type AppRole = "owner" | "professional" | "moderator" | "admin";

export type NavKey =
  | "home"
  | "pets"
  | "ask"
  | "community"
  | "reminders"
  | "account"
  | "reviewQueue"
  | "knowledgeBase"
  | "moderation"
  | "admin";

export interface NavItem {
  key: NavKey;
  href: "/" | `/${string}`;
  /** Roles that can see this item. Empty means everyone. */
  roles: readonly AppRole[];
  /** Shown in the bottom tab bar on phones (keep to 5 or fewer). */
  mobileTab: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "home", href: "/", roles: [], mobileTab: true },
  { key: "pets", href: "/pets", roles: [], mobileTab: true },
  { key: "ask", href: "/ask", roles: [], mobileTab: true },
  { key: "community", href: "/community", roles: [], mobileTab: true },
  { key: "reminders", href: "/reminders", roles: [], mobileTab: true },
  { key: "account", href: "/account", roles: [], mobileTab: false },
  {
    key: "reviewQueue",
    href: "/pro/review-queue",
    roles: ["professional", "admin"],
    mobileTab: false,
  },
  {
    key: "knowledgeBase",
    href: "/pro/knowledge-base",
    roles: ["professional", "admin"],
    mobileTab: false,
  },
  { key: "moderation", href: "/moderation", roles: ["moderator", "admin"], mobileTab: false },
  { key: "admin", href: "/admin", roles: ["admin"], mobileTab: false },
];

export function navItemsFor(roles: readonly AppRole[]): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.some((r) => roles.includes(r)),
  );
}

/** True when `pathname` is this item's page or a page below it. */
export function isActive(item: Pick<NavItem, "href">, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
