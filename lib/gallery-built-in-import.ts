import { galleryImages, type GalleryImage } from "@/data/gallery";
import { normalizeGalleryCategory } from "@/lib/gallery-terminology";

type ExistingGalleryRecord = {
  src: string;
  category: string;
  sortOrder: number;
};

export type BuiltInGalleryImportRow = GalleryImage & {
  sortOrder: number;
};

export function planBuiltInGalleryImport(
  existingRecords: ExistingGalleryRecord[],
): {
  rowsToCreate: BuiltInGalleryImportRow[];
  skippedCount: number;
} {
  const existingSources = new Set(existingRecords.map((record) => record.src));
  const highestSortOrderByCategory = new Map<string, number>();
  for (const record of existingRecords) {
    const category = normalizeGalleryCategory(record.category);
    highestSortOrderByCategory.set(
      category,
      Math.max(
        highestSortOrderByCategory.get(category) ?? -1,
        record.sortOrder,
      ),
    );
  }
  const missingImages = galleryImages.filter(
    (image) => !existingSources.has(image.src),
  );
  const rowsToCreate = missingImages.map((image) => {
    const category = normalizeGalleryCategory(image.category);
    const sortOrder = (highestSortOrderByCategory.get(category) ?? -1) + 1;
    highestSortOrderByCategory.set(category, sortOrder);
    return { ...image, sortOrder };
  });

  return {
    rowsToCreate,
    skippedCount: galleryImages.length - missingImages.length,
  };
}
