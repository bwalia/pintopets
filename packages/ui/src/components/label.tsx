import type * as React from "react";
import { cn } from "../lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  // Generic wrapper: callers must pass `htmlFor` (or nest the control).
  return <label className={cn("text-sm leading-none font-semibold", className)} {...props} />;
}
