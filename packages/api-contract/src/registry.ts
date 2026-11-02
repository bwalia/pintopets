import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

/** Single registry: each route module registers its paths on import. */
export const registry = new OpenAPIRegistry();
