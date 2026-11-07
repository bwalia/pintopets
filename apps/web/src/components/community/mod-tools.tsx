"use client";

import { Button } from "@pintopets/ui/components/button";
import { EyeOff, Lock, LockOpen, Pin, PinOff, RotateCcw, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moderateAction } from "@/app/community/actions";

type Action = "hide" | "restore" | "remove" | "dismiss" | "lock" | "unlock" | "pin" | "unpin";

/** Moderator buttons shown on a thread or reply. Every action is logged. */
export function ModTools({
  targetType,
  targetId,
  status,
  isLocked,
  isPinned,
}: {
  targetType: "thread" | "reply";
  targetId: string;
  status: "visible" | "hidden" | "removed";
  isLocked?: boolean;
  isPinned?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (action: Action) =>
    start(async () => {
      const reason =
        action === "hide" || action === "remove" ? window.prompt("Reason (logged)") : null;
      if ((action === "hide" || action === "remove") && reason === null) return;
      const r = await moderateAction({ targetType, targetId, action, reason });
      if (r.ok) router.refresh();
      else setError(r.message);
    });

  return (
    <div
      className="bg-muted/50 flex flex-wrap items-center gap-1 rounded-lg p-1"
      aria-label="Moderator tools"
      role="group"
    >
      <Shield className="text-muted-foreground mx-1 size-4" aria-hidden />
      {status === "visible" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("hide")}>
          <EyeOff aria-hidden /> Hide
        </Button>
      ) : (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("restore")}>
          <RotateCcw aria-hidden /> Restore
        </Button>
      )}
      {targetType === "thread" ? (
        <>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => act(isLocked ? "unlock" : "lock")}
          >
            {isLocked ? <LockOpen aria-hidden /> : <Lock aria-hidden />}{" "}
            {isLocked ? "Unlock" : "Lock"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => act(isPinned ? "unpin" : "pin")}
          >
            {isPinned ? <PinOff aria-hidden /> : <Pin aria-hidden />} {isPinned ? "Unpin" : "Pin"}
          </Button>
        </>
      ) : null}
      {error ? (
        <span role="alert" className="text-destructive px-2 text-xs font-semibold">
          {error}
        </span>
      ) : null}
    </div>
  );
}
