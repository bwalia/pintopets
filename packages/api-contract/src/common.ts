import { z } from "zod";

/** ISO calendar date, "2026-11-03". */
export const IsoDate = z.iso.date().meta({ example: "2026-11-03" });

/**
 * Optional free text: trimmed, empty string becomes null (HTML forms send "").
 */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));
}

/** Optional ISO date where an empty string means "not set". */
export const OptionalIsoDate = z
  .union([IsoDate, z.literal("")])
  .nullish()
  .transform((v) => (v ? v : null));

export const Uuid = z.uuid();

export const IdParams = z.object({ id: Uuid });
