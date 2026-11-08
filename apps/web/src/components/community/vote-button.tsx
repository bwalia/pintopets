"use client";

import { cn } from "@pintopets/ui/lib/utils";
import { ThumbsUp } from "lucide-react";
import { useState, useTransition } from "react";
import { voteAction } from "@/app/community/actions";

/** "Helpful" toggle. Disabled for your own posts and when signed out. */
export function VoteButton({
  targetType,
  targetId,
  score: initialScore,
  voted: initialVoted,
  disabledReason,
}: {
  targetType: "thread" | "reply";
  targetId: string;
  score: number;
  voted: boolean;
  disabledReason?: string;
}) {
  const [score, setScore] = useState(initialScore);
  const [voted, setVoted] = useState(initialVoted);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        aria-pressed={voted}
        disabled={pending || Boolean(disabledReason)}
        title={disabledReason}
        onClick={() =>
          start(async () => {
            setError(null);
            const next = !voted;
            setVoted(next);
            setScore((s) => s + (next ? 1 : -1));
            const r = await voteAction({ targetType, targetId, voted: next });
            if (r.ok) {
              setVoted(r.data.voted);
              setScore(r.data.score);
            } else {
              setVoted(!next);
              setScore((s) => s + (next ? -1 : 1));
              setError(r.message);
            }
          })
        }
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          voted ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
        )}
      >
        <ThumbsUp className={cn("size-4", voted && "fill-current")} aria-hidden />
        Helpful
        <span className="tabular-nums" aria-label={`${score} people found this helpful`}>
          {score}
        </span>
      </button>
      {error ? (
        <p role="alert" className="text-destructive text-xs font-semibold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
