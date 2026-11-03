import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { currentUser } from "@/server/auth";
import "./globals.css";

// Same typefaces as workstation.co.uk (self-hosted latin subsets, OFL licences in
// src/fonts/): Poppins for text and UI, Unbounded for h1/h2, JetBrains Mono for data.
// Self-hosting avoids build-time Google Fonts fetches (they break Turbopack builds).
const body = localFont({
  src: [
    { path: "../fonts/poppins-400-latin.woff2", weight: "400", style: "normal" },
    { path: "../fonts/poppins-500-latin.woff2", weight: "500", style: "normal" },
    { path: "../fonts/poppins-600-latin.woff2", weight: "600", style: "normal" },
    { path: "../fonts/poppins-700-latin.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--ws-font-body",
});
const display = localFont({
  src: "../fonts/unbounded-latin.woff2",
  weight: "500 700",
  display: "swap",
  variable: "--ws-font-display",
});
const mono = localFont({
  src: "../fonts/jetbrains-mono-latin.woff2",
  weight: "400 600",
  display: "swap",
  variable: "--ws-font-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
    applicationName: "PintoPets",
  };
}

export const viewport: Viewport = {
  themeColor: "#fbf9f4",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, user] = await Promise.all([getLocale(), currentUser()]);
  const roles = user
    ? user.role === "owner"
      ? ["owner" as const]
      : (["owner", user.role] as const)
    : (["owner"] as const);
  return (
    <html lang={locale} className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <NextIntlClientProvider>
          <AppShell roles={roles} demo={user?.demo ?? false}>
            {children}
          </AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
