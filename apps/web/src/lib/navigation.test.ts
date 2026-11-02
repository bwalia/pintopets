import { describe, expect, it } from "vitest";
import { isActive, NAV_ITEMS, navItemsFor } from "./navigation";

const keys = (roles: Parameters<typeof navItemsFor>[0]) => navItemsFor(roles).map((i) => i.key);

describe("navItemsFor", () => {
  it("owners see the six main sections only", () => {
    expect(keys(["owner"])).toEqual(["home", "pets", "ask", "community", "reminders", "account"]);
  });

  it("professionals also see Review Queue and Knowledge Base", () => {
    expect(keys(["owner", "professional"])).toEqual(
      expect.arrayContaining(["reviewQueue", "knowledgeBase"]),
    );
    expect(keys(["owner", "professional"])).not.toContain("admin");
  });

  it("moderators see moderation but not admin", () => {
    expect(keys(["owner", "moderator"])).toContain("moderation");
    expect(keys(["owner", "moderator"])).not.toContain("admin");
  });

  it("admins see everything", () => {
    expect(keys(["admin"])).toHaveLength(NAV_ITEMS.length);
  });

  it("keeps the phone tab bar to five items or fewer", () => {
    expect(NAV_ITEMS.filter((i) => i.mobileTab).length).toBeLessThanOrEqual(5);
  });
});

describe("isActive", () => {
  it("matches home exactly", () => {
    expect(isActive({ href: "/" }, "/")).toBe(true);
    expect(isActive({ href: "/" }, "/pets")).toBe(false);
  });

  it("matches sub-pages but not look-alike paths", () => {
    expect(isActive({ href: "/pets" }, "/pets/123")).toBe(true);
    expect(isActive({ href: "/pets" }, "/petsitters")).toBe(false);
  });
});
