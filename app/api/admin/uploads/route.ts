import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { requireAdminApi } from "@/lib/auth-guards";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  UploadError,
  parseUploadContext,
  saveFilesystemImage,
} from "@/lib/uploads/filesystem-storage";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const { session, response } = await requireAdminApi();
  if (response) return response;
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("multipart/form-data")
  )
    return NextResponse.json(
      { error: "Upload requests must use multipart form data." },
      { status: 415 },
    );
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_IMAGE_UPLOAD_BYTES + 512 * 1024)
    return NextResponse.json(
      { error: "Image uploads must be 5 MB or smaller." },
      { status: 413 },
    );
  try {
    const data = await request.formData();
    const entry = data.get("file");
    if (!(entry instanceof File))
      return NextResponse.json(
        { error: "Choose one image to upload." },
        { status: 400 },
      );
    const context = parseUploadContext(data.get("context"));
    const result = await saveFilesystemImage(entry, context);
    await writeAdminAuditLog({
      session,
      action: "ADMIN_IMAGE_UPLOADED",
      entityType: "Upload",
      entityId: result.filename,
      metadata: { context, contentType: result.contentType, size: result.size },
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const known = error instanceof UploadError;
    return NextResponse.json(
      { error: known ? error.message : "Image upload failed." },
      { status: known ? 400 : 500 },
    );
  }
}
