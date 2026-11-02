import { z } from "zod";
import { ApiError } from "../errors";
import { registry } from "../registry";

export const SpeciesGroup = z
  .enum([
    "dogs",
    "cats",
    "horses",
    "rabbits",
    "small_pets",
    "birds",
    "reptiles_amphibians",
    "fish",
    "farm",
    "other",
  ])
  .meta({ id: "SpeciesGroup" });

export const Breed = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    isMixedOrUnknown: z.boolean(),
  })
  .meta({ id: "Breed" });
export type Breed = z.infer<typeof Breed>;

export const Species = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    group: SpeciesGroup,
    tracksHeightInHands: z.boolean(),
    requiresFreeText: z.boolean(),
  })
  .meta({ id: "Species" });
export type Species = z.infer<typeof Species>;

export const SpeciesListResponse = z
  .object({ data: z.array(Species) })
  .meta({ id: "SpeciesListResponse" });
export type SpeciesListResponse = z.infer<typeof SpeciesListResponse>;

export const BreedListResponse = z
  .object({ data: z.array(Breed) })
  .meta({ id: "BreedListResponse" });
export type BreedListResponse = z.infer<typeof BreedListResponse>;

export const SpeciesSlugParams = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .meta({ example: "dog" }),
});

registry.registerPath({
  method: "get",
  path: "/api/v1/species",
  operationId: "listSpecies",
  tags: ["Reference data"],
  summary: "List supported species",
  security: [],
  responses: {
    200: {
      description: "Species",
      content: { "application/json": { schema: SpeciesListResponse } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/species/{slug}/breeds",
  operationId: "listBreeds",
  tags: ["Reference data"],
  summary: "List breeds for a species",
  description: 'Always includes a "Mixed / Unknown" option, listed last.',
  security: [],
  request: { params: SpeciesSlugParams },
  responses: {
    200: { description: "Breeds", content: { "application/json": { schema: BreedListResponse } } },
    404: { description: "Unknown species", content: { "application/json": { schema: ApiError } } },
  },
});
