import { Uuid } from "@pintopets/api-contract";
import { Alert, AlertDescription } from "@pintopets/ui/components/alert";
import { Badge } from "@pintopets/ui/components/badge";
import { Button } from "@pintopets/ui/components/button";
import { cn } from "@pintopets/ui/lib/utils";
import { ArrowLeft, CheckCircle2, EyeOff, Lock } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { categoryName, isHealthCategory } from "@/components/community/categories";
import { ModTools } from "@/components/community/mod-tools";
import { PostActions } from "@/components/community/post-actions";
import { PostBody } from "@/components/community/post-body";
import { ReplyForm } from "@/components/community/reply-form";
import { ReportButton } from "@/components/community/report-button";
import { timeAgo } from "@/components/community/time-ago";
import { VoteButton } from "@/components/community/vote-button";
import { UrgentHelp } from "@/components/urgent-help";
import { currentUser } from "@/server/auth";
import { isSuspended } from "@/server/community/rules";
import { communityProfile, getThread } from "@/server/community/service";
import { HttpError } from "@/server/http";
import { speciesBySlug } from "@/server/reference-data";

const load = cache(async (threadId: string) => {
  if (!Uuid.safeParse(threadId).success) notFound();
  const viewer = await currentUser();
  try {
    return { viewer, thread: await getThread(viewer, threadId) };
  } catch (error) {
    if (error instanceof HttpError && error.code === "not_found") notFound();
    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps<"/community/t/[threadId]">): Promise<Metadata> {
  const { thread } = await load((await params).threadId);
  return {
    title: thread.title,
    description: thread.body.slice(0, 160),
    // Hidden posts must never be indexed.
    robots: thread.status === "visible" ? undefined : { index: false },
  };
}

function HiddenNote() {
  return (
    <p className="bg-warning text-warning-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
      <EyeOff className="size-4 shrink-0" aria-hidden />
      Hidden while moderators review it. Only you and moderators can see this.
    </p>
  );
}

export default async function ThreadPage({ params }: PageProps<"/community/t/[threadId]">) {
  const { viewer, thread } = await load((await params).threadId);
  const profile = viewer ? await communityProfile(viewer) : null;
  const suspended = isSuspended(profile?.suspendedUntil);
  const species = thread.speciesSlug ? speciesBySlug(thread.speciesSlug) : undefined;
  const signInHref = `/auth/signin?next=${encodeURIComponent(`/community/t/${thread.id}`)}`;
  const voteBlock = (own: boolean) =>
    !viewer
      ? "Sign in to vote"
      : own
        ? "You can't vote for your own post"
        : suspended
          ? "Your account is paused"
          : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href={`/community?category=${thread.category}` as Route}
        className="text-muted-foreground hover:text-foreground inline-flex min-h-11 w-fit items-center gap-1 text-sm font-semibold"
      >
        <ArrowLeft className="size-4" aria-hidden /> {categoryName(thread.category)}
      </Link>

      <article className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">{categoryName(thread.category)}</Badge>
          {species ? <Badge variant="outline">{species.name}</Badge> : null}
          {thread.tags.map((t) => (
            <Badge key={t} variant="secondary">
              #{t}
            </Badge>
          ))}
          {thread.solved ? (
            <Badge variant="expert">
              <CheckCircle2 className="size-3" aria-hidden /> Answered
            </Badge>
          ) : null}
          {thread.isLocked ? (
            <Badge variant="outline">
              <Lock className="size-3" aria-hidden /> Locked
            </Badge>
          ) : null}
        </div>
        <PostActions
          kind="thread"
          id={thread.id}
          threadId={thread.id}
          title={thread.title}
          body={thread.body}
          can={{ edit: thread.can.edit, delete: thread.can.delete }}
        >
          <h1 className="text-2xl leading-tight font-semibold break-words">{thread.title}</h1>
          <p className="text-muted-foreground text-sm">
            {thread.author.isYou ? "You" : thread.author.name} asked {timeAgo(thread.createdAt)}
            {thread.editedAt ? ` · edited ${timeAgo(thread.editedAt)}` : ""}
          </p>
          {thread.status === "hidden" ? <HiddenNote /> : null}
          <PostBody text={thread.body} />
        </PostActions>
        <div className="flex flex-wrap items-center gap-2">
          <VoteButton
            targetType="thread"
            targetId={thread.id}
            score={thread.score}
            voted={thread.viewerVoted}
            disabledReason={voteBlock(thread.author.isYou)}
          />
          {viewer && !thread.author.isYou ? (
            <ReportButton targetType="thread" targetId={thread.id} />
          ) : null}
        </div>
        {thread.can.moderate ? (
          <ModTools
            targetType="thread"
            targetId={thread.id}
            status={thread.status}
            isLocked={thread.isLocked}
            isPinned={thread.isPinned}
          />
        ) : null}
      </article>

      {isHealthCategory(thread.category) ? (
        <>
          <UrgentHelp />
          <p className="text-muted-foreground text-sm">
            Replies come from other owners sharing their experience. They aren&apos;t a diagnosis;
            if you&apos;re worried, speak to your vet.
          </p>
        </>
      ) : null}

      <section aria-labelledby="replies" className="flex flex-col gap-4">
        <h2 id="replies" className="text-h4 font-semibold">
          {thread.replies.length} {thread.replies.length === 1 ? "reply" : "replies"}
        </h2>
        {thread.replies.length === 0 ? (
          <p className="text-muted-foreground">No replies yet. Could you help?</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {thread.replies.map((r) => (
              <li
                key={r.id}
                id={`reply-${r.id}`}
                className={cn(
                  "bg-card flex flex-col gap-3 rounded-2xl border p-4",
                  r.isAccepted && "border-success/40 bg-success-soft/40",
                )}
              >
                {r.isAccepted ? (
                  <p className="text-success flex items-center gap-1 text-sm font-semibold">
                    <CheckCircle2 className="size-4" aria-hidden /> Marked as the answer
                  </p>
                ) : null}
                <PostActions
                  kind="reply"
                  id={r.id}
                  threadId={thread.id}
                  body={r.body}
                  can={r.can}
                  isAccepted={r.isAccepted}
                >
                  <p className="text-muted-foreground text-sm">
                    <span className="text-foreground font-semibold">
                      {r.author.isYou ? "You" : r.author.name}
                    </span>{" "}
                    · {timeAgo(r.createdAt)}
                    {r.editedAt ? " · edited" : ""}
                  </p>
                  {r.status === "hidden" ? <HiddenNote /> : null}
                  <PostBody text={r.body} />
                </PostActions>
                <div className="flex flex-wrap items-center gap-2">
                  <VoteButton
                    targetType="reply"
                    targetId={r.id}
                    score={r.score}
                    voted={r.viewerVoted}
                    disabledReason={voteBlock(r.author.isYou)}
                  />
                  {viewer && !r.author.isYou ? (
                    <ReportButton targetType="reply" targetId={r.id} />
                  ) : null}
                </div>
                {thread.can.moderate ? (
                  <ModTools targetType="reply" targetId={r.id} status={r.status} />
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-label="Reply" className="bg-card rounded-2xl border p-4">
        {thread.isLocked ? (
          <p className="text-muted-foreground flex items-center gap-2">
            <Lock className="size-4" aria-hidden /> This discussion is locked.
          </p>
        ) : !viewer ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground">Sign in to reply and help.</p>
            <Button asChild>
              <a href={signInHref}>Sign in</a>
            </Button>
          </div>
        ) : suspended ? (
          <Alert variant="warning">
            <AlertDescription>
              Your community account is paused, so you can&apos;t reply.
            </AlertDescription>
          </Alert>
        ) : thread.can.reply ? (
          <ReplyForm threadId={thread.id} postingAs={profile?.displayName ?? "you"} />
        ) : (
          <p className="text-muted-foreground">Replies are closed while this is reviewed.</p>
        )}
      </section>
    </div>
  );
}
