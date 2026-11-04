"use client";

import { Alert, AlertDescription } from "@pintopets/ui/components/alert";
import { Button } from "@pintopets/ui/components/button";
import { Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { useState, useTransition } from "react";
import { verifySignInAction } from "./actions";

export function VerifyForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await verifySignInAction({
            code: String(fd.get("code") ?? ""),
            trust: fd.get("trust") === "on",
            next,
          });
          if (r && !r.ok) setError(r.message);
        });
      }}
    >
      {error ? (
        <Alert variant="warning" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Field
        id="code"
        label="Code from your authenticator app"
        hint="Or one of your recovery codes."
      >
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          maxLength={20}
          aria-describedby="code-hint"
          className="font-mono text-lg tracking-widest"
        />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="trust" className="accent-primary size-5" />
        Trust this device for 30 days
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}
