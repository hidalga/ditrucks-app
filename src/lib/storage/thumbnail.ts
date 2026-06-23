import sharp from "sharp";

const THUMBNAIL_MAX_WIDTH = 640;
const THUMBNAIL_QUALITY = 75;

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: THUMBNAIL_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}
