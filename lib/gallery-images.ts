import {
  galleryImages as fallbackGalleryImages,
  galleryCategoryOptions,
  type GalleryImage,
  type GalleryImageCategory,
} from "@/data/gallery";
import { prisma } from "@/lib/prisma";
import { selectGalleryImages } from "@/lib/gallery-source-composition";
import {
  normalizeGalleryCategory,
  normalizeGalleryImageTerminology,
  normalizeGalleryText,
  normalizeGalleryTitle,
} from "@/lib/gallery-terminology";

export { galleryCategoryOptions };
export type { GalleryImage, GalleryImageCategory };

export type AdminGalleryImage = GalleryImage & {
  id: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BuiltInGalleryImage = GalleryImage & {
  source: "built-in";
};

export function isGalleryImageCategory(
  category: string,
): category is GalleryImageCategory {
  return galleryCategoryOptions.includes(category as GalleryImageCategory);
}

export function getBuiltInGalleryImages(
  managedSources: string[] = [],
): BuiltInGalleryImage[] {
  const managedSourceSet = new Set(managedSources);

  return fallbackGalleryImages
    .filter((image) => !managedSourceSet.has(image.src))
    .map((image) => ({
      ...image,
      source: "built-in",
    }));
}

export async function getPublicGalleryImages(): Promise<GalleryImage[]> {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const databaseImages = images.map((image) =>
      normalizeGalleryImageTerminology({
        src: image.src,
        alt: image.alt,
        title: image.title,
        category: normalizeGalleryCategory(image.category),
      }),
    );

    return selectGalleryImages(databaseImages);
  } catch {
    return fallbackGalleryImages;
  }
}

export async function getAdminGalleryImages(): Promise<AdminGalleryImage[]> {
  const images = await prisma.galleryImage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return images.map((image) => ({
    id: image.id,
    src: image.src,
    alt: normalizeGalleryText(image.alt),
    title: normalizeGalleryTitle(image.title),
    category: normalizeGalleryCategory(image.category),
    sortOrder: image.sortOrder,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  }));
}
