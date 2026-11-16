import { Card, CardContent } from "@pintopets/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccountForm } from "@/components/account/delete-account-form";
import { SignedOut } from "@/components/signed-out";
import { currentUser } from "@/server/auth";
import { securityStatus } from "@/server/security/service";
import { signedInRecently } from "@/server/security/step-up";

export const metadata: Metadata = { title: "Delete your account" };

const DELETED = [
  "Every pet you own, with all its records: weights, vaccinations, parasite treatments, medications, vet visits, conditions, allergies, symptoms, horse care, diet and water notes.",
  "Every photo of those pets, including the stored image files.",
  "Your access to pets other people have shared with you (their pets and records stay with them).",
  "Your community posts and replies: their text is erased and they're no longer linked to you. Your community name, your helpful votes and the details you wrote in any reports go too.",
  "Your two-factor sign-in settings, recovery codes and privacy choices.",
];

export default async function DeleteAccountPage() {
  const user = await currentUser();
  if (!user) return <SignedOut title="Delete your account" next="/account/delete" />;
  // How they confirm: an authenticator code with 2FA on, otherwise a recent sign-in.
  const confirmWith = user.demo
    ? "code"
    : (await securityStatus(user)).totpEnabled
      ? "code"
      : (await signedInRecently(user))
        ? "recent-sign-in"
        : "sign-in-again";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-semibold">Delete your account</h1>
        <p className="text-muted-foreground mt-1">
          This permanently deletes your PintoPets data. It can&apos;t be undone.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-h4 font-semibold">What we delete</h2>
          <ul className="list-disc pl-5 text-sm">
            {DELETED.map((item) => (
              <li key={item} className="mt-1">
                {item}
              </li>
            ))}
          </ul>
          <h2 className="text-h4 mt-2 font-semibold">What stays</h2>
          <ul className="text-muted-foreground list-disc pl-5 text-sm">
            <li className="mt-1">
              Your Workstation sign-in (name, email and password) is a separate account shared with
              other Workstation services. Deleting PintoPets doesn&apos;t delete it: manage or
              delete it with Workstation.
            </li>
            <li className="mt-1">
              Discussions started by other people stay, without your replies. Moderators keep their
              records of actions they took, which they need to keep the community safe.
            </li>
          </ul>
          <p className="text-muted-foreground text-sm">
            Want a copy first?{" "}
            <Link href="/account" className="text-primary underline underline-offset-2">
              Export your data
            </Link>{" "}
            from your account page before deleting.
          </p>
        </CardContent>
      </Card>

      {user.demo ? (
        <Card>
          <CardContent>
            <p role="note" className="text-sm">
              You&apos;re using the shared demo account, which can&apos;t be deleted. Sign in with
              your own account to delete your data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DeleteAccountForm confirmWith={confirmWith} />
      )}

      <Link href="/account" className="text-primary underline underline-offset-2">
        Back to your account
      </Link>
    </div>
  );
}
