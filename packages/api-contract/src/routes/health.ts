import { z } from "zod";
import { ApiError } from "../errors";
import { registry } from "../registry";

export const HealthResponse = z
  .object({
    status: z.enum(["ok", "degraded"]),
    /** Image tag (short Git SHA). Ring Promoter checks this after each deploy. */
    version: z.string(),
    env: z.enum(["local", "int", "test", "acc", "prod"]),
    time: z.iso.datetime(),
    checks: z.object({
      /** OpsAPI holds PintoPets' data. */
      opsapi: z.enum(["ok", "error"]),
    }),
  })
  .meta({ id: "HealthResponse" });
export type HealthResponse = z.infer<typeof HealthResponse>;

registry.registerPath({
  method: "get",
  path: "/api/v1/health",
  operationId: "getHealth",
  tags: ["System"],
  summary: "Service health",
  description:
    "Returns 200 when the API and OpsAPI (where the data lives) are reachable, 503 otherwise.",
  security: [],
  responses: {
    200: { description: "Healthy", content: { "application/json": { schema: HealthResponse } } },
    503: {
      description: "OpsAPI unreachable",
      content: { "application/json": { schema: HealthResponse } },
    },
    500: { description: "Unexpected error", content: { "application/json": { schema: ApiError } } },
  },
});
