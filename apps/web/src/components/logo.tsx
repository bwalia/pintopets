/** Two-tone "pinto" mark: a paw print on a split circle. Decorative; the name is real text. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="inline-flex items-center gap-2">
        <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8 shrink-0">
          <circle cx="16" cy="16" r="16" className="fill-primary" />
          <path d="M16 0a16 16 0 0 1 0 32Z" className="fill-accent-foreground/80" />
          <g className="fill-primary-foreground">
            <ellipse cx="16" cy="20" rx="5" ry="4" />
            <circle cx="9.5" cy="14" r="2.2" />
            <circle cx="13.5" cy="10" r="2.2" />
            <circle cx="18.5" cy="10" r="2.2" />
            <circle cx="22.5" cy="14" r="2.2" />
          </g>
        </svg>
        <span className="font-display text-xl font-semibold tracking-tight">PintoPets</span>
      </span>
    </span>
  );
}
