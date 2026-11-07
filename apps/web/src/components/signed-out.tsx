import { Button } from "@pintopets/ui/components/button";
import { Card, CardContent } from "@pintopets/ui/components/card";
import { LogIn } from "lucide-react";
import { signInEnabled } from "@/server/auth";

/** Shown when nobody is signed in. Sign-in is OpsAPI's (password + 2FA, or Google). */
export function SignedOut({
  title,
  next = "/",
  message = "Sign in to see your pets",
}: {
  title: string;
  next?: string;
  message?: string;
}) {
  const enabled = signInEnabled();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-semibold">{title}</h1>
      <Card className="mt-6">
        <CardContent className="flex items-start gap-4">
          <LogIn className="text-primary mt-0.5 size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{message}</p>
            <p className="text-muted-foreground mt-1">
              Use your Google account, or your email and password with a one-time code.
            </p>
            {enabled ? (
              <Button asChild className="mt-4">
                {/* A plain link: /auth/signin redirects to the sign-in page. */}
                <a href={`/auth/signin?next=${encodeURIComponent(next)}`}>Sign in</a>
              </Button>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                Sign-in isn&apos;t set up on this site yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
