import type { Pet } from "@pintopets/api-contract";
import { cn } from "@pintopets/ui/lib/utils";

/** Profile photo, or the pet's initial on a two-tone "pinto" circle. */
export function PetAvatar({
  pet,
  size = "md",
  className,
}: {
  pet: Pick<Pet, "name" | "profilePhoto" | "status">;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims =
    size === "lg" ? "size-24 text-h2" : size === "md" ? "size-16 text-h3" : "size-10 text-base";
  return (
    <span
      className={cn(
        "border-card relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 shadow-sm",
        dims,
        pet.status === "deceased" && "grayscale",
        className,
      )}
    >
      {pet.profilePhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image
        <img src={pet.profilePhoto.thumbUrl} alt="" className="size-full object-cover" />
      ) : (
        <span
          aria-hidden
          className="bg-primary text-primary-foreground font-display flex size-full items-center justify-center bg-[linear-gradient(135deg,var(--primary)_55%,var(--accent-foreground)_55%)] font-semibold"
        >
          {pet.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
