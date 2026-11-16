"use client";

import { Button } from "@pintopets/ui/components/button";
import { Card, CardContent } from "@pintopets/ui/components/card";
import { Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStepUp } from "./step-up";

const CONFIRM_WORD = "DELETE";

/**
 * Type DELETE, confirm with an authenticator code (step-up), then
 * DELETE /api/v1/me. The server clears the session; we go home signed out.
 */
export function DeleteAccountForm() {
  const router = useRouter();
  const { withStepUp, dialog, pending } = useStepUp();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmed = typed.trim() === CONFIRM_WORD;

  async function remove() {
    setError(null);
    setBusy(true);
    const r = await withStepUp(async () => {
      const res = await fetch("/api/v1/me", { method: "DELETE" });
      if (res.ok) return { ok: true };
      const body = (await res.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;
      return { ok: false, code: body?.error?.code, message: body?.error?.message };
    });
    if (r.ok) {
      // The session cookie is gone: re-render home (and the layout) signed out.
      router.replace("/");
      router.refresh();
      return;
    }
    setBusy(false);
    if (r.message && r.message !== "Cancelled") setError(r.message);
  }

  return (
    <Card className="border-destructive">
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (confirmed) void remove();
          }}
        >
          {error ? (
            <p role="alert" className="text-destructive text-sm font-semibold">
              {error}
            </p>
          ) : null}
          <Field
            id="confirm-delete"
            label={`Type ${CONFIRM_WORD} to confirm`}
            hint="You'll then be asked for a code from your authenticator app."
          >
            <Input
              id="confirm-delete"
              name="confirm"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.currentTarget.value)}
              aria-describedby="confirm-delete-hint"
            />
          </Field>
          <div>
            <Button type="submit" variant="urgent" disabled={!confirmed || busy || pending}>
              <Trash2 aria-hidden />
              {busy ? "Deleting…" : "Delete my account and data"}
            </Button>
          </div>
        </form>
      </CardContent>
      {dialog}
    </Card>
  );
}
