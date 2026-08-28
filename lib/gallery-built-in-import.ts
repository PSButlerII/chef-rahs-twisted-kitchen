import { galleryImages, type GalleryImage } from "@/data/gallery";

type ExistingGalleryRecord = {
  src: string;
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
  const highestSortOrder = existingRecords.reduce(
    (highest, record) => Math.max(highest, record.sortOrder),
    -1,
  );
  const missingImages = galleryImages.filter(
    (image) => !existingSources.has(image.src),
  );

  return {
    rowsToCreate: missingImages.map((image, index) => ({
      ...image,
      sortOrder: highestSortOrder + index + 1,
    })),
    skippedCount: galleryImages.length - missingImages.length,
  };
}
