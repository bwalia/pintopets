"use client";

import { Button } from "@pintopets/ui/components/button";
import { Dialog, DialogContent } from "@pintopets/ui/components/dialog";
import { Field } from "@pintopets/ui/components/field";
import { Textarea } from "@pintopets/ui/components/textarea";
import { Flag } from "lucide-react";
import { useState, useTransition } from "react";
import { reportAction } from "@/app/community/actions";

const REASONS = [
  { value: "spam", label: "Spam, scams or selling animals" },
  { value: "abuse", label: "Rude, hateful or harassing" },
  { value: "unsafe_advice", label: "Advice that could harm a pet" },
  { value: "animal_welfare", label: "An animal may be at risk" },
  { value: "off_topic", label: "Off topic" },
  { value: "other", label: "Something else" },
] as const;

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "thread" | "reply";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p role="status" className="text-muted-foreground px-2 text-sm">
        Reported. Thank you.
      </p>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag aria-hidden /> Report
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open ? (
          <DialogContent
            title="Report this post"
            description="Moderators review every report. If enough people report a post, it's hidden until they've looked."
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await reportAction({ targetType, targetId, reason, details });
                  if (r.ok) {
                    setOpen(false);
                    setDone(true);
                  } else setError(r.message);
                });
              }}
            >
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-semibold">What&apos;s wrong?</legend>
                {REASONS.map((r) => (
                  <label key={r.value} className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="size-4"
                    />
                    {r.label}
                  </label>
                ))}
              </fieldset>
              {reason === "animal_welfare" ? (
                <p className="bg-warning text-warning-foreground rounded-lg p-3 text-sm">
                  If an animal is in danger right now, call the RSPCA on 0300 1234 999 (England and
                  Wales), the Scottish SPCA on 03000 999 999, or the USPCA on 028 3025 1000.
                </p>
              ) : null}
              <Field
                id="report-details"
                label="Anything else moderators should know? (optional)"
                error={error ?? undefined}
              >
                <Textarea
                  id="report-details"
                  value={details}
                  maxLength={1000}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  Send report
                </Button>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
