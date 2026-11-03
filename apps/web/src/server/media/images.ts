import sharp, { type Metadata } from "sharp";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class UnsupportedImageError extends Error {}

export interface ProcessedImage {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
}

/**
 * Validates and re-encodes an uploaded photo.
 *
 * - The real format is read from the bytes, not the client's Content-Type.
 * - Orientation is applied, then ALL metadata is dropped (sharp's default when
 *   re-encoding): EXIF, including GPS location, never reaches storage.
 * - Full size: longest side ≤ 2048 px. Thumbnail: 480 × 480, cropped to the
 *   most interesting area.
 * - limitInputPixels guards against decompression bombs.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new UnsupportedImageError("That file isn't an image we can read.");
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) {
    throw new UnsupportedImageError("Please upload a JPEG, PNG or WebP photo.");
  }

  const base = () => sharp(input, { limitInputPixels: 50_000_000, failOn: "error" }).rotate();
  const full = await base()
    .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base()
    .resize({ width: 480, height: 480, fit: "cover", position: sharp.strategy.attention })
    .webp({ quality: 78 })
    .toBuffer();

  return { full: full.data, thumb, width: full.info.width, height: full.info.height };
}
