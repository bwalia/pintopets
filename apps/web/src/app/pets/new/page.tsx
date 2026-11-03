import type { Metadata } from "next";
import { PetForm } from "@/components/pets/pet-form";
import { SignedOut } from "@/components/signed-out";
import { currentUser } from "@/server/auth";
import { speciesOptions } from "@/server/pets/page-data";

export const metadata: Metadata = { title: "Add a pet" };

export default async function NewPetPage() {
  const user = await currentUser();
  if (!user) return <SignedOut title="Add a pet" />;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-semibold">Add a pet</h1>
      <p className="text-muted-foreground mt-1 mb-6">
        Only the name and species are needed. You can add the rest any time.
      </p>
      <PetForm species={await speciesOptions()} />
    </div>
  );
}
