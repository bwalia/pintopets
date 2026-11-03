import type { RecordKind } from "@pintopets/api-contract";
import { PrintButton } from "@/components/print-button";
import { petSubtitle } from "@/components/pets/pet-card";
import { formatDate, formatHands, formatWeight } from "@/lib/format";
import { RECORD_UI } from "@/lib/records-ui";
import { requireUser } from "@/server/auth";
import { loadPetForPage } from "@/server/pets/page-data";
import { listRecords } from "@/server/pets/records";
import { todayInLondon } from "@/server/pets/reminders";

const KINDS: RecordKind[] = [
  "conditions",
  "allergies",
  "medications",
  "vaccinations",
  "parasite-treatments",
  "vet-visits",
  "symptoms",
  "weights",
  "diet-items",
];

/**
 * A printable health summary to show a new vet. "Save as PDF" uses the
 * browser's print dialog, so it works on every phone and computer.
 */
export default async function SummaryPage({ params }: PageProps<"/pets/[petId]/summary">) {
  const user = await requireUser();
  const pet = await loadPetForPage(user, (await params).petId);
  const lists = await Promise.all(KINDS.map((k) => listRecords(user, pet.id, k)));

  const facts: [string, string | null][] = [
    ["Species and breed", petSubtitle(pet)],
    [
      "Date of birth",
      pet.dateOfBirth
        ? `${formatDate(pet.dateOfBirth)}${pet.dateOfBirthIsEstimate ? " (estimated)" : ""}`
        : null,
    ],
    [
      "Sex",
      pet.sex === "unknown"
        ? null
        : `${pet.sex === "male" ? "Male" : "Female"}${pet.neutered === "yes" ? ", neutered" : pet.neutered === "no" ? ", not neutered" : ""}`,
    ],
    ["Colour and markings", pet.colourMarkings],
    [
      "Latest weight",
      pet.latestWeight
        ? `${formatWeight(pet.latestWeight.grams)} (${formatDate(pet.latestWeight.measuredOn)})`
        : null,
    ],
    ["Height", formatHands(pet.heightInches)],
    ["Usual vet", [pet.vetPracticeName, pet.vetPracticePhone].filter(Boolean).join(", ") || null],
    [
      "Insurance",
      [pet.insuranceProvider, pet.insurancePolicyRef].filter(Boolean).join(", ") || null,
    ],
    ["Passport", pet.passportNumber],
  ];

  return (
    <article className="flex max-w-3xl flex-col gap-6 print:max-w-none print:text-[11pt]">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-muted-foreground text-sm">
          Print this page, or choose “Save as PDF” in the print dialog.
        </p>
        <PrintButton label="Print or save as PDF" />
      </div>

      <header>
        <h2 className="font-semibold">Health summary: {pet.name}</h2>
        <p className="text-muted-foreground text-sm">
          Created {formatDate(todayInLondon())} with PintoPets. Records entered by the owner.
        </p>
      </header>

      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[12rem_1fr]">
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

      {KINDS.map((kind, i) => {
        const rows = (lists[i] ?? []).slice(0, kind === "weights" || kind === "symptoms" ? 10 : 50);
        if (rows.length === 0) return null;
        const ui = RECORD_UI[kind];
        return (
          <section key={kind} className="break-inside-avoid-page">
            <h3 className="border-b pb-1 font-semibold">{ui.title}</h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {rows.map((r) => {
                const s = ui.summary(r);
                return (
                  <li key={r.id}>
                    <span className="font-semibold">{s.title}</span>
                    {s.badge ? ` (${s.badge.label})` : ""}
                    {s.meta.length ? ` — ${s.meta.join(" · ")}` : ""}
                    {s.dueOn ? ` — next due ${formatDate(s.dueOn)}` : ""}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="text-muted-foreground border-t pt-3 text-xs">
        This summary was written by the pet&apos;s owner and is not a veterinary record.
      </p>
    </article>
  );
}
