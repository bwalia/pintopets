import { Button } from "@pintopets/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@pintopets/ui/components/card";
import type { Metadata } from "next";
import { SignedOut } from "@/components/signed-out";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) return <SignedOut title="Account" next="/account" />;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-semibold">Account</h1>
      <Card>
        <CardHeader>
          <CardTitle>{user.displayName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground">{user.email}</p>
          {user.demo ? (
            <p className="text-sm">You&apos;re using the shared demo account.</p>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                Your sign-in, password and two-factor settings are managed by your Workstation
                account.
              </p>
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="outline">
                  Sign out
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
