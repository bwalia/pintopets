import { Button } from "@pintopets/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pintopets/ui/components/card";
import { LogOut, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { PrivacyCard } from "@/components/account/privacy-card";
import { TwoFactorCard } from "@/components/account/two-factor-card";
import { SignedOut } from "@/components/signed-out";
import { currentUser } from "@/server/auth";
import { securityStatus } from "@/server/security/service";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) return <SignedOut title="Account" next="/account" />;
  const security = await securityStatus(user).catch(() => null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-semibold">Account</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="bg-secondary text-secondary-foreground inline-flex size-12 items-center justify-center rounded-full">
              <UserRound className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate">{user.displayName}</CardTitle>
              <CardDescription className="truncate">{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {user.demo ? (
            <p className="text-sm">You&apos;re using the shared demo account.</p>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                Your name, email, password and email sign-in codes are managed by your Workstation
                (OpsAPI) account.
              </p>
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="outline">
                  <LogOut aria-hidden /> Sign out
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      {security ? (
        <>
          <TwoFactorCard
            status={{
              totpEnabled: security.totpEnabled,
              enabledAt: security.enabledAt,
              requireCodeAtSignIn: security.requireCodeAtSignIn,
              recoveryCodesLeft: security.recoveryCodesLeft,
            }}
          />
          <PrivacyCard
            consentAiLearning={security.consentAiLearning}
            consentMarketing={security.consentMarketing}
          />
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Security settings are unavailable right now. Please try again shortly.
        </p>
      )}
    </div>
  );
}
