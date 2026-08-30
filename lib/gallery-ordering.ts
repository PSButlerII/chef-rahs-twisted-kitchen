import {
  galleryCategoryOptions,
  type GalleryImageCategory,
} from "@/data/gallery";
import {
  LEGACY_GALLERY_CATEGORY,
  normalizeGalleryCategory,
} from "@/lib/gallery-terminology";

export const MAX_GALLERY_REORDER_IDS = 500;
export const MAX_GALLERY_IMAGE_ID_LENGTH = 128;

export function getGalleryCategoryScopeValues(
  category: GalleryImageCategory,
): string[] {
  return category === "Meal Plans"
    ? [category, LEGACY_GALLERY_CATEGORY]
    : [category];
}

type OrderableGalleryRecord = {
  id: string;
  category: string;
  sortOrder: number;
  createdAt: Date | string;
};

const categoryRank = new Map(
  galleryCategoryOptions.map((category, index) => [category, index]),
);

export function compareGalleryRecords(
  left: OrderableGalleryRecord,
  right: OrderableGalleryRecord,
) {
  const leftCategory = normalizeGalleryCategory(left.category);
  const rightCategory = normalizeGalleryCategory(right.category);
  const categoryDifference =
    (categoryRank.get(leftCategory) ?? galleryCategoryOptions.length) -
    (categoryRank.get(rightCategory) ?? galleryCategoryOptions.length);

  if (categoryDifference !== 0) return categoryDifference;
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  const createdAtDifference =
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  if (createdAtDifference !== 0) return createdAtDifference;
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

export function orderGalleryRecords<T extends OrderableGalleryRecord>(
  records: readonly T[],
): T[] {
  return [...records].sort(compareGalleryRecords);
}

export type GalleryOrderSetValidation =
  | { valid: true }
  | { valid: false; reason: "duplicate" | "scope-mismatch" };

export function validateCompleteGalleryOrder(
  orderedIds: readonly string[],
  currentIds: readonly string[],
): GalleryOrderSetValidation {
  if (new Set(orderedIds).size !== orderedIds.length) {
    return { valid: false, reason: "duplicate" };
  }

  if (orderedIds.length !== currentIds.length) {
    return { valid: false, reason: "scope-mismatch" };
  }

  const currentIdSet = new Set(currentIds);
  if (orderedIds.some((id) => !currentIdSet.has(id))) {
    return { valid: false, reason: "scope-mismatch" };
  }

  return { valid: true };
}
