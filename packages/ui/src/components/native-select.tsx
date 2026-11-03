import { ChevronDown } from "lucide-react";
import type * as React from "react";
import { cn } from "../lib/utils";

/** Styled native <select>: best accessibility and the phone's own picker. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "border-input bg-card aria-invalid:border-destructive flex h-11 w-full appearance-none rounded-lg border pr-10 pl-3 text-base disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  );
}
