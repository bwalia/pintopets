import type { Pet, RecordKind } from "@pintopets/api-contract";

/** Record kinds a carer (e.g. a pet sitter) may add. Mirrors the server's RECORDS config (tested). */
export const CARER_KINDS: readonly RecordKind[] = [
  "weights",
  "parasite-treatments",
  "symptoms",
  "diet-changes",
  "water-notes",
];

export function canEditPet(pet: Pick<Pet, "myRole" | "status">): boolean {
  return pet.status !== "deceased" && (pet.myRole === "owner" || pet.myRole === "co_owner");
}

export function canAddRecord(pet: Pick<Pet, "myRole" | "status">, kind: RecordKind): boolean {
  if (pet.status === "deceased") return false;
  return canEditPet(pet) || CARER_KINDS.includes(kind);
}

/** Small animals are weighed in grams by default. */
export function weightUnitFor(group: Pet["species"]["group"]): "kg" | "g" {
  return group === "small_pets" ||
    group === "birds" ||
    group === "reptiles_amphibians" ||
    group === "fish"
    ? "g"
    : "kg";
}
