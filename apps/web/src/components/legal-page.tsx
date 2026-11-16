import type { ReactNode } from "react";
import { formatPolicyDate, LEGAL } from "@/lib/legal";

/** Shared layout for the public policy pages (/privacy, /terms, /support). */
export function LegalPage({
  title,
  intro,
  updated = true,
  children,
}: {
  title: string;
  intro?: ReactNode;
  /** Show "Last updated". */
  updated?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="font-semibold">{title}</h1>
        {updated ? (
          <p className="text-muted-foreground mt-1 text-sm">Last updated {formatPolicyDate()}</p>
        ) : null}
        {intro ? <div className="mt-3">{intro}</div> : null}
      </header>
      {children}
    </article>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-2">
      <h2 className="text-h4 font-semibold">{title}</h2>
      <div className="[&_a]:text-primary flex flex-col gap-2 [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function ContactEmail() {
  return <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;
}
