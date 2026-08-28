import {
  galleryImages as builtInGalleryImages,
  type GalleryImage,
} from "@/data/gallery";

export function selectGalleryImages(
  databaseImages: GalleryImage[],
  builtInImages: GalleryImage[] = builtInGalleryImages,
): GalleryImage[] {
  return databaseImages.length > 0 ? databaseImages : builtInImages;
}
