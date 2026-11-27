/** Shared helpers and types for the demo seed (seed-demo.ts, seed-more.ts). */
import type { PetInput } from "@pintopets/api-contract";
import type { Actor } from "@/server/auth";
import type { createRecord } from "@/server/pets/records";

export type Who = Pick<Actor, "id" | "role" | "displayName">;

/** Fixed ids so re-running replaces the same community members. */
export const member = (n: number, displayName: string): Who => ({
  id: `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  role: "owner",
  displayName,
});

/** yyyy-mm-dd, `days` from today (negative = in the past). */
export function day(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}
export const years = (n: number) => day(-Math.round(n * 365.25));
/** ISO timestamp `days` ago (for symptoms). */
export const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export type SeedRecord = [kind: Parameters<typeof createRecord>[2], input: Record<string, unknown>];

export interface SeedPet {
  input: PetInput;
  photos: { file: string; caption: string; altText: string }[];
  records: SeedRecord[];
  deceasedOn?: string;
  archived?: true;
}

export interface SeedThread {
  author: Who;
  input: Record<string, unknown>;
  replies: { author: Who; body: string; votes?: Who[]; accepted?: true }[];
  votes?: Who[];
}

export const vet = {
  vetPracticeName: "Riverside Veterinary Centre",
  vetPracticePhone: "020 7946 0321",
};
export const emergency = {
  emergencyContactName: "Priya Patel",
  emergencyContactPhone: "07700 900123",
};

/** Monthly-ish weigh-ins following a curve. */
export function weighIns(points: [daysAgo: number, grams: number][], note?: [number, string]) {
  return points.map(([daysAgo, grams]): SeedRecord => [
    "weights",
    {
      measuredOn: day(-daysAgo),
      weightGrams: grams,
      notes: note?.[0] === daysAgo ? note[1] : null,
    },
  ]);
}

/** Community members (int and local only, never prod). Each has a household too. */
export const priya = member(1, "Priya R");
export const tom = member(2, "Tom the horse guy");
export const sarah = member(3, "Sarah (RVN)");
export const dan = member(4, "Dan W");
export const megan = member(5, "Megan and Pickle");
export const oliver = member(6, "Oliver K");
export const aisha = member(7, "Aisha B");
export const jamie = member(8, "Jamie the dog walker");
export const grace = member(9, "Grace (hens and ducks)");
export const ravi = member(10, "Ravi S");
export const hannah = member(11, "Hannah, exotics nurse");
export const callum = member(12, "Callum M");
export const members = [
  priya,
  tom,
  sarah,
  dan,
  megan,
  oliver,
  aisha,
  jamie,
  grace,
  ravi,
  hannah,
  callum,
];
