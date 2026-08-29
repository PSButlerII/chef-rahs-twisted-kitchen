import type { GalleryImage, GalleryImageCategory } from "@/data/gallery";

export const LEGACY_GALLERY_CATEGORY = "Meal Prep";
export const CURRENT_GALLERY_CATEGORY: GalleryImageCategory = "Meal Plans";

export function normalizeGalleryText(value: string) {
  return value.replace(/\bmeal prep\b/gi, (match) => {
    if (match === match.toUpperCase()) return "MEAL PLAN";
    if (match[0] === match[0].toUpperCase()) return "Meal Plan";
    return "meal plan";
  });
}

export function normalizeGalleryTitle(value: string) {
  return value.replace(/\bmeal prep\b/gi, (match) => {
    if (match === match.toUpperCase()) return "MEAL PLAN";
    if (match[0] === match[0].toUpperCase()) return "Meal Plan";
    return "meal plan";
  });
}

export function normalizeGalleryCategory(
  category: string,
): GalleryImageCategory {
  return category === LEGACY_GALLERY_CATEGORY
    ? CURRENT_GALLERY_CATEGORY
    : (category as GalleryImageCategory);
}

export function normalizeGalleryImageTerminology<
  T extends Omit<GalleryImage, "category"> & { category: string },
>(image: T): Omit<T, "category"> & GalleryImage {
  return {
    ...image,
    title: normalizeGalleryTitle(image.title),
    alt: normalizeGalleryText(image.alt),
    category: normalizeGalleryCategory(image.category),
  };
}
