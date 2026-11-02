import { generateOpenApiDocument } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { appVersion } from "@/lib/version";

/** OpenAPI 3.1 spec, used to generate the Swift and Kotlin clients (Phase 2). */
export function GET() {
  const doc = generateOpenApiDocument({ serverUrl: env().APP_URL, version: appVersion() });
  return NextResponse.json(doc, { headers: { "Cache-Control": "public, max-age=300" } });
}
