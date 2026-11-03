import { z } from "zod";
import { IsoDate, OptionalIsoDate, optionalText, Uuid } from "../common";
import { ApiError } from "../errors";
import { registry } from "../registry";
import { SpeciesGroup } from "./reference";

export const PetSex = z.enum(["male", "female", "unknown"]).meta({ id: "PetSex" });
export const NeuteredStatus = z.enum(["yes", "no", "unknown"]).meta({ id: "NeuteredStatus" });
export const PetStatus = z
  .enum(["active", "archived", "deceased"])
  .meta({ id: "PetStatus", description: "deceased = memorial mode (read-only)." });
export const PetMemberRole = z.enum(["owner", "co_owner", "carer"]).meta({ id: "PetMemberRole" });

const slug = z.string().regex(/^[a-z0-9-]{1,60}$/);

export const PetInput = z
  .object({
    name: z.string().trim().min(1, "Please enter a name").max(60),
    speciesSlug: slug,
    speciesOther: optionalText(60),
    /** Main breed first, optional second ("crossed with"). */
    breedSlugs: z.array(slug).max(2).default([]),
    sex: PetSex.default("unknown"),
    neutered: NeuteredStatus.default("unknown"),
    dateOfBirth: OptionalIsoDate,
    dateOfBirthIsEstimate: z.boolean().default(false),
    colourMarkings: optionalText(200),
    /** Horses only: height in inches (15.2 hh = 62). */
    heightInches: z.number().int().min(20).max(90).nullish(),
    passportNumber: optionalText(60),
    insuranceProvider: optionalText(100),
    insurancePolicyRef: optionalText(100),
    vetPracticeName: optionalText(120),
    vetPracticePhone: optionalText(40),
    emergencyContactName: optionalText(100),
    emergencyContactPhone: optionalText(40),
    notes: optionalText(4000),
  })
  .meta({ id: "PetInput" });
export type PetInput = z.input<typeof PetInput>;
export type PetInputParsed = z.output<typeof PetInput>;

export const PetUpdate = PetInput.partial().meta({ id: "PetUpdate" });
export type PetUpdateParsed = z.output<typeof PetUpdate>;

export const PetStatusChange = z
  .object({
    status: PetStatus,
    /** Required when status is "deceased". */
    deceasedOn: OptionalIsoDate,
  })
  .refine((v) => v.status !== "deceased" || v.deceasedOn, {
    message: "Please add the date",
    path: ["deceasedOn"],
  })
  .meta({ id: "PetStatusChange" });

export const Pet = z
  .object({
    id: Uuid,
    name: z.string(),
    species: z.object({
      slug: z.string(),
      name: z.string(),
      group: SpeciesGroup,
      tracksHeightInHands: z.boolean(),
    }),
    speciesOther: z.string().nullable(),
    breeds: z.array(z.object({ slug: z.string(), name: z.string() })),
    sex: PetSex,
    neutered: NeuteredStatus,
    dateOfBirth: IsoDate.nullable(),
    dateOfBirthIsEstimate: z.boolean(),
    colourMarkings: z.string().nullable(),
    heightInches: z.number().int().nullable(),
    passportNumber: z.string().nullable(),
    insuranceProvider: z.string().nullable(),
    insurancePolicyRef: z.string().nullable(),
    vetPracticeName: z.string().nullable(),
    vetPracticePhone: z.string().nullable(),
    emergencyContactName: z.string().nullable(),
    emergencyContactPhone: z.string().nullable(),
    notes: z.string().nullable(),
    status: PetStatus,
    deceasedOn: IsoDate.nullable(),
    profilePhoto: z
      .object({ id: Uuid, thumbUrl: z.string(), altText: z.string().nullable() })
      .nullable(),
    latestWeight: z.object({ grams: z.number().int(), measuredOn: IsoDate }).nullable(),
    myRole: PetMemberRole,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "Pet" });
export type Pet = z.infer<typeof Pet>;

export const PetListQuery = z.object({
  status: PetStatus.default("active"),
});

export const PetListResponse = z.object({ data: z.array(Pet) }).meta({ id: "PetListResponse" });
export const PetResponse = z.object({ data: Pet }).meta({ id: "PetResponse" });

