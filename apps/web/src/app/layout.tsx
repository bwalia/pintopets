import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

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
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${figtree.variable} ${fraunces.variable}`}>
      <body>
        <NextIntlClientProvider>
          {/* Roles come from the session once auth lands (M2). */}
          <AppShell roles={["owner"]}>{children}</AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
