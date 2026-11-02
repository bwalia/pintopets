"use client";

import { cn } from "@pintopets/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { type AppRole, isActive, navItemsFor } from "@/lib/navigation";
import { Logo } from "./logo";
import { NAV_ICONS } from "./nav-icons";

/**
 * Mobile-first layout: header + bottom tab bar on phones, sidebar on wider screens.
 */
// Role-gated pages (Review Queue, Admin…) are built in later milestones, so nav
// hrefs are plain strings rather than typed routes; the cast is only here.
export function AppShell({ roles, children }: { roles: readonly AppRole[]; children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const items = navItemsFor(roles);
  const tabs = items.filter((i) => i.mobileTab);
  const AccountIcon = NAV_ICONS.account;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-lg px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t("a11y.skipToContent")}
      </a>

      {/* Phone header */}
      <header className="bg-background/95 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur md:hidden">
        <Link href="/" className="rounded-lg">
          <Logo />
        </Link>
        <Link
          href="/account"
          aria-label={t("a11y.openAccount")}
          className="hover:bg-muted inline-flex size-11 items-center justify-center rounded-full"
        >
          <AccountIcon className="size-5" aria-hidden />
        </Link>
      </header>

      {/* Desktop sidebar */}
      <aside className="bg-card sticky top-0 hidden h-dvh flex-col gap-6 border-r p-4 md:flex">
        <Link href="/" className="rounded-lg px-2 py-1">
          <Logo />
        </Link>
        <nav aria-label={t("a11y.mainNav")}>
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const Icon = NAV_ICONS[item.key];
              const active = isActive(item, pathname);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href as Route}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors",
                      active
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {t(`nav.${item.key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <main id="main" tabIndex={-1} className="flex-1 px-4 pt-6 pb-28 md:px-10 md:pb-10">
          {children}
        </main>
        <footer className="text-muted-foreground hidden border-t px-10 py-6 text-sm md:block">
          <p>{t("footer.notVetAdvice")}</p>
          <p className="mt-1">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </footer>
      </div>

      {/* Phone tab bar */}
      <nav
        aria-label={t("a11y.mobileNav")}
        className="bg-card fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {tabs.map((item) => {
            const Icon = NAV_ICONS[item.key];
            const active = isActive(item, pathname);
            return (
              <li key={item.key}>
                <Link
                  href={item.href as Route}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
