import type * as React from "react";
import { cn } from "../lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "border-input bg-card placeholder:text-muted-foreground aria-invalid:border-destructive flex min-h-24 w-full rounded-lg border px-3 py-2.5 text-base disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
