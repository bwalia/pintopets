"use client";

import { Button } from "@pintopets/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pintopets/ui/components/card";
import { describedBy, Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { useState, useTransition } from "react";
import { setCommunityNameAction } from "@/app/community/actions";

/** The only name other members ever see. Never the account email. */
export function CommunityNameCard({ displayName, isNew }: { displayName: string; isNew: boolean }) {
  const [name, setName] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Card id="community">
      <CardHeader>
        <CardTitle>Community name</CardTitle>
        <CardDescription>
          The name people see on your posts. Your email is never shown.
          {isNew ? " We've suggested one; change it if you like." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setSaved(false);
              const r = await setCommunityNameAction({ displayName: name });
              if (r.ok) {
                setError(null);
                setSaved(true);
              } else setError(r.fieldErrors.displayName ?? r.message);
            });
          }}
        >
          <Field id="community-name" label="Name" error={error ?? undefined} className="flex-1">
            <Input
              id="community-name"
              value={name}
              minLength={2}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy("community-name", undefined, error ?? undefined)}
            />
          </Field>
          <Button type="submit" disabled={pending || name.trim() === ""}>
            Save
          </Button>
        </form>
        {saved ? (
          <p role="status" className="text-success mt-2 text-sm font-semibold">
            Saved.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
