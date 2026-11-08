import { Button } from "@pintopets/ui/components/button";
import { Card, CardContent } from "@pintopets/ui/components/card";
import { Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APP_SIGNIN_COOKIE, isChallenge } from "@/server/app-auth";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Sign in to the app", robots: { index: false } };

/** iOS app sign-in, step 2: the person confirms which account the app gets. */
export default async function AppFinishPage({ searchParams }: PageProps<"/auth/app/finish">) {
  const expired = (await searchParams).expired === "1";
  const challenge = (await cookies()).get(APP_SIGNIN_COOKIE)?.value;
  const user = await currentUser();
  if (!expired && isChallenge(challenge) && !user) {
    redirect(`/auth/signin?next=${encodeURIComponent("/auth/app/finish")}`);
  }
  const ready = !expired && isChallenge(challenge) && user;
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3">
            <Smartphone className="text-primary size-8" aria-hidden />
            <h1 className="text-h3 font-sans font-semibold tracking-normal">
              Sign in to the PintoPets app
            </h1>
          </div>
          {ready ? (
            <>
              <p className="text-muted-foreground">
                The PintoPets app on this device will be signed in as{" "}
                <strong className="text-foreground">{user.email}</strong>. Only continue if you
                opened this from the app yourself.
              </p>
              <form method="post" action="/auth/app/approve">
                <Button type="submit" className="w-full">
                  Sign in to the app
                </Button>
              </form>
            </>
          ) : (
            <p className="text-muted-foreground">
              This sign-in has expired. Please go back to the PintoPets app and press Sign in again.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
