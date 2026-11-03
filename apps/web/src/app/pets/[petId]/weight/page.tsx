import { Card, CardContent, CardHeader, CardTitle } from "@pintopets/ui/components/card";
import { RecordSection } from "@/components/pets/record-section";
import { WeightChart } from "@/components/pets/weight-chart";
import { canAddRecord, canEditPet, weightUnitFor } from "@/lib/pet-permissions";
import { requireUser } from "@/server/auth";
import { loadPetForPage } from "@/server/pets/page-data";
import { listRecords } from "@/server/pets/records";
import { todayInLondon } from "@/server/pets/reminders";

export default async function WeightPage({ params }: PageProps<"/pets/[petId]/weight">) {
  const user = await requireUser();
  const pet = await loadPetForPage(user, (await params).petId);
  const weights = await listRecords(user, pet.id, "weights");
  const unit = weightUnitFor(pet.species.group);
  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Weight over time</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightChart
            unit={unit}
            points={weights.map((w) => ({
              measuredOn: String(w.measuredOn),
              grams: Number(w.weightGrams),
            }))}
          />
        </CardContent>
      </Card>
      <RecordSection
        petId={pet.id}
        kind="weights"
        records={weights}
        canEdit={canEditPet(pet)}
        canAdd={canAddRecord(pet, "weights")}
        weightUnit={unit}
        todayIso={todayInLondon()}
      />
    </div>
  );
}
