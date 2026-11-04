import { PetInput } from "@pintopets/api-contract";
import { Secret, TOTP } from "otpauth";
import { describe, expect, it } from "vitest";
import { HttpError } from "../http";
import { getRow, listPage } from "../opsapi/client";
import { createRecord, listRecords } from "../pets/records";
import { createPet, deletePet } from "../pets/service";
import {
  codeRequiredAtSignIn,
  confirmEnrolment,
  disableTotp,
  MAX_ATTEMPTS,
  securityStatus,
  startEnrolment,
  updatePreferences,
  verifySecondFactor,
} from "./service";

const hasOpsApi = Boolean(
  process.env.OPSAPI_API_KEY && process.env.OPSAPI_URL && process.env.TOTP_ENCRYPTION_KEY,
);
const code = (secret: string) => new TOTP({ secret: Secret.fromBase32(secret) }).generate();
const user = () => ({ id: crypto.randomUUID(), email: "owner@test.pintopets.app" });

async function expectCode(promise: Promise<unknown>, c: string) {
  await expect(promise).rejects.toSatisfy((e: unknown) => e instanceof HttpError && e.code === c);
}

describe.skipIf(!hasOpsApi)("two-factor sign-in on OpsAPI (integration)", () => {
  it("enrols with a real authenticator code; the secret is stored encrypted", async () => {
    const u = user();
    expect((await securityStatus(u)).totpEnabled).toBe(false);
    const { secret, uri } = await startEnrolment(u);
    expect(uri).toContain("issuer=PintoPets");

    await expectCode(confirmEnrolment(u, "000000"), "validation_failed");
    const recovery = await confirmEnrolment(u, code(secret));
    expect(recovery).toHaveLength(10);
    expect((await securityStatus(u)).totpEnabled).toBe(true);

    const [row] = await listPage("account-settings", { user_uuid: u.id, per_page: 1 });
    expect(String(row?.totp_secret_enc)).toMatch(/^v1\./);
    expect(String(row?.totp_secret_enc)).not.toContain(secret);
    expect(JSON.stringify(row?.recovery_codes)).not.toContain(recovery[0]);
  });

  it("accepts a TOTP code; a recovery code works exactly once", async () => {
    const u = user();
    const { secret } = await startEnrolment(u);
    const [first] = await confirmEnrolment(u, code(secret));
    await verifySecondFactor(u, code(secret));
    await verifySecondFactor(u, first ?? "");
    expect((await securityStatus(u)).recoveryCodesLeft).toBe(9);
    await expectCode(verifySecondFactor(u, first ?? ""), "validation_failed");
  });

  it(`locks checks for 15 minutes after ${MAX_ATTEMPTS} wrong codes`, async () => {
    const u = user();
    const { secret } = await startEnrolment(u);
    await confirmEnrolment(u, code(secret));
    for (let i = 1; i < MAX_ATTEMPTS; i++)
      await expectCode(verifySecondFactor(u, "111111"), "validation_failed");
    await expectCode(verifySecondFactor(u, "111111"), "rate_limited");
    // Even the right code is refused while locked.
    await expectCode(verifySecondFactor(u, code(secret)), "rate_limited");
    expect((await securityStatus(u)).lockedUntil).not.toBeNull();
  });

  it("step-up needs 2FA turned on first", async () => {
    await expectCode(verifySecondFactor(user(), "123456"), "forbidden");
  });

  it("code at sign-in only when turned on, and only with 2FA", async () => {
    const u = user();
    await expectCode(updatePreferences(u, { requireCodeAtSignIn: true }), "forbidden");
    const { secret } = await startEnrolment(u);
    await confirmEnrolment(u, code(secret));
    expect(await codeRequiredAtSignIn(u.id)).toBe(false);
    await updatePreferences(u, { requireCodeAtSignIn: true, consentAiLearning: true });
    expect(await codeRequiredAtSignIn(u.id)).toBe(true);
    expect((await securityStatus(u)).consentAiLearning).toBe(true);

    await disableTotp(u);
    expect(await codeRequiredAtSignIn(u.id)).toBe(false);
    const [row] = await listPage("account-settings", { user_uuid: u.id, per_page: 1 });
    // OpsAPI omits null columns from JSON: missing or null both mean "gone".
    expect(row?.totp_secret_enc ?? null).toBeNull();
  });

  it("deleting a pet removes it and every record (owner only)", async () => {
    const owner = user();
    const other = user();
    const pet = await createPet(owner, PetInput.parse({ name: "Gone", speciesSlug: "cat" }));
    await createRecord(owner, pet.id, "weights", { measuredOn: "2026-11-01", weightGrams: 4000 });
    await expectCode(deletePet(other, pet.id), "not_found");
    await deletePet(owner, pet.id);
    expect(await getRow("pets", pet.id)).toBeNull();
    await expectCode(listRecords(owner, pet.id, "weights"), "not_found");
  });
});
