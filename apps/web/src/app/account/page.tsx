import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("account") };
}

export default async function AccountPage() {
  const [nav, t] = await Promise.all([getTranslations("nav"), getTranslations("placeholder")]);
  return <ComingSoon title={nav("account")} body={t("account")} />;
}
