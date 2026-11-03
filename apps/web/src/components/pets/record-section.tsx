"use client";

import type { RecordKind } from "@pintopets/api-contract";
import { Badge } from "@pintopets/ui/components/badge";
import { Button } from "@pintopets/ui/components/button";
import { Card, CardContent } from "@pintopets/ui/components/card";
import { Dialog, DialogContent } from "@pintopets/ui/components/dialog";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteRecordAction } from "@/app/pets/actions";
import { formatDate } from "@/lib/format";
import { RECORD_UI } from "@/lib/records-ui";
import { RecordForm } from "./record-form";

type Row = Record<string, unknown> & { id: string };

export function RecordSection({
  petId,
  kind,
  records,
  canEdit,
  canAdd = canEdit,
  weightUnit = "kg",
  todayIso,
  limit,
}: {
  petId: string;
  kind: RecordKind;
  records: Row[];
  canEdit: boolean;
  canAdd?: boolean;
  weightUnit?: "kg" | "g";
  todayIso: string;
  /** Show only the newest N (with a count of the rest). */
  limit?: number;
}) {
  const ui = RECORD_UI[kind];
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const shown = limit ? records.slice(0, limit) : records;
  const headingId = `section-${kind}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-h3 font-sans font-semibold tracking-normal">
            {ui.title}
          </h2>
          {ui.description ? (
            <p className="text-muted-foreground text-sm">{ui.description}</p>
          ) : null}
        </div>
        {canAdd ? (
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            <Plus aria-hidden /> Add<span className="sr-only"> {ui.singular}</span>
          </Button>
        ) : null}
      </div>

      {records.length === 0 ? (
        <p className="text-muted-foreground bg-muted rounded-xl px-4 py-3 text-sm">{ui.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((row) => {
            const s = ui.summary(row);
            const overdue = s.dueOn ? s.dueOn < todayIso : false;
            return (
              <li key={row.id}>
                <Card>
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold break-words">{s.title}</p>
                        {s.badge ? <Badge variant={s.badge.tone}>{s.badge.label}</Badge> : null}
                      </div>
                      {s.meta.length ? (
                        <p className="text-muted-foreground mt-0.5 text-sm break-words">
                          {s.meta.join(" · ")}
                        </p>
                      ) : null}
                      {s.dueOn ? (
                        <p
                          className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold ${overdue ? "text-destructive" : "text-primary"}`}
                        >
                          <CalendarClock className="size-4" aria-hidden />
                          {overdue ? "Overdue since" : "Due"} {formatDate(s.dueOn)}
                        </p>
                      ) : null}
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(row)}
                          aria-label={`Edit ${s.title}`}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleting(row)}
                          aria-label={`Delete ${s.title}`}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {limit && records.length > limit ? (
        <p className="text-muted-foreground text-sm">and {records.length - limit} earlier</p>
      ) : null}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing !== null ? (
          <DialogContent title={editing === "new" ? `Add ${ui.singular}` : `Edit ${ui.singular}`}>
            <RecordForm
              petId={petId}
              kind={kind}
              record={editing === "new" ? null : editing}
              weightUnit={weightUnit}
              onDone={() => setEditing(null)}
            />
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && (setDeleting(null), setError(null))}
      >
        {deleting ? (
          <DialogContent title={`Delete this ${ui.singular}?`} description="This can't be undone.">
            {error ? <p className="text-destructive mb-3 text-sm font-semibold">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                variant="urgent"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await deleteRecordAction(petId, kind, deleting.id);
                    if (r.ok) setDeleting(null);
                    else setError(r.message);
                  })
                }
              >
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
