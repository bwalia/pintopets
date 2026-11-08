"use client";

import { FORUM_CATEGORIES } from "@pintopets/api-contract";
import { Alert, AlertDescription } from "@pintopets/ui/components/alert";
import { Button } from "@pintopets/ui/components/button";
import { describedBy, Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { NativeSelect } from "@pintopets/ui/components/native-select";
import { Textarea } from "@pintopets/ui/components/textarea";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createThreadAction } from "@/app/community/actions";

export function ThreadForm({
  species,
  defaultCategory,
}: {
  species: { slug: string; name: string }[];
  defaultCategory?: string;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const tags = String(fd.get("tags") ?? "")
          .split(/[,#]/)
          .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
          .filter(Boolean);
        start(async () => {
          const r = await createThreadAction({
            category: fd.get("category"),
            speciesSlug: fd.get("speciesSlug") || null,
            title: fd.get("title"),
            body,
            tags,
          });
          if (r.ok) router.push(`/community/t/${r.data.id}` as Route);
          else {
            setErrors(r.fieldErrors);
            setMessage(r.message);
          }
        });
      }}
    >
      {message ? (
        <Alert variant="warning">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="category" label="Topic" required error={errors.category}>
          <NativeSelect id="category" name="category" defaultValue={defaultCategory ?? "health"}>
            {FORUM_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="speciesSlug" label="Kind of animal" error={errors.speciesSlug}>
          <NativeSelect id="speciesSlug" name="speciesSlug" defaultValue="">
            <option value="">Any or not specific</option>
            {species.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field
        id="title"
        label="Your question or topic"
        required
        hint="Be specific, for example: “8 month old Labrador sick straight after eating”."
        error={errors.title}
      >
        <Input
          id="title"
          name="title"
          required
          minLength={8}
          maxLength={150}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy("title", "hint", errors.title)}
        />
      </Field>
      <Field
        id="body"
        label="Details"
        required
        hint={`Age, breed, what you've noticed and for how long. ${body.length}/10,000`}
        error={errors.body}
      >
        <Textarea
          id="body"
          name="body"
          required
          rows={8}
          maxLength={10_000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={describedBy("body", "hint", errors.body)}
        />
      </Field>
      <Field
        id="tags"
        label="Tags (optional)"
        hint="Up to 5, separated by commas: puppy, vomiting"
        error={errors.tags}
      >
        <Input id="tags" name="tags" maxLength={140} autoComplete="off" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post discussion"}
        </Button>
      </div>
    </form>
  );
}
