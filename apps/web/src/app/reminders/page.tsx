import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("reminders") };
}

export default async function RemindersPage() {
  const [nav, t] = await Promise.all([getTranslations("nav"), getTranslations("placeholder")]);
  return <ComingSoon title={nav("reminders")} body={t("reminders")} />;
}
