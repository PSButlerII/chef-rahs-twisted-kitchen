import {
  galleryImages as fallbackGalleryImages,
  galleryCategoryOptions,
  type GalleryImage,
  type GalleryImageCategory,
} from "@/data/gallery";
import { prisma } from "@/lib/prisma";
import { mergeGalleryImages } from "@/lib/gallery-source-composition";

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

export function getBuiltInGalleryImages(): BuiltInGalleryImage[] {
  return fallbackGalleryImages.map((image) => ({
    ...image,
    source: "built-in",
  }));
}

export async function getPublicGalleryImages(): Promise<GalleryImage[]> {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const databaseImages = images.map((image) => ({
      src: image.src,
      alt: image.alt,
      title: image.title,
      category: image.category as GalleryImageCategory,
    }));

    return mergeGalleryImages(databaseImages);
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
    alt: image.alt,
    title: image.title,
    category: image.category as GalleryImageCategory,
    sortOrder: image.sortOrder,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  }));
}
