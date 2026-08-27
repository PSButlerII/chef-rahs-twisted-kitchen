import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const uploadContexts = [
  "menu-item",
  "weekly-offering",
  "option-choice",
  "gallery",
  "general",
] as const;
export type UploadContext = (typeof uploadContexts)[number];
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

function getConfig() {
  if (process.env.UPLOAD_STORAGE_DRIVER?.trim() !== "filesystem")
    throw new UploadError(
      "Image uploads are not configured for filesystem storage.",
    );
  const directory = process.env.UPLOAD_FILESYSTEM_DIR?.trim();
  const baseValue = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL?.trim();
  if (!directory || !path.isAbsolute(directory) || !baseValue)
    throw new UploadError("Image upload storage is not fully configured.");
  let base: URL;
  try {
    base = new URL(baseValue);
  } catch {
    throw new UploadError("Image upload storage is not fully configured.");
  }
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new UploadError("Image upload storage is not fully configured.");
  return {
    root: path.resolve(directory),
    publicBase: base.toString().replace(/\/$/, ""),
  };
}

export function parseUploadContext(value: unknown): UploadContext {
  return typeof value === "string" &&
    uploadContexts.includes(value as UploadContext)
    ? (value as UploadContext)
    : "general";
}
function prefix(bytes: Buffer, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export async function validateImageUpload(file: File) {
  if (file.size <= 0) throw new UploadError("Choose an image to upload.");
  if (file.size > MAX_IMAGE_UPLOAD_BYTES)
    throw new UploadError("Image uploads must be 5 MB or smaller.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let contentType: "image/jpeg" | "image/png" | "image/webp" | null = null;
  let extension: "jpg" | "png" | "webp" | null = null;
  if (prefix(bytes, [0xff, 0xd8, 0xff])) {
    contentType = "image/jpeg";
    extension = "jpg";
  } else if (prefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    contentType = "image/png";
    extension = "png";
  } else if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    contentType = "image/webp";
    extension = "webp";
  }
  if (!contentType || !extension || file.type !== contentType)
    throw new UploadError("Upload a valid JPG, PNG, or WebP image.");
  return { bytes, contentType, extension };
}

export async function saveFilesystemImage(file: File, context: UploadContext) {
  const config = getConfig();
  const image = await validateImageUpload(file);
  const filename = `${randomUUID()}.${image.extension}`;
  const directory = path.resolve(config.root, context);
  const target = path.resolve(directory, filename);
  if (!target.startsWith(`${config.root}${path.sep}`))
    throw new UploadError("The upload target is invalid.");
  await mkdir(directory, { recursive: true });
  await writeFile(target, image.bytes, { flag: "wx" });
  return {
    publicUrl: `${config.publicBase}/${context}/${filename}`,
    filename,
    contentType: image.contentType,
    size: image.bytes.length,
    storageDriver: "filesystem" as const,
  };
}

export async function removeFilesystemImage(
  publicUrl: string,
  context: UploadContext,
) {
  let config: ReturnType<typeof getConfig>;
  try {
    config = getConfig();
  } catch {
    return;
  }
  const urlPrefix = `${config.publicBase}/${context}/`;
  if (!publicUrl.startsWith(urlPrefix)) return;
  const filename = publicUrl.slice(urlPrefix.length);
  if (!/^[0-9a-f-]+\.(?:jpg|png|webp)$/.test(filename)) return;
  const contextRoot = path.resolve(config.root, context);
  const target = path.resolve(contextRoot, filename);
  if (!target.startsWith(`${contextRoot}${path.sep}`)) return;
  try {
    await unlink(target);
  } catch {
    /* Missing files do not block record changes. */
  }
}
