import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processImage, UnsupportedImageError } from "./images";

async function jpegWithGps(width = 3000, height = 2000): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 60 } } })
    .jpeg()
    .withExif({
      IFD0: { Make: "TestCam", Model: "Phone" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "51/1 30/1 0/1",
        GPSLongitudeRef: "W",
        GPSLongitude: "0/1 7/1 0/1",
      },
    })
    .toBuffer();
}

describe("processImage", () => {
  it("removes EXIF (including GPS) from both sizes", async () => {
    const input = await jpegWithGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const out = await processImage(input);
    expect((await sharp(out.full).metadata()).exif).toBeUndefined();
    expect((await sharp(out.thumb).metadata()).exif).toBeUndefined();
  });

  it("limits the full size to 2048 px and makes a 480 px square thumbnail", async () => {
    const out = await processImage(await jpegWithGps(3000, 2000));
    expect([out.width, out.height]).toEqual([2048, 1365]);
    const thumb = await sharp(out.thumb).metadata();
    expect([thumb.width, thumb.height, thumb.format]).toEqual([480, 480, "webp"]);
  });

  it("does not enlarge small photos", async () => {
    const small = await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    const out = await processImage(small);
    expect([out.width, out.height]).toEqual([300, 200]);
  });

  it("rejects files that are not images, whatever their name or type claims", async () => {
    await expect(processImage(Buffer.from("<svg onload=alert(1)></svg>"))).rejects.toBeInstanceOf(
      UnsupportedImageError,
    );
    await expect(processImage(Buffer.from("%PDF-1.7 fake"))).rejects.toBeInstanceOf(
      UnsupportedImageError,
    );
  });

  it("rejects image formats we don't accept (e.g. GIF)", async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } })
      .gif()
      .toBuffer();
    await expect(processImage(gif)).rejects.toBeInstanceOf(UnsupportedImageError);
  });
});
