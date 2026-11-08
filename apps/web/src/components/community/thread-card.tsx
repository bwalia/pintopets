import type { ThreadSummary } from "@pintopets/api-contract";
import { Badge } from "@pintopets/ui/components/badge";
import { CheckCircle2, Lock, MessageSquare, Pin, ThumbsUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { categoryName } from "./categories";
import { timeAgo } from "./time-ago";

export function ThreadCard({
  thread,
  speciesName,
}: {
  thread: ThreadSummary;
  speciesName: string | null;
}) {
  return (
    <article className="bg-card hover:border-primary/40 relative flex flex-col gap-2 rounded-2xl border p-4 transition-colors">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {thread.isPinned ? (
          <Badge variant="secondary">
            <Pin className="size-3" aria-hidden /> Pinned
          </Badge>
        ) : null}
        <Badge variant="outline">{categoryName(thread.category)}</Badge>
        {speciesName ? <Badge variant="outline">{speciesName}</Badge> : null}
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
      <h2 className="text-base leading-snug font-semibold">
        <Link
          href={`/community/t/${thread.id}` as Route}
          className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
        >
          {thread.title}
        </Link>
      </h2>
      {thread.excerpt ? (
        <p className="text-muted-foreground line-clamp-2 text-sm break-words">{thread.excerpt}</p>
      ) : null}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span>
          {thread.author.isYou ? "You" : thread.author.name} · {timeAgo(thread.createdAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3.5" aria-hidden />
          {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
        </span>
        <span className="inline-flex items-center gap-1">
          <ThumbsUp className="size-3.5" aria-hidden />
          {thread.score} helpful
        </span>
        {thread.replyCount > 0 ? <span>Active {timeAgo(thread.lastActivityAt)}</span> : null}
      </div>
    </article>
  );
}
