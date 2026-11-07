import { FORUM_CATEGORIES } from "@pintopets/api-contract";
import { Alert, AlertDescription } from "@pintopets/ui/components/alert";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ThreadForm } from "@/components/community/thread-form";
import { SignedOut } from "@/components/signed-out";
import { currentUser } from "@/server/auth";
import { isSuspended } from "@/server/community/rules";
import { communityProfile } from "@/server/community/service";
import { allSpecies } from "@/server/reference-data";

export const metadata: Metadata = { title: "Start a discussion" };

export default async function NewThreadPage({ searchParams }: PageProps<"/community/new">) {
  const user = await currentUser();
  if (!user)
    return (
      <SignedOut
        title="Start a discussion"
        next="/community/new"
        message="Sign in to post in the community"
      />
    );
  const profile = await communityProfile(user);
  const { category } = await searchParams;
  const defaultCategory = FORUM_CATEGORIES.some((c) => c.slug === category)
    ? String(category)
    : undefined;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-semibold">Start a discussion</h1>
        <p className="text-muted-foreground mt-1">
          Posting as <strong>{profile.displayName}</strong>.{" "}
          <Link
            href={"/account#community" as Route}
            className="text-primary underline underline-offset-2"
          >
            Change your community name
          </Link>
        </p>
      </div>
      {isSuspended(profile.suspendedUntil) ? (
        <Alert variant="warning">
          <AlertDescription>
            Your community account is paused, so you can&apos;t post right now.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert>
            <AlertDescription>
              <p className="font-semibold">Keep yourself and others safe</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                <li>
                  Don&apos;t share your phone number, email or address. They&apos;ll be blocked.
                </li>
                <li>No selling or rehoming animals for money.</li>
                <li>
                  If your pet is very unwell right now, contact a vet instead of waiting for
                  replies.
                </li>
              </ul>
            </AlertDescription>
          </Alert>
          <ThreadForm
            species={allSpecies().map((s) => ({ slug: s.slug, name: s.name }))}
            defaultCategory={defaultCategory}
          />
        </>
      )}
    </div>
  );
}
