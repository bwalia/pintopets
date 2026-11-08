import { FORUM_CATEGORIES, type ForumCategorySlug } from "@pintopets/api-contract";

export const categoryName = (slug: ForumCategorySlug) =>
  FORUM_CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

export const isHealthCategory = (slug: ForumCategorySlug) =>
  FORUM_CATEGORIES.find((c) => c.slug === slug)?.health ?? false;
