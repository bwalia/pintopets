"use client";

import { Button } from "@pintopets/ui/components/button";
import { Dialog, DialogContent } from "@pintopets/ui/components/dialog";
import { Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import Link from "next/link";
import { type ReactNode, useCallback, useRef, useState, useTransition } from "react";
import { stepUpAction } from "@/app/account/actions";

type Result = { ok: boolean; code?: string; message?: string };

/**
 * Runs a sensitive action; if the server answers `step_up_required`, asks for
 * an authenticator code once, then retries. If 2FA isn't on yet, explains how.
 */
export function useStepUp() {
  const [open, setOpen] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const retry = useRef<(() => Promise<Result>) | null>(null);
  const done = useRef<((r: Result) => void) | null>(null);

  const withStepUp = useCallback(
    (action: () => Promise<Result>) =>
      new Promise<Result>((resolve) => {
        startTransition(async () => {
          const r = await action();
          if (r.ok || r.code !== "step_up_required") return resolve(r);
          retry.current = action;
          done.current = resolve;
          setError(null);
          setNeedsSetup(false);
          setOpen(true);
        });
      }),
    [],
  );

  function submit(code: string) {
    startTransition(async () => {
      const r = await stepUpAction(code);
      if (!r.ok) {
        if (r.code === "forbidden") setNeedsSetup(true);
        return setError(r.message);
      }
      setOpen(false);
      const again = retry.current ? await retry.current() : { ok: true };
      done.current?.(again);
    });
  }

  const dialog: ReactNode = (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) done.current?.({ ok: false, message: "Cancelled" });
        setOpen(o);
      }}
    >
      {open ? (
        <DialogContent
          title="Confirm it's you"
          description="Enter the 6-digit code from your authenticator app (or a recovery code)."
        >
          {needsSetup ? (
            <div className="flex flex-col gap-3 text-sm">
              <p>{error}</p>
              <Button asChild>
                <Link href="/account#security">Set up two-factor sign-in</Link>
              </Button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit(String(new FormData(e.currentTarget).get("code") ?? ""));
              }}
            >
              <Field id="step-up-code" label="Code" error={error ?? undefined}>
                <Input
                  id="step-up-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={20}
                  className="font-mono text-lg tracking-widest"
                  aria-describedby={error ? "step-up-code-error" : undefined}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Checking…" : "Confirm"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );

  return { withStepUp, dialog, pending };
}
