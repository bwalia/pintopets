import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";
// Route modules register their paths as a side effect of being imported.
import "./routes/health";
import "./routes/reference";
import "./routes/pets";
import "./routes/records";
import "./routes/community";
import "./routes/auth";

export interface OpenApiOptions {
  serverUrl: string;
  version: string;
}

export function generateOpenApiDocument({ serverUrl, version }: OpenApiOptions) {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "PintoPets API",
      version,
      description:
        "Versioned API used by the PintoPets web dashboard and the iOS app (bearer tokens from POST /api/v1/auth/token). " +
        "Errors always use `{ error: { code, message, details } }`.",
    },
    servers: [{ url: serverUrl }],
  });
}
