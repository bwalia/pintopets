import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeSession, signToken } from "../session";

const SECRET = "s".repeat(40);
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));
vi.mock("@/env", () => ({
  env: () => ({ SESSION_SECRET: SECRET, APP_URL: "https://pets.example" }),
}));
vi.mock("./service", () => ({ verifySecondFactor: vi.fn() }));

const { requireDeletionConfirmation, signedInRecently } = await import("./step-up");
const { sealReauth } = await import("../account/reauth");

const me = { id: "11111111-1111-4111-8111-111111111111" };
const minutesAgo = (m: number) => Date.now() - m * 60_000;
/** A deliberate fresh sign-in to delete the account (what /auth/callback keeps). */
function reSignIn(at: number, sub = me.id) {
  jar.set("pp_reauth", sealReauth(sub, "opsapi-jwt", SECRET, at));
}
function stepUp() {
  jar.set(
    "pp_stepup",
    signToken({ sub: me.id, exp: Math.floor(Date.now() / 1000) + 300 }, SECRET, "step-up"),
  );
}
const code = (p: Promise<unknown>) =>
  p.then(
    (v) => (typeof v === "string" ? `ok:${v}` : "ok"),
    (e: { code?: string; details?: { reason?: string } }) => e.details?.reason ?? e.code,
  );

describe("deleting an account: confirming it's them", () => {
  beforeEach(() => jar.clear());

  it("without 2FA, a fresh sign-in in the last 10 minutes is enough and yields the OpsAPI token", async () => {
    reSignIn(minutesAgo(3));
    expect(await signedInRecently(me)).toBe(true);
    expect(await code(requireDeletionConfirmation(me, false))).toBe("ok:opsapi-jwt");
  });

  it("an older fresh sign-in must be repeated", async () => {
    reSignIn(minutesAgo(11));
    expect(await signedInRecently(me)).toBe(false);
    expect(await code(requireDeletionConfirmation(me, false))).toBe("recent_sign_in_required");
  });

  it("an ordinary (even recent) session doesn't count: OpsAPI needs the token", async () => {
    jar.set("pp_session", encodeSession({ sub: me.id, email: "a@b.c", name: "A" }, SECRET));
    expect(await code(requireDeletionConfirmation(me, false))).toBe("recent_sign_in_required");
  });

  it("someone else's fresh sign-in never counts", async () => {
    reSignIn(minutesAgo(1), "22222222-2222-4222-8222-222222222222");
    expect(await code(requireDeletionConfirmation(me, false))).toBe("recent_sign_in_required");
  });

  it("app bearer callers (no cookies) are sent to the website", async () => {
    expect(await code(requireDeletionConfirmation(me, false))).toBe("recent_sign_in_required");
  });

  it("with 2FA on, a fresh sign-in is not enough: it needs a code too", async () => {
    reSignIn(minutesAgo(1));
    expect(await code(requireDeletionConfirmation(me, true))).toBe("step_up_required");
    stepUp();
    expect(await code(requireDeletionConfirmation(me, true))).toBe("ok:opsapi-jwt");
  });

  it("with 2FA on, a code alone is not enough: sign in again first", async () => {
    stepUp();
    expect(await code(requireDeletionConfirmation(me, true))).toBe("recent_sign_in_required");
  });
});
