import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../lib/utils";

export const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-xl border p-4 text-sm [&>svg]:mt-0.5 [&>svg]:size-5",
  {
    variants: {
      variant: {
        info: "bg-card border-border",
        /** Red-flag symptoms: "Contact a vet now". */
        urgent: "bg-urgent text-urgent-foreground border-urgent",
        warning: "bg-warning text-warning-foreground border-warning-foreground/20",
        success: "bg-success-soft text-success border-success/20",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

export interface AlertProps
  extends React.ComponentProps<"div">, VariantProps<typeof alertVariants> {}

/**
 * Urgent alerts use role="alert" so screen readers announce them immediately;
 * the rest use role="status" so they don't interrupt.
 */
export function Alert({ className, variant, role, ...props }: AlertProps) {
  return (
    <div
      role={role ?? (variant === "urgent" ? "alert" : "status")}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("col-start-2 font-semibold", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("col-start-2 [&_p]:leading-relaxed", className)} {...props} />;
}
