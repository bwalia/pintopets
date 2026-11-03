#!/usr/bin/env node
// Generates TypeScript types for PintoPets' OpsAPI plugin endpoints only
// (/api/v2/pintopets/*), from a running OpsAPI's /openapi.json.
//
//   pnpm opsapi:up && pnpm opsapi:types
//
// Output: apps/web/src/server/opsapi/pintopets.d.ts (committed).
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const url = process.env.OPSAPI_OPENAPI_URL ?? "http://localhost:4042/openapi.json";
const res = await fetch(url);
if (!res.ok)
  throw new Error(`GET ${url} → ${res.status}. Is the local OpsAPI up (pnpm opsapi:up)?`);
const spec = await res.json();

const paths = Object.fromEntries(
  Object.entries(spec.paths).filter(([p]) => p.startsWith("/api/v2/pintopets/")),
);

// Keep only the schemas those paths reference (transitively).
const keep = new Set();
const visit = (node) => {
  if (Array.isArray(node)) return node.forEach(visit);
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if (k === "$ref" && typeof v === "string" && v.startsWith("#/components/schemas/")) {
      const name = v.slice("#/components/schemas/".length);
      if (!keep.has(name)) {
        keep.add(name);
        visit(spec.components.schemas[name]);
      }
    } else visit(v);
  }
};
visit(paths);

const filtered = {
  openapi: spec.openapi,
  info: { title: "OpsAPI — PintoPets plugin", version: spec.info?.version ?? "0" },
  paths,
  components: {
    schemas: Object.fromEntries([...keep].sort().map((k) => [k, spec.components.schemas[k]])),
    ...(spec.components.securitySchemes
      ? { securitySchemes: spec.components.securitySchemes }
      : {}),
  },
};

const dir = mkdtempSync(path.join(tmpdir(), "opsapi-types-"));
const input = path.join(dir, "pintopets-openapi.json");
writeFileSync(input, JSON.stringify(filtered));
const out = "apps/web/src/server/opsapi/pintopets.d.ts";
execFileSync("pnpm", ["exec", "openapi-typescript", input, "-o", out], { stdio: "inherit" });
console.info(`${Object.keys(paths).length} paths, ${keep.size} schemas → ${out}`);
