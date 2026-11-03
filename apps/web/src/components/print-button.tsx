"use client";

import { Button } from "@pintopets/ui/components/button";
import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden /> {label}
    </Button>
  );
}
