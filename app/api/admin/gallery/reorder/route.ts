import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { requireAdminApi } from "@/lib/auth-guards";
import {
  isGalleryImageCategory,
  type GalleryImageCategory,
} from "@/lib/gallery-images";
import {
  getGalleryCategoryScopeValues,
  MAX_GALLERY_IMAGE_ID_LENGTH,
  MAX_GALLERY_REORDER_IDS,
  orderGalleryRecords,
  validateCompleteGalleryOrder,
} from "@/lib/gallery-ordering";
import { prisma } from "@/lib/prisma";

class StaleGalleryOrderError extends Error {}

type ReorderRequest = {
  category?: unknown;
  orderedIds?: unknown;
};

function parseReorderRequest(value: unknown): {
  category: GalleryImageCategory;
  orderedIds: string[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A valid JSON object is required.");
  }

  const { category, orderedIds } = value as ReorderRequest;
  if (typeof category !== "string" || !isGalleryImageCategory(category)) {
    throw new Error("A valid gallery category is required.");
  }
  if (!Array.isArray(orderedIds)) {
    throw new Error("orderedIds must be an array.");
  }
  if (orderedIds.length > MAX_GALLERY_REORDER_IDS) {
    throw new Error("Too many gallery image IDs were submitted.");
  }
  if (
    orderedIds.some(
      (id) =>
        typeof id !== "string" ||
        id.trim().length === 0 ||
        id.trim().length > MAX_GALLERY_IMAGE_ID_LENGTH,
    )
  ) {
    throw new Error("Every gallery image ID must be a valid nonempty string.");
  }

  const normalizedIds = orderedIds.map((id) => id.trim());
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new Error("Gallery image IDs must not be duplicated.");
  }

  return { category, orderedIds: normalizedIds };
}

export async function PATCH(request: Request) {
  try {
    const { session, response } = await requireAdminApi();
    if (response) return response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "A valid JSON request body is required." },
        { status: 400 },
      );
    }

    let input: ReturnType<typeof parseReorderRequest>;
    try {
      input = parseReorderRequest(body);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid request." },
        { status: 400 },
      );
    }

    const orderedIds = await prisma.$transaction(async (transaction) => {
      const currentImages = await transaction.galleryImage.findMany({
        where: {
          category: { in: getGalleryCategoryScopeValues(input.category) },
        },
        select: {
          id: true,
          category: true,
          sortOrder: true,
          createdAt: true,
        },
      });
      const currentIds = orderGalleryRecords(currentImages).map(
        (image) => image.id,
      );
      const validation = validateCompleteGalleryOrder(
        input.orderedIds,
        currentIds,
      );

      if (!validation.valid) {
        throw new StaleGalleryOrderError(
          "The gallery category changed. Refresh and review the complete category before saving again.",
        );
      }

      for (const [sortOrder, id] of input.orderedIds.entries()) {
        await transaction.galleryImage.update({
          where: { id },
          data: { sortOrder },
        });
      }

      return input.orderedIds;
    });

    revalidatePath("/gallery");
    revalidatePath("/admin/gallery");

    await writeAdminAuditLog({
      session,
      action: "GALLERY_IMAGES_REORDERED",
      entityType: "GalleryImage",
      metadata: {
        category: input.category,
        imageCount: orderedIds.length,
      },
    });

    return NextResponse.json({
      success: true,
      category: input.category,
      orderedIds,
    });
  } catch (error) {
    if (error instanceof StaleGalleryOrderError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Failed to save the gallery order." },
      { status: 500 },
    );
  }
}
