"use client";

import { Badge } from "@pintopets/ui/components/badge";
import { Button } from "@pintopets/ui/components/button";
import { NativeSelect } from "@pintopets/ui/components/native-select";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moderateAction, suspendMemberAction } from "@/app/community/actions";
import { useStepUp } from "@/components/account/step-up";

export interface QueueItemView {
  targetType: "thread" | "reply";
  targetId: string;
  threadId: string;
  threadTitle: string;
  content: string;
  contentStatus: "visible" | "hidden" | "removed";
  reportCount: number;
  reasons: string[];
  details: string[];
  reportedAgo: string;
  authorId: string;
  authorName: string;
  authorSuspended: boolean;
}

const REASON: Record<string, string> = {
  spam: "Spam or selling",
  abuse: "Abuse",
  unsafe_advice: "Unsafe advice",
  animal_welfare: "Animal at risk",
  off_topic: "Off topic",
  other: "Other",
};

function Item({ item }: { item: QueueItemView }) {
  const router = useRouter();
  const { withStepUp, dialog } = useStepUp();
  const [days, setDays] = useState("7");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const act = (action: "hide" | "remove" | "restore" | "dismiss") =>
    start(async () => {
      setError(null);
      const r = await moderateAction({
        targetType: item.targetType,
        targetId: item.targetId,
        action,
        reason: item.reasons.join(", "),
      });
      if (r.ok) router.refresh();
      else setError(r.message);
    });

  const suspend = (d: number) => {
    const reason = d > 0 ? window.prompt("Reason (shown to moderators, logged)") : "Lifted";
    if (reason === null) return;
    void withStepUp(() => suspendMemberAction({ userId: item.authorId, days: d, reason })).then(
      (r) => {
        if (r.ok) router.refresh();
        else if (r.message && r.message !== "Cancelled") setError(r.message);
      },
    );
  };

  return (
    <li className="bg-card flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="urgent">
          {item.reportCount} {item.reportCount === 1 ? "report" : "reports"}
        </Badge>
        {item.reasons.map((r) => (
          <Badge key={r} variant="outline">
            {REASON[r] ?? r}
          </Badge>
        ))}
        <Badge variant={item.contentStatus === "visible" ? "secondary" : "warning"}>
          {item.contentStatus}
        </Badge>
        <span className="text-muted-foreground">{item.reportedAgo}</span>
      </div>
      <p className="text-sm">
        {item.targetType === "reply" ? "Reply in " : "Discussion "}
        <Link
          href={`/community/t/${item.threadId}` as Route}
          className="text-primary font-semibold underline underline-offset-2"
        >
          {item.threadTitle}
        </Link>{" "}
        by <strong>{item.authorName}</strong>
        {item.authorSuspended ? " (paused)" : ""}
      </p>
      <blockquote className="bg-muted/50 max-h-48 overflow-auto rounded-lg p-3 text-sm break-words whitespace-pre-line">
        {item.content}
      </blockquote>
      {item.details.length ? (
        <ul className="text-muted-foreground list-disc pl-5 text-sm">
          {item.details.map((d, i) => (
            <li key={i}>“{d}”</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {item.contentStatus === "visible" ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act("hide")}>
            Hide
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act("restore")}>
            Restore
          </Button>
        )}
        <Button size="sm" variant="urgent" disabled={pending} onClick={() => act("remove")}>
          Remove
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("dismiss")}>
          Dismiss reports
        </Button>
        <span className="bg-border mx-1 hidden h-6 w-px sm:inline-block" aria-hidden />
        {item.authorSuspended ? (
          <Button size="sm" variant="ghost" onClick={() => suspend(0)}>
            Lift pause
          </Button>
        ) : (
          <span className="flex items-center gap-2">
            <label htmlFor={`days-${item.targetId}`} className="sr-only">
              Pause length
            </label>
            <NativeSelect
              id={`days-${item.targetId}`}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="h-9 w-32"
            >
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="365">1 year</option>
            </NativeSelect>
            <Button size="sm" variant="ghost" onClick={() => suspend(Number(days))}>
              Pause author
            </Button>
          </span>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm font-semibold">
          {error}
        </p>
      ) : null}
      {dialog}
    </li>
  );
}

export function ModQueue({ items }: { items: QueueItemView[] }) {
  if (!items.length) {
    return (
      <p className="bg-card text-muted-foreground rounded-2xl border p-6 text-center">
        No open reports. All quiet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <Item key={`${i.targetType}-${i.targetId}`} item={i} />
      ))}
    </ul>
  );
}
