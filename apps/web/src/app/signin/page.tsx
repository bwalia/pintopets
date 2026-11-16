import { Button } from "@pintopets/ui/components/button";
import { Card, CardContent } from "@pintopets/ui/components/card";
import { Mail, PawPrint } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/server/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/** Apple's logo for the "Continue with Apple" button (Apple's button guidelines). */
function AppleLogo() {
  return (
    <svg viewBox="0 0 170 170" className="size-5" fill="currentColor" aria-hidden>
      <path d="M150.4 130.3c-2.7 6.3-6 12.1-9.7 17.4-5.1 7.3-9.3 12.3-12.5 15.1-5 4.6-10.3 6.9-16 7.1-4.1 0-9-1.2-14.8-3.5-5.7-2.3-11-3.5-15.8-3.5-5 0-10.4 1.2-16.2 3.5-5.8 2.4-10.5 3.6-14.1 3.7-5.5.2-10.9-2.2-16.3-7.2-3.5-3-7.8-8.2-13-15.6-5.6-7.8-10.2-16.9-13.8-27.3C4.4 109.8 2.4 98.9 2.4 88.4c0-12.1 2.6-22.5 7.8-31.2 4.1-7 9.6-12.5 16.4-16.6 6.8-4.1 14.2-6.1 22.1-6.3 4.3 0 10 1.3 17.1 4 7.1 2.7 11.6 4 13.6 4 1.5 0 6.5-1.6 15-4.7 8-2.9 14.8-4.1 20.3-3.6 15 1.2 26.3 7.1 33.8 17.8-13.4 8.1-20.1 19.5-19.9 34.2.1 11.4 4.3 20.9 12.4 28.5 3.7 3.5 7.8 6.2 12.4 8.1-1 2.9-2 5.6-3.1 8.3zM119.1 3.6c0 9-3.3 17.3-9.8 25.1-7.9 9.2-17.4 14.5-27.8 13.7-.1-1.1-.2-2.2-.2-3.4 0-8.6 3.8-17.8 10.4-25.4 3.3-3.8 7.6-7 12.7-9.5C109.6 1.6 114.4.3 119 0c.1 1.2.1 2.4.1 3.6z" />
    </svg>
  );
}

/**
 * Choose how to sign in (only shown when Sign in with Apple is enabled; see
 * /auth/signin). Apple first and at least as prominent as the others (App
 * Store guideline 4.8). Every option ends at the same PintoPets account.
 */
export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const next = encodeURIComponent(safeNext(String((await searchParams).next ?? "/")));
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3">
            <PawPrint className="text-primary size-8" aria-hidden />
            <h1 className="text-h3 font-sans font-semibold tracking-normal">
              Sign in to PintoPets
            </h1>
          </div>
          <p className="text-muted-foreground">
            New here? Any option creates your account the first time you use it.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              asChild
              size="lg"
              className="bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
            >
              <a href={`/auth/signin?provider=apple&next=${next}`}>
                <AppleLogo /> Continue with Apple
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={`/auth/signin?provider=opsapi&next=${next}`}>
                <Mail aria-hidden /> Continue with Google or email
              </a>
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            By continuing you agree to our <Link href="/terms">Terms of use</Link> and{" "}
            <Link href="/privacy">Privacy policy</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
