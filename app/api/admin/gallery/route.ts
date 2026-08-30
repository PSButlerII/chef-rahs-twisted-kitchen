import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { requireAdminApi } from "@/lib/auth-guards";
import {
  isGalleryImageCategory,
  type GalleryImageCategory,
} from "@/lib/gallery-images";
import { getGalleryCategoryScopeValues } from "@/lib/gallery-ordering";
import { parsePublicImageUrl } from "@/lib/image-urls";
import { prisma } from "@/lib/prisma";
import { savePublicImageUpload } from "@/lib/public-upload";

function parseGalleryFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const alt = String(formData.get("alt") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!title || !alt || !isGalleryImageCategory(category)) {
    throw new Error("Title, alt text, and a valid category are required.");
  }

  return {
    title,
    alt,
    category: category as GalleryImageCategory,
  };
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireAdminApi();
    if (response) return response;

    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const imageUrl = parsePublicImageUrl(formData.get("imageUrl"));

    if ((!image || image.size === 0) && !imageUrl) {
      return NextResponse.json(
        { error: "Upload an image or enter a public image URL." },
        { status: 400 },
      );
    }

    const fields = parseGalleryFields(formData);
    const src =
      image && image.size > 0
        ? await savePublicImageUpload(image, "gallery")
        : imageUrl;

    const created = await prisma.$transaction(async (transaction) => {
      const aggregate = await transaction.galleryImage.aggregate({
        where: {
          category: { in: getGalleryCategoryScopeValues(fields.category) },
        },
        _max: { sortOrder: true },
      });

      return transaction.galleryImage.create({
        data: {
          ...fields,
          src: src ?? "",
          sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
        },
      });
    });

    revalidatePath("/gallery");
    revalidatePath("/admin/gallery");

    await writeAdminAuditLog({
      session,
      action: "GALLERY_IMAGE_CREATED",
      entityType: "GalleryImage",
      entityId: created.id,
      metadata: { category: created.category },
    });

    return NextResponse.json(created);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create gallery image.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
