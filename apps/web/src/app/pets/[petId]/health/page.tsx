import type { RecordKind } from "@pintopets/api-contract";
import { RecordSection } from "@/components/pets/record-section";
import { canAddRecord, canEditPet } from "@/lib/pet-permissions";
import { requireUser } from "@/server/auth";
import { loadPetForPage } from "@/server/pets/page-data";
import { listRecords } from "@/server/pets/records";
import { todayInLondon } from "@/server/pets/reminders";

export default async function HealthPage({ params }: PageProps<"/pets/[petId]/health">) {
  const user = await requireUser();
  const pet = await loadPetForPage(user, (await params).petId);
  const kinds: RecordKind[] = [
    "symptoms",
    "vaccinations",
    "parasite-treatments",
    "medications",
    "vet-visits",
    "conditions",
    "allergies",
    ...(pet.species.tracksHeightInHands ? (["horse-care"] as const) : []),
  ];
  const lists = await Promise.all(kinds.map((k) => listRecords(user, pet.id, k)));
  const today = todayInLondon();
  return (
    <div className="flex flex-col gap-10">
      {kinds.map((kind, i) => (
        <RecordSection
          key={kind}
          petId={pet.id}
          kind={kind}
          records={lists[i] ?? []}
          canEdit={canEditPet(pet)}
          canAdd={canAddRecord(pet, kind)}
          todayIso={today}
        />
      ))}
    </div>
  );
}
