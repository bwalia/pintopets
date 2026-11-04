"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import {
  confirmEnrolment,
  disableTotp,
  regenerateRecoveryCodes,
  startEnrolment,
  updatePreferences,
} from "@/server/security/service";
import { clearStepUp, grantStepUp, markStepUp, requireStepUp } from "@/server/security/step-up";
import { type ActionResult, runAction as run } from "@/server/actions";

const Code = z.string().trim().min(6).max(20);

export async function startTotpAction(): Promise<ActionResult<{ secret: string; qrSvg: string }>> {
  return run(async () => {
    const { secret, qrSvg } = await startEnrolment(await requireUser());
    return { secret, qrSvg };
  });
}

export async function confirmTotpAction(
  code: unknown,
): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  return run(async () => {
    const actor = await requireUser();
    const recoveryCodes = await confirmEnrolment(actor, Code.parse(code));
    // A correct first code proves possession: count it as a fresh step-up.
    await markStepUp(actor);
    revalidatePath("/account");
    return { recoveryCodes };
  });
}

export async function stepUpAction(code: unknown): Promise<ActionResult> {
  return run(async () => {
    await grantStepUp(await requireUser(), Code.parse(code));
    return undefined;
  });
}

export async function disableTotpAction(): Promise<ActionResult> {
  return run(async () => {
    const actor = await requireUser();
    await requireStepUp(actor);
    await disableTotp(actor);
    await clearStepUp();
    revalidatePath("/account");
    return undefined;
  });
}

export async function regenerateCodesAction(): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  return run(async () => {
    const actor = await requireUser();
    await requireStepUp(actor);
    return { recoveryCodes: await regenerateRecoveryCodes(actor) };
  });
}

const Prefs = z.object({
  requireCodeAtSignIn: z.boolean().optional(),
  consentAiLearning: z.boolean().optional(),
  consentMarketing: z.boolean().optional(),
});

export async function updatePreferencesAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const actor = await requireUser();
    const prefs = Prefs.parse(input);
    // Turning the sign-in check OFF weakens the account: needs a fresh code.
    if (prefs.requireCodeAtSignIn === false) await requireStepUp(actor);
    await updatePreferences(actor, prefs);
    revalidatePath("/account");
    return undefined;
  });
}
