import { PhotoGallery } from "@/components/pets/photo-gallery";
import { canEditPet } from "@/lib/pet-permissions";
import { requireUser } from "@/server/auth";
import { listPhotos } from "@/server/media/photos";
import { loadPetForPage } from "@/server/pets/page-data";

export default async function PhotosPage({ params }: PageProps<"/pets/[petId]/photos">) {
  const user = await requireUser();
  const pet = await loadPetForPage(user, (await params).petId);
  return (
    <PhotoGallery
      petId={pet.id}
      petName={pet.name}
      photos={await listPhotos(user, pet.id)}
      canEdit={canEditPet(pet)}
    />
  );
}
