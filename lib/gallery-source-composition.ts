import {
  galleryImages as builtInGalleryImages,
  type GalleryImage,
} from "@/data/gallery";

export function mergeGalleryImages(
  databaseImages: GalleryImage[],
  builtInImages: GalleryImage[] = builtInGalleryImages,
): GalleryImage[] {
  const databaseSources = new Set(databaseImages.map((image) => image.src));

  return [
    ...databaseImages,
    ...builtInImages.filter((image) => !databaseSources.has(image.src)),
  ];
}
