"use client";

import { cn } from "@pintopets/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/health", label: "Health" },
  { href: "/weight", label: "Weight" },
  { href: "/diet", label: "Diet" },
  { href: "/photos", label: "Photos" },
  { href: "/profile", label: "Profile" },
] as const;

export function PetTabs({ petId }: { petId: string }) {
  const pathname = usePathname();
  const base = `/pets/${petId}`;
  return (
    <nav
      aria-label="Pet sections"
      className="-mx-4 overflow-x-auto border-b px-4 md:mx-0 md:px-0 print:hidden"
    >
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const href = `${base}${t.href}`;
          const active = t.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <li key={t.label}>
              <Link
                href={href as Route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap",
                  active
                    ? "border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
