"use client";

import type { Photo } from "@pintopets/api-contract";
import { Badge } from "@pintopets/ui/components/badge";
import { Button } from "@pintopets/ui/components/button";
import { Dialog, DialogContent } from "@pintopets/ui/components/dialog";
import { Field } from "@pintopets/ui/components/field";
import { Input } from "@pintopets/ui/components/input";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import {
  deletePhotoAction,
  photosChangedAction,
  setProfilePhotoAction,
  updatePhotoAction,
} from "@/app/pets/actions";

const MAX_SIDE = 2560;

/**
 * Downscale in the browser before uploading: faster on mobile data and keeps
 * requests small. The server still re-encodes and strips all metadata.
 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2_000_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.88),
    );
  } catch {
    return file;
  }
}

export function PhotoGallery({
  petId,
  petName,
  photos,
  canEdit,
}: {
  petId: string;
  petName: string;
  photos: Photo[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const formId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [open, setOpen] = useState<Photo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPEG, PNG or WebP photo.");
      return;
    }
    setChosen(file);
    setPreview(URL.createObjectURL(file));
  }

  function upload(fd: FormData) {
    if (!chosen) return;
    startTransition(async () => {
      const body = new FormData();
      body.set("file", await shrink(chosen), "photo.jpg");
      body.set("caption", String(fd.get("caption") ?? ""));
      body.set("altText", String(fd.get("altText") ?? ""));
      const res = await fetch(`/api/v1/pets/${petId}/photos`, { method: "POST", body });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(json?.error?.message ?? "That upload didn't work. Please try again.");
        return;
      }
      setChosen(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      await photosChangedAction(petId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            id={`${formId}-file`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <Button asChild>
            <label htmlFor={`${formId}-file`} className="cursor-pointer">
              <ImagePlus aria-hidden /> Add photo
            </label>
          </Button>
          <p className="text-muted-foreground text-sm">
            JPEG, PNG or WebP. Location data is removed.
          </p>
          {error ? (
            <p role="alert" className="text-destructive w-full text-sm font-semibold">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {photos.length === 0 ? (
        <p className="text-muted-foreground bg-muted rounded-xl px-4 py-3 text-sm">
          No photos of {petName} yet.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <li key={p.id} className="relative">
              <button
                type="button"
                onClick={() => setOpen(p)}
                className="block aspect-square w-full overflow-hidden rounded-xl border"
                aria-label={`Open photo${p.caption ? `: ${p.caption}` : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked images; next/image would proxy them through the optimiser */}
                <img
                  src={p.thumbUrl}
                  alt={p.altText ?? `Photo of ${petName}`}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </button>
              {p.isProfile ? (
                <Badge className="absolute top-2 left-2" variant="secondary">
                  <Star aria-hidden /> Profile
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {/* New photo: caption + alt text before uploading */}
      <Dialog
        open={chosen !== null}
        onOpenChange={(o) => !o && (setChosen(null), setPreview(null))}
      >
        {chosen ? (
          <DialogContent
            title="Add photo"
            description="A short description helps people using screen readers."
          >
            <form
              onSubmit={(e) => (e.preventDefault(), upload(new FormData(e.currentTarget)))}
              className="flex flex-col gap-4"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview (blob: URL)
                <img
                  src={preview}
                  alt="Preview of the chosen photo"
                  className="max-h-64 w-full rounded-xl object-contain"
                />
              ) : null}
              <Field id={`${formId}-caption`} label="Caption (optional)">
                <Input id={`${formId}-caption`} name="caption" maxLength={300} />
              </Field>
              <Field
                id={`${formId}-alt`}
                label="Describe the photo"
                hint={`e.g. ${petName} asleep on the sofa`}
              >
                <Input
                  id={`${formId}-alt`}
                  name="altText"
                  maxLength={300}
                  aria-describedby={`${formId}-alt-hint`}
                />
              </Field>
              {error ? <p className="text-destructive text-sm font-semibold">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setChosen(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Uploading…" : "Upload"}
                </Button>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>

      {/* Lightbox */}
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {open ? (
          <DialogContent title={open.caption ?? `Photo of ${petName}`} className="sm:max-w-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image */}
            <img
              src={open.fullUrl}
              alt={open.altText ?? `Photo of ${petName}`}
              className="max-h-[60dvh] w-full rounded-xl object-contain"
            />
            {canEdit ? (
              <form
                className="mt-4 flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  startTransition(async () => {
                    await updatePhotoAction(open.id, {
                      caption: fd.get("caption"),
                      altText: fd.get("altText"),
                    });
                    setOpen(null);
                    router.refresh();
                  });
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id={`${formId}-ecap`} label="Caption">
                    <Input
                      id={`${formId}-ecap`}
                      name="caption"
                      defaultValue={open.caption ?? ""}
                      maxLength={300}
                    />
                  </Field>
                  <Field id={`${formId}-ealt`} label="Description">
                    <Input
                      id={`${formId}-ealt`}
                      name="altText"
                      defaultValue={open.altText ?? ""}
                      maxLength={300}
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="flex gap-2">
                    {!open.isProfile ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await setProfilePhotoAction(open.id);
                            setOpen(null);
                            router.refresh();
                          })
                        }
                      >
                        <Star aria-hidden /> Use as profile photo
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await deletePhotoAction(petId, open.id);
                          setOpen(null);
                          router.refresh();
                        })
                      }
                    >
                      <Trash2 aria-hidden /> Delete
                    </Button>
                  </div>
                  <Button type="submit" disabled={pending}>
                    Save
                  </Button>
                </div>
              </form>
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
