"use client";

import { Button } from "@pintopets/ui/components/button";
import { describedBy, Field } from "@pintopets/ui/components/field";
import { Textarea } from "@pintopets/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createReplyAction } from "@/app/community/actions";

export function ReplyForm({ threadId, postingAs }: { threadId: string; postingAs: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createReplyAction(threadId, { body });
          if (r.ok) {
            setBody("");
            setError(null);
            router.refresh();
          } else setError(r.fieldErrors.body ?? r.message);
        });
      }}
    >
      <Field
        id="reply"
        label="Your reply"
        hint={`Posting as ${postingAs}. Be kind, and share what worked for you.`}
        error={error ?? undefined}
      >
        <Textarea
          id="reply"
          rows={5}
          maxLength={10_000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy("reply", "hint", error ?? undefined)}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || body.trim().length < 2}>
          {pending ? "Posting…" : "Post reply"}
        </Button>
      </div>
    </form>
  );
}
