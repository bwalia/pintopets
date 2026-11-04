import { Card, CardContent } from "@pintopets/ui/components/card";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { safeNext } from "@/server/session";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Two-factor check", robots: { index: false } };

export default async function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  const next = safeNext(String((await searchParams).next ?? "/"));
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-primary size-8" aria-hidden />
            <h1 className="text-h3 font-sans font-semibold tracking-normal">One more step</h1>
          </div>
          <p className="text-muted-foreground">
            Open your authenticator app and enter the 6-digit code for PintoPets.
          </p>
          <VerifyForm next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