export const Photo = z
  .object({
    id: Uuid,
    petId: Uuid,
    caption: z.string().nullable(),
    altText: z.string().nullable(),
    width: z.number().int().nullable(),
    height: z.number().int().nullable(),
    thumbUrl: z.string(),
    fullUrl: z.string(),
    isProfile: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Photo" });
export type Photo = z.infer<typeof Photo>;

export const PhotoUpdate = z
  .object({ caption: optionalText(300), altText: optionalText(300) })
  .meta({ id: "PhotoUpdate" });

export const PhotoListResponse = z
  .object({ data: z.array(Photo) })
  .meta({ id: "PhotoListResponse" });
export const PhotoResponse = z.object({ data: Photo }).meta({ id: "PhotoResponse" });

export const ReminderState = z
  .enum(["overdue", "due_soon", "upcoming"])
  .meta({ id: "ReminderState" });
export const Reminder = z
  .object({
    petId: Uuid,
    petName: z.string(),
    kind: z.enum([
      "vaccination",
      "parasite_treatment",
      "horse_care",
      "medication_end",
      "vet_follow_up",
    ]),
    recordId: Uuid,
    title: z.string(),
    dueOn: IsoDate,
    state: ReminderState,
    daysUntil: z.number().int(),
  })
  .meta({ id: "Reminder" });
export type Reminder = z.infer<typeof Reminder>;
export const ReminderListResponse = z
  .object({ data: z.array(Reminder) })
  .meta({ id: "ReminderListResponse" });

export const Me = z
  .object({
    id: Uuid,
    displayName: z.string(),
    email: z.string(),
    role: z.enum(["owner", "professional", "moderator", "admin"]),
    demo: z
      .boolean()
      .meta({ description: "True while sign-in runs in demo mode (int/local only)." }),
  })
  .meta({ id: "Me" });
export const MeResponse = z.object({ data: Me }).meta({ id: "MeResponse" });

// ── OpenAPI ────────────────────────────────────────────────────────────────
const json = <T extends z.ZodType>(schema: T) => ({ content: { "application/json": { schema } } });
const errors = {
  401: { description: "Not signed in", ...json(ApiError) },
  403: { description: "No access to this pet", ...json(ApiError) },
  404: { description: "Not found", ...json(ApiError) },
  422: { description: "Validation failed", ...json(ApiError) },
};
const PetIdParams = z.object({ petId: Uuid });
const tags = ["Pets"];

registry.registerPath({
  method: "get",
  path: "/api/v1/me",
  operationId: "getMe",
  tags: ["Account"],
  summary: "The signed-in user",
  responses: { 200: { description: "Me", ...json(MeResponse) }, 401: errors[401] },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/pets",
  operationId: "listPets",
  tags,
  summary: "Pets the user is a member of",
  request: { query: PetListQuery },
  responses: { 200: { description: "Pets", ...json(PetListResponse) }, 401: errors[401] },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/pets",
  operationId: "createPet",
  tags,
  summary: "Add a pet (the caller becomes its owner)",
  request: { body: json(PetInput) },
  responses: {
    201: { description: "Created", ...json(PetResponse) },
    401: errors[401],
    422: errors[422],
  },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/pets/{petId}",
  operationId: "getPet",
  tags,
  request: { params: PetIdParams },
  responses: { 200: { description: "Pet", ...json(PetResponse) }, ...errors },
});
registry.registerPath({
  method: "patch",
  path: "/api/v1/pets/{petId}",
  operationId: "updatePet",
  tags,
  summary: "Edit a pet (owner or co-owner)",
  request: { params: PetIdParams, body: json(PetUpdate) },
  responses: { 200: { description: "Updated", ...json(PetResponse) }, ...errors },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/pets/{petId}/status",
  operationId: "changePetStatus",
  tags,
  summary: "Archive, restore, or mark as passed away (owner only)",
  request: { params: PetIdParams, body: json(PetStatusChange) },
  responses: { 200: { description: "Updated", ...json(PetResponse) }, ...errors },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/pets/{petId}/photos",
  operationId: "listPhotos",
  tags: ["Photos"],
  request: { params: PetIdParams },
  responses: { 200: { description: "Photos", ...json(PhotoListResponse) }, ...errors },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/pets/{petId}/photos",
  operationId: "uploadPhoto",
  tags: ["Photos"],
  summary: "Upload a photo (JPEG, PNG or WebP, max 15 MB). Re-encoded; EXIF/GPS removed.",
  request: {
    params: PetIdParams,
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.string().meta({ format: "binary" }),
            caption: z.string().optional(),
            altText: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Uploaded", ...json(PhotoResponse) },
    413: { description: "Too large", ...json(ApiError) },
    415: { description: "Not an image", ...json(ApiError) },
    ...errors,
  },
});
registry.registerPath({
  method: "patch",
  path: "/api/v1/photos/{id}",
  operationId: "updatePhoto",
  tags: ["Photos"],
  request: { params: z.object({ id: Uuid }), body: json(PhotoUpdate) },
  responses: { 200: { description: "Updated", ...json(PhotoResponse) }, ...errors },
});
registry.registerPath({
  method: "delete",
  path: "/api/v1/photos/{id}",
  operationId: "deletePhoto",
  tags: ["Photos"],
  request: { params: z.object({ id: Uuid }) },
  responses: { 204: { description: "Deleted" }, ...errors },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/photos/{id}/profile",
  operationId: "setProfilePhoto",
  tags: ["Photos"],
  summary: "Use this photo as the pet's profile photo",
  request: { params: z.object({ id: Uuid }) },
  responses: { 200: { description: "Updated", ...json(PetResponse) }, ...errors },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/photos/{id}/file",
  operationId: "getPhotoFile",
  tags: ["Photos"],
  summary: "Photo bytes (private; members of the pet only)",
  request: {
    params: z.object({ id: Uuid }),
    query: z.object({ variant: z.enum(["thumb", "full"]).default("full") }),
  },
  responses: {
    200: {
      description: "Image",
      content: { "image/webp": { schema: z.string().meta({ format: "binary" }) } },
    },
    ...errors,
  },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/reminders",
  operationId: "listReminders",
  tags: ["Reminders"],
  summary: "Overdue and upcoming care across the user's active pets",
  responses: { 200: { description: "Reminders", ...json(ReminderListResponse) }, 401: errors[401] },
});
