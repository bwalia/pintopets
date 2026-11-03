import { Card, CardContent } from "@pintopets/ui/components/card";
import { LogIn } from "lucide-react";

/** Shown when nobody is signed in (real sign-in arrives with Google + email links). */
export function SignedOut({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-semibold">{title}</h1>
      <Card className="mt-6">
        <CardContent className="flex items-start gap-4">
          <LogIn className="text-primary mt-0.5 size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Sign in to see your pets</p>
            <p className="text-muted-foreground mt-1">
              Sign-in with Google or an email link is coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
