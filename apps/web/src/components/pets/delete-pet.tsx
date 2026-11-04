"use client";

import { Button } from "@pintopets/ui/components/button";
import { Dialog, DialogContent } from "@pintopets/ui/components/dialog";
import { Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deletePetAction } from "@/app/pets/actions";
import { useStepUp } from "@/components/account/step-up";

/** Owner only. Type the name to confirm, then an authenticator code (step-up). */
export function DeletePet({ petId, petName }: { petId: string; petName: string }) {
  const router = useRouter();
  const { withStepUp, dialog, pending } = useStepUp();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <p className="text-sm font-semibold">Delete permanently</p>
      <p className="text-muted-foreground text-sm">
        Removes {petName}, every record and every photo. This can&apos;t be undone. If you just want
        to hide {petName}, archive instead.
      </p>
      <Button
        variant="ghost"
        className="text-destructive h-auto min-h-11 w-fit max-w-full py-2 text-left whitespace-normal"
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden /> Delete {petName}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open ? (
          <DialogContent
            title={`Delete ${petName} permanently?`}
            description="All records and photos will be deleted. You'll be asked for your authenticator code."
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                void withStepUp(() => deletePetAction(petId)).then((r) => {
                  if (r.ok) {
                    setOpen(false);
                    router.push("/pets");
                    router.refresh();
                  } else if (r.message && r.message !== "Cancelled") setError(r.message);
                });
              }}
            >
              <Field
                id="confirm-name"
                label={`Type ${petName} to confirm`}
                error={error ?? undefined}
              >
                <Input
                  id="confirm-name"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="urgent"
                  disabled={pending || typed.trim() !== petName}
                >
                  Delete permanently
                </Button>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
      {dialog}
    </div>
  );
}
