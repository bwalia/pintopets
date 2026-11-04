"use client";

import { Alert, AlertDescription, AlertTitle } from "@pintopets/ui/components/alert";
import { Badge } from "@pintopets/ui/components/badge";
import { Button } from "@pintopets/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pintopets/ui/components/card";
import { Dialog, DialogContent } from "@pintopets/ui/components/dialog";
import { Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { Download, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  confirmTotpAction,
  disableTotpAction,
  regenerateCodesAction,
  startTotpAction,
  updatePreferencesAction,
} from "@/app/account/actions";
import { useStepUp } from "./step-up";

export interface SecurityView {
  totpEnabled: boolean;
  enabledAt: string | null;
  requireCodeAtSignIn: boolean;
  recoveryCodesLeft: number;
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = `PintoPets recovery codes\nEach code works once. Keep them somewhere safe.\n\n${codes.join("\n")}\n`;
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="warning" role="note">
        <KeyRound aria-hidden />
        <AlertTitle>Save these recovery codes now</AlertTitle>
        <AlertDescription>
          <p>They&apos;re shown only once. Each one gets you in if you lose your phone.</p>
        </AlertDescription>
      </Alert>
      <ul
        className="bg-muted grid grid-cols-2 gap-2 rounded-xl p-4 font-mono text-sm"
        aria-label="Recovery codes"
      >
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline">
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
            download="pintopets-recovery-codes.txt"
          >
            <Download aria-hidden /> Download
          </a>
        </Button>
        <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(text)}>
          Copy
        </Button>
        <Button onClick={onDone}>I&apos;ve saved them</Button>
      </div>
    </div>
  );
}

export function TwoFactorCard({ status }: { status: SecurityView }) {
  const router = useRouter();
  const { withStepUp, dialog } = useStepUp();
  const [setup, setSetup] = useState<{ secret: string; qrSvg: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const begin = () =>
    startTransition(async () => {
      setError(null);
      const r = await startTotpAction();
      if (r.ok) setSetup(r.data);
      else setError(r.message);
    });

  return (
    <Card id="security">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Two-factor sign-in</CardTitle>
          {status.totpEnabled ? (
            <Badge variant="expert">
              <ShieldCheck aria-hidden /> On
            </Badge>
          ) : (
            <Badge variant="warning">Off</Badge>
          )}
        </div>
        <CardDescription>
          Use an authenticator app (Google Authenticator, Microsoft Authenticator, Authy,
          1Password…). You&apos;ll need a code for sensitive actions such as exporting your data or
          deleting a pet.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-destructive text-sm font-semibold">
            {error}
          </p>
        ) : null}
        {!status.totpEnabled ? (
          <Button onClick={begin} disabled={pending} className="w-fit">
            <ShieldCheck aria-hidden /> Set up two-factor sign-in
          </Button>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              {status.recoveryCodesLeft} recovery code{status.recoveryCodesLeft === 1 ? "" : "s"}{" "}
              left.
            </p>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="accent-primary size-5"
                defaultChecked={status.requireCodeAtSignIn}
                onChange={(e) => {
                  const value = e.currentTarget.checked;
                  const box = e.currentTarget;
                  void withStepUp(() =>
                    updatePreferencesAction({ requireCodeAtSignIn: value }),
                  ).then((r) => {
                    if (!r.ok) box.checked = !value;
                    router.refresh();
                  });
                }}
              />
              Also ask for a code every time I sign in (you can trust a device for 30 days)
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  void withStepUp(async () => {
                    const r = await regenerateCodesAction();
                    if (r.ok) setCodes(r.data.recoveryCodes);
                    return r;
                  })
                }
              >
                <KeyRound aria-hidden /> New recovery codes
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  void withStepUp(disableTotpAction).then((r) => {
                    if (r.ok) router.refresh();
                  })
                }
              >
                <ShieldOff aria-hidden /> Turn off
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={setup !== null} onOpenChange={(o) => !o && setSetup(null)}>
        {setup ? (
          <DialogContent
            title="Set up two-factor sign-in"
            description="Scan the QR code with your authenticator app, then enter the 6-digit code it shows."
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const code = String(new FormData(e.currentTarget).get("code") ?? "");
                startTransition(async () => {
                  const r = await confirmTotpAction(code);
                  if (!r.ok) return setError(r.fieldErrors.code ?? r.message);
                  setSetup(null);
                  setError(null);
                  setCodes(r.data.recoveryCodes);
                });
              }}
            >
              <div
                className="mx-auto size-56 rounded-xl border bg-white p-2 [&_svg]:size-full"
                role="img"
                aria-label="QR code for your authenticator app"
                // QR SVG generated on our server from the otpauth URI (no user input).
                dangerouslySetInnerHTML={{ __html: setup.qrSvg }}
              />
              <details className="text-sm">
                <summary className="text-primary cursor-pointer font-semibold">
                  Can&apos;t scan? Enter this key
                </summary>
                <p className="bg-muted mt-2 rounded-lg p-3 font-mono break-all select-all">
                  {setup.secret}
                </p>
              </details>
              <Field id="totp-code" label="6-digit code" error={error ?? undefined}>
                <Input
                  id="totp-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  className="font-mono text-lg tracking-widest"
                  aria-describedby={error ? "totp-code-error" : undefined}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setSetup(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Checking…" : "Turn on"}
                </Button>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={codes !== null} onOpenChange={() => undefined}>
        {codes ? (
          <DialogContent title="Your recovery codes">
            <RecoveryCodes
              codes={codes}
              onDone={() => {
                setCodes(null);
                router.refresh();
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
      {dialog}
    </Card>
  );
}
