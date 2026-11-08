import { FORUM_CATEGORIES, ThreadListQuery } from "@pintopets/api-contract";
import { Alert, AlertDescription } from "@pintopets/ui/components/alert";
import { Button } from "@pintopets/ui/components/button";
import { Input } from "@pintopets/ui/components/input";
import { NativeSelect } from "@pintopets/ui/components/native-select";
import { cn } from "@pintopets/ui/lib/utils";
import { MessagesSquare, Plus, Search, ShieldCheck } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ThreadCard } from "@/components/community/thread-card";
import { currentUser } from "@/server/auth";
import { isSuspended } from "@/server/community/rules";
import { communityProfile, listThreads } from "@/server/community/service";
import { allSpecies } from "@/server/reference-data";

export const metadata: Metadata = {
  title: "Community",
  description: "Ask other pet owners, share what worked, and help someone else's pet.",
};

const SORTS = [
  { value: "latest", label: "Latest" },
  { value: "top", label: "Most helpful" },
  { value: "unanswered", label: "Unanswered" },
  { value: "new", label: "Newest" },
] as const;

type Q = { category?: string; species?: string; q?: string; sort?: string; page?: number };

function href(base: Q, change: Q): Route {
  const merged = { ...base, ...change };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (
      v !== undefined &&
      v !== "" &&
      !(k === "sort" && v === "latest") &&
      !(k === "page" && v === 1)
    )
      sp.set(k, String(v));
  }
  const s = sp.toString();
  return (s ? `/community?${s}` : "/community") as Route;
}

export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const raw = await searchParams;
  const parsed = ThreadListQuery.safeParse(
    Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string" && v !== "")),
  );
  const query = parsed.success ? parsed.data : ThreadListQuery.parse({});
  const user = await currentUser();
  const [threads, profile] = await Promise.all([
    listThreads(user, query),
    user ? communityProfile(user) : null,
  ]);
  const species = allSpecies();
  const speciesName = (slug: string | null) => species.find((s) => s.slug === slug)?.name ?? null;
  const base: Q = {
    category: query.category,
    species: query.species,
    q: query.q,
    sort: query.sort,
  };
  const startHref = (
    query.category ? `/community/new?category=${query.category}` : "/community/new"
  ) as Route;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-semibold">Community</h1>
          <p className="text-muted-foreground mt-1">
            Ask other pet owners, share what worked, and help someone else&apos;s pet.
          </p>
        </div>
        <Button asChild>
          {user ? (
            <Link href={startHref}>
              <Plus aria-hidden /> Start a discussion
            </Link>
          ) : (
            <a href="/auth/signin?next=%2Fcommunity%2Fnew">
              <Plus aria-hidden /> Start a discussion
            </a>
          )}
        </Button>
      </div>

      {profile && isSuspended(profile.suspendedUntil) ? (
        <Alert variant="warning">
          <AlertDescription>
            Your community account is paused until{" "}
            {new Date(profile.suspendedUntil ?? "").toLocaleDateString("en-GB")}. You can still read
            discussions.
          </AlertDescription>
        </Alert>
      ) : null}

      <form action="/community" className="flex flex-col gap-2 sm:flex-row" role="search">
        {query.category ? <input type="hidden" name="category" value={query.category} /> : null}
        <label htmlFor="q" className="sr-only">
          Search the community
        </label>
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder="Search questions, e.g. itchy ears"
            className="pl-9"
            maxLength={200}
          />
        </div>
        <label htmlFor="species" className="sr-only">
          Kind of animal
        </label>
        <NativeSelect
          id="species"
          name="species"
          defaultValue={query.species ?? ""}
          className="sm:w-48"
        >
          <option value="">All animals</option>
          {species.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <nav
        aria-label="Topics"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {[{ slug: undefined, name: "All topics" }, ...FORUM_CATEGORIES].map((c) => {
          const active = query.category === c.slug;
          return (
            <Link
              key={c.slug ?? "all"}
              href={href(base, { category: c.slug, page: 1 })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {c.name}
            </Link>
          );
        })}
      </nav>

      <nav aria-label="Sort discussions" className="flex gap-1 overflow-x-auto border-b">
        {SORTS.map((s) => (
          <Link
            key={s.value}
            href={href(base, { sort: s.value, page: 1 })}
            aria-current={query.sort === s.value ? "page" : undefined}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap",
              query.sort === s.value
                ? "border-primary text-primary"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      {query.category ? (
        <p className="text-muted-foreground -mt-2 text-sm">
          {FORUM_CATEGORIES.find((c) => c.slug === query.category)?.description}
        </p>
      ) : null}

      {threads.data.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border px-6 py-12 text-center">
          <MessagesSquare className="text-primary size-10" aria-hidden />
          <p className="text-h4 font-semibold">
            {query.q ? "No discussions match" : "No discussions yet"}
          </p>
          <p className="text-muted-foreground max-w-md">
            {query.q
              ? "Try different words, or ask the community yourself."
              : "Be the first to ask a question or share some advice."}
          </p>
          <Button asChild className="mt-2">
            {user ? (
              <Link href={startHref}>
                <Plus aria-hidden /> Start a discussion
              </Link>
            ) : (
              <a href="/auth/signin?next=%2Fcommunity%2Fnew">
                <Plus aria-hidden /> Start a discussion
              </a>
            )}
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.data.map((t) => (
            <li key={t.id}>
              <ThreadCard thread={t} speciesName={speciesName(t.speciesSlug)} />
            </li>
          ))}
        </ul>
      )}

      {threads.meta.totalPages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-between gap-2">
          {threads.meta.page > 1 ? (
            <Button asChild variant="outline">
              <Link href={href(base, { page: threads.meta.page - 1 })}>Previous</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground text-sm">
            Page {threads.meta.page} of {threads.meta.totalPages}
          </span>
          {threads.meta.page < threads.meta.totalPages ? (
            <Button asChild variant="outline">
              <Link href={href(base, { page: threads.meta.page + 1 })}>Next</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        <span>
          A safe, kind space: read the{" "}
          <Link href="/community/guidelines" className="text-primary underline underline-offset-2">
            community guidelines
          </Link>
          . Community advice isn&apos;t a substitute for a vet.
        </span>
      </p>
    </div>
  );
}
