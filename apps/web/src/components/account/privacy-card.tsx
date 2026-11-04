"use client";

import { Button } from "@pintopets/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pintopets/ui/components/card";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updatePreferencesAction } from "@/app/account/actions";
import { useStepUp } from "./step-up";

export function PrivacyCard({
  consentAiLearning,
  consentMarketing,
}: {
  consentAiLearning: boolean;
  consentMarketing: boolean;
}) {
  const router = useRouter();
  const { withStepUp, dialog } = useStepUp();
  const [error, setError] = useState<string | null>(null);

  const toggle =
    (key: "consentAiLearning" | "consentMarketing") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const box = e.currentTarget;
      const value = box.checked;
      void updatePreferencesAction({ [key]: value }).then((r) => {
        if (!r.ok) {
          box.checked = !value;
          setError(r.message);
        }
        router.refresh();
      });
    };

  async function exportData() {
    setError(null);
    const r = await withStepUp(async () => {
      const res = await fetch("/api/v1/me/export");
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        const a = Object.assign(document.createElement("a"), {
          href: url,
          download: `pintopets-export-${new Date().toISOString().slice(0, 10)}.json`,
        });
        a.click();
        URL.revokeObjectURL(url);
        return { ok: true };
      }
      const body = (await res.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;
      return { ok: false, code: body?.error?.code, message: body?.error?.message };
    });
    if (!r.ok && r.message && r.message !== "Cancelled") setError(r.message);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy and your data</CardTitle>
        <CardDescription>
          You choose how your information is used. Both are off unless you turn them on.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-destructive text-sm font-semibold">
            {error}
          </p>
        ) : null}
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="accent-primary mt-0.5 size-5 shrink-0"
            defaultChecked={consentAiLearning}
            onChange={toggle("consentAiLearning")}
          />
          <span>
            <span className="font-semibold">Help improve the pet assistant.</span> Vets may review
            anonymised questions (names, contact details and pet names removed) to improve the
            knowledge base.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="accent-primary mt-0.5 size-5 shrink-0"
            defaultChecked={consentMarketing}
            onChange={toggle("consentMarketing")}
          />
          <span>
            <span className="font-semibold">News and tips by email.</span> Occasional updates;
            unsubscribe any time.
          </span>
        </label>
        <div className="border-t pt-4">
          <p className="text-sm font-semibold">Download your data</p>
          <p className="text-muted-foreground mb-3 text-sm">
            Every pet, record and photo detail, as a JSON file. Needs your authenticator code.
          </p>
          <Button variant="outline" onClick={() => void exportData()}>
            <Download aria-hidden /> Export my data
          </Button>
        </div>
      </CardContent>
      {dialog}
    </Card>
  );
}
