"use client";

import type { Pet } from "@pintopets/api-contract";
import { Button } from "@pintopets/ui/components/button";
import { Dialog, DialogContent } from "@pintopets/ui/components/dialog";
import { Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { Archive, ArchiveRestore, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeStatusAction } from "@/app/pets/actions";

/** Owner-only: archive, restore, or remember a pet who has passed away. */
export function StatusActions({ pet }: { pet: Pick<Pet, "id" | "name" | "status"> }) {
  const router = useRouter();
  const [memorialOpen, setMemorialOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(status: Pet["status"], deceasedOn: string | null = null) {
    startTransition(async () => {
      const r = await changeStatusAction(pet.id, { status, deceasedOn });
      if (!r.ok) return setError(r.fieldErrors.deceasedOn ?? r.message);
      setMemorialOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && !memorialOpen ? (
        <p role="alert" className="text-destructive text-sm font-semibold">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {pet.status === "active" ? (
          <>
            <Button variant="outline" disabled={pending} onClick={() => change("archived")}>
              <Archive aria-hidden /> Archive
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setMemorialOpen(true)}
              className="h-auto min-h-11 max-w-full py-2 text-left whitespace-normal"
            >
              <Heart aria-hidden /> {pet.name} has passed away
            </Button>
          </>
        ) : (
          <Button variant="outline" disabled={pending} onClick={() => change("active")}>
            <ArchiveRestore aria-hidden />{" "}
            {pet.status === "archived" ? "Restore to My Pets" : "Undo memorial mode"}
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        Archiving hides a pet from your list (for example, after rehoming). Nothing is deleted.
      </p>

      <Dialog open={memorialOpen} onOpenChange={setMemorialOpen}>
        <DialogContent
          title={`We're so sorry about ${pet.name}`}
          description={`${pet.name}'s records and photos will be kept, read-only, and there will be no more reminders. You can undo this.`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              change("deceased", String(new FormData(e.currentTarget).get("deceasedOn") ?? ""));
            }}
            className="flex flex-col gap-4"
          >
            <Field id="deceasedOn" label="Date" error={error ?? undefined}>
              <Input
                id="deceasedOn"
                name="deceasedOn"
                type="date"
                max={new Date().toLocaleDateString("en-CA")}
                defaultValue={new Date().toLocaleDateString("en-CA")}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMemorialOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Keep their memory
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
