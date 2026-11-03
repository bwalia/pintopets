import type { RecordKind } from "@pintopets/api-contract";
import { Alert, AlertDescription } from "@pintopets/ui/components/alert";
import { Info } from "lucide-react";
import { RecordSection } from "@/components/pets/record-section";
import { canAddRecord, canEditPet } from "@/lib/pet-permissions";
import { requireUser } from "@/server/auth";
import { loadPetForPage } from "@/server/pets/page-data";
import { listRecords } from "@/server/pets/records";
import { todayInLondon } from "@/server/pets/reminders";

const KINDS: RecordKind[] = ["diet-items", "diet-changes", "water-notes"];

export default async function DietPage({ params }: PageProps<"/pets/[petId]/diet">) {
  const user = await requireUser();
  const pet = await loadPetForPage(user, (await params).petId);
  const lists = await Promise.all(KINDS.map((k) => listRecords(user, pet.id, k)));
  const today = todayInLondon();
  return (
    <div className="flex flex-col gap-10">
      <Alert>
        <Info aria-hidden />
        <AlertDescription>
          <p>
            If {pet.name} has a medical condition, agree any diet change with your vet first. Change
            food gradually, over about a week.
          </p>
        </AlertDescription>
      </Alert>
      {KINDS.map((kind, i) => (
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
