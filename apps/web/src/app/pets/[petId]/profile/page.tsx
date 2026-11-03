import { Card, CardContent, CardHeader, CardTitle } from "@pintopets/ui/components/card";
import { PetForm } from "@/components/pets/pet-form";
import { StatusActions } from "@/components/pets/status-actions";
import { formatDate, formatHands } from "@/lib/format";
import { canEditPet } from "@/lib/pet-permissions";
import { requireUser } from "@/server/auth";
import { loadPetForPage, speciesOptions } from "@/server/pets/page-data";

export default async function ProfilePage({ params }: PageProps<"/pets/[petId]/profile">) {
  const user = await requireUser();
  const pet = await loadPetForPage(user, (await params).petId);
  const editable = canEditPet(pet);

  const details: [string, string | null][] = [
    [
      "Date of birth",
      pet.dateOfBirth
        ? `${formatDate(pet.dateOfBirth)}${pet.dateOfBirthIsEstimate ? " (estimated)" : ""}`
        : null,
    ],
    ["Colour and markings", pet.colourMarkings],
    ["Height", formatHands(pet.heightInches)],
    ["Passport", pet.passportNumber],
    [
      "Vet practice",
      [pet.vetPracticeName, pet.vetPracticePhone].filter(Boolean).join(" · ") || null,
    ],
    [
      "Insurance",
      [pet.insuranceProvider, pet.insurancePolicyRef].filter(Boolean).join(" · ") || null,
    ],
    [
      "Emergency contact",
      [pet.emergencyContactName, pet.emergencyContactPhone].filter(Boolean).join(" · ") || null,
    ],
  ];

  return (
    <div className="flex flex-col gap-8">
      {editable ? (
        <section aria-labelledby="edit-heading" className="max-w-2xl">
          <h2 id="edit-heading" className="text-h3 mb-4 font-sans font-semibold tracking-normal">
            Edit profile
          </h2>
          <PetForm species={await speciesOptions()} pet={pet} />
        </section>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-[12rem_1fr]">
              {details.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-semibold">{k}</dt>
                  <dd className="text-muted-foreground">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {pet.myRole === "owner" ? (
        <section aria-labelledby="manage-heading" className="max-w-2xl">
          <h2 id="manage-heading" className="text-h3 mb-3 font-sans font-semibold tracking-normal">
            Manage
          </h2>
          <StatusActions pet={pet} />
        </section>
      ) : null}
    </div>
  );
}
