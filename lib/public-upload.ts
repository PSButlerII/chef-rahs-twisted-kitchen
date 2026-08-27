import "server-only";
import {
  parseUploadContext,
  removeFilesystemImage,
  saveFilesystemImage,
  validateImageUpload,
  type UploadContext,
} from "@/lib/uploads/filesystem-storage";

const legacyContexts: Record<string, UploadContext> = {
  menu: "menu-item",
  gallery: "gallery",
};
const contextFor = (folder: string) =>
  legacyContexts[folder] ?? parseUploadContext(folder);

export function validatePublicImageUpload(file: File) {
  return validateImageUpload(file);
}
export async function savePublicImageUpload(file: File, folder: string) {
  return (await saveFilesystemImage(file, contextFor(folder))).publicUrl;
}
export async function removePublicUpload(
  publicUrl: string | null | undefined,
  folder: string,
) {
  if (publicUrl) await removeFilesystemImage(publicUrl, contextFor(folder));
}
