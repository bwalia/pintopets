"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import type * as React from "react";
import { cn } from "../lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/**
 * Accessible modal (focus trap, Escape to close, labelled by its title).
 * On phones it opens as a bottom sheet; on wider screens, centred.
 */
export function DialogContent({
  className,
  children,
  title,
  description,
  closeLabel = "Close",
  ...props
}: React.ComponentProps<typeof D.Content> & {
  title: string;
  description?: string;
  closeLabel?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <D.Content
        className={cn(
          "bg-card text-card-foreground fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl border p-5 shadow-lg",
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          className,
        )}
        {...(description ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <D.Title className="text-h4 font-semibold">{title}</D.Title>
            {description ? (
              <D.Description className="text-muted-foreground mt-1 text-sm">
                {description}
              </D.Description>
            ) : null}
          </div>
          <D.Close
            className="hover:bg-muted -m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full"
            aria-label={closeLabel}
          >
            <X className="size-5" aria-hidden />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
