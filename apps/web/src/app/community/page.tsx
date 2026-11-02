import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("community") };
}

export default async function CommunityPage() {
  const [nav, t] = await Promise.all([getTranslations("nav"), getTranslations("placeholder")]);
  return <ComingSoon title={nav("community")} body={t("community")} />;
}
