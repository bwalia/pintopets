"use client";

import { Button } from "@pintopets/ui/components/button";
import { Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { Textarea } from "@pintopets/ui/components/textarea";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import {
  acceptAnswerAction,
  removeReplyAction,
  removeThreadAction,
  updateReplyAction,
  updateThreadAction,
} from "@/app/community/actions";

type Result = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };

/**
 * Edit / remove for a thread or reply, plus "Mark as answer". The body is
 * rendered by the server (children) and swapped for a form while editing.
 */
export function PostActions({
  kind,
  id,
  threadId,
  title,
  body,
  can,
  isAccepted = false,
  children,
}: {
  kind: "thread" | "reply";
  id: string;
  threadId: string;
  title?: string;
  body: string;
  can: { edit: boolean; delete: boolean; accept?: boolean };
  isAccepted?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title ?? "");
  const [draft, setDraft] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) {
        after?.();
        router.refresh();
      } else setError(Object.values(r.fieldErrors ?? {})[0] ?? r.message ?? "That didn't work.");
    });

  return (
    <div className="flex flex-col gap-3">
      {editing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                kind === "thread"
                  ? updateThreadAction(id, { title: draftTitle, body: draft })
                  : updateReplyAction(id, { body: draft }),
              () => setEditing(false),
            );
          }}
        >
          {kind === "thread" ? (
            <Field id={`title-${id}`} label="Title">
              <Input
                id={`title-${id}`}
                value={draftTitle}
                maxLength={150}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
            </Field>
          ) : null}
          <Field id={`body-${id}`} label="Message">
            <Textarea
              id={`body-${id}`}
              rows={6}
              value={draft}
              maxLength={10_000}
              onChange={(e) => setDraft(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        children
      )}
      {error ? (
        <p role="alert" className="text-destructive text-sm font-semibold">
          {error}
        </p>
      ) : null}
      {!editing && (can.edit || can.delete || can.accept) ? (
        <div className="flex flex-wrap gap-1">
          {can.accept ? (
            <Button
              size="sm"
              variant={isAccepted ? "secondary" : "ghost"}
              disabled={pending}
              onClick={() => run(() => acceptAnswerAction(threadId, isAccepted ? null : id))}
            >
              <CheckCircle2 aria-hidden /> {isAccepted ? "Unmark answer" : "Mark as answer"}
            </Button>
          ) : null}
          {can.edit ? (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil aria-hidden /> Edit
            </Button>
          ) : null}
          {can.delete ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={pending}
              onClick={() => {
                if (
                  !window.confirm(
                    kind === "thread" ? "Remove this discussion?" : "Remove this reply?",
                  )
                )
                  return;
                if (kind === "thread") {
                  start(async () => {
                    const r = await removeThreadAction(id);
                    if (r.ok) router.push("/community");
                    else setError(r.message);
                  });
                } else run(() => removeReplyAction(id));
              }}
            >
              <Trash2 aria-hidden /> Remove
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
