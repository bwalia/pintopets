import { Card, CardContent } from "@pintopets/ui/components/card";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModQueue } from "@/components/community/mod-queue";
import { timeAgo } from "@/components/community/time-ago";
import { SignedOut } from "@/components/signed-out";
import { currentUser, isModerator } from "@/server/auth";
import { isSuspended } from "@/server/community/rules";
import { moderationLog, moderationQueue } from "@/server/community/service";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

const ACTION: Record<string, string> = {
  hide: "hid",
  restore: "restored",
  remove: "removed",
  dismiss: "dismissed reports on",
  lock: "locked",
  unlock: "unlocked",
  pin: "pinned",
  unpin: "unpinned",
  unsuspend: "lifted the pause on",
};

export default async function ModerationPage() {
  const user = await currentUser();
  if (!user)
    return <SignedOut title="Moderation" next="/moderation" message="Sign in to moderate" />;
  if (!isModerator(user)) notFound();
  const [queue, log] = await Promise.all([moderationQueue(user), moderationLog(user)]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="font-semibold">Moderation</h1>
        <p className="text-muted-foreground mt-1">
          Reported posts, most reported first. Pausing a member needs your authenticator code. Every
          action is recorded below.
        </p>
      </div>
      <section aria-labelledby="queue" className="flex flex-col gap-3">
        <h2 id="queue" className="text-h4 font-semibold">
          Open reports ({queue.length})
        </h2>
        <ModQueue
          items={queue.map((q) => ({
            ...q,
            reportedAgo: `first reported ${timeAgo(q.firstReportedAt)}`,
            authorSuspended: isSuspended(q.authorSuspendedUntil),
          }))}
        />
      </section>
      <section aria-labelledby="log" className="flex flex-col gap-3">
        <h2 id="log" className="text-h4 font-semibold">
          Recent actions
        </h2>
        <Card>
          <CardContent>
            {log.length === 0 ? (
              <p className="text-muted-foreground">Nothing yet.</p>
            ) : (
              <ul className="divide-y">
                {log.map((l) => (
                  <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                    <span>
                      <strong>{l.moderatorName}</strong>{" "}
                      {l.action.startsWith("suspend_")
                        ? `paused a member for ${l.action.slice(8, -1)} days`
                        : `${ACTION[l.action] ?? l.action} a ${l.targetType}`}
                      {l.reason ? (
                        <span className="text-muted-foreground"> — {l.reason}</span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground">{timeAgo(l.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
