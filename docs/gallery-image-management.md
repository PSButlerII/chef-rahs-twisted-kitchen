# Gallery And Image Management

Date: June 9, 2026

This note captures the current image setup and the safest next direction. It is intentionally separate from weekly meal plan modeling.

## Current State

- Public `/gallery` combines database-backed `GalleryImage` records with the built-in images in `data/gallery.ts`.
- Gallery images are served from files under `public/`.
- `public/gallery` contains original HEIC source files.
- `public/gallery/webp` contains optimized 1200x1600 WebP gallery images derived from the source files.
- `data/gallery.ts` remains the built-in static image and category source. Its images live under `/gallery/webp` and are read-only in admin.
- Admin `/admin/gallery` shows database-backed images with full CRUD and built-in images as read-only references.
- Database-backed gallery images take precedence when their `src` matches a built-in image, so public output does not contain duplicates.
- With durable production upload configuration, new gallery files use `NEXT_PUBLIC_UPLOAD_BASE_URL/gallery/<uuid>` (production: `/image_uploads/gallery/<uuid>`).
- Gallery create/edit forms also accept public image URLs, so production records can point at externally hosted durable storage without uploading through the app.
- Admin menu item creation supports uploading an image file to `public/uploads/menu`.
- Admin menu item creation and editing support public image URLs for externally hosted durable storage.
- The durable endpoint fails closed unless all filesystem upload variables are valid. This branch does not alter legacy upload flags or endpoint behavior.
- Admin menu item editing does not currently replace an item image.
- Option choice images are URL-based text fields.
- Existing `MenuItem.imageUrl` and `MenuItemOptionChoice.imageUrl` fields are URL strings, which can support local paths or hosted image URLs.

## Recommendation

Keep the composed gallery approach:

- Use `/admin/gallery` to curate uploaded, database-backed images.
- Keep `data/gallery.ts` as the source of built-in, read-only site images.
- Use optimized WebP copies for selected public gallery images.
- Keep original HEIC files as source material only.
- Do not tie gallery management to weekly meal plan modeling.

For menu item and option choice images:

- Keep URL string fields in the database.
- Keep menu item upload as a local/demo convenience only, and use the public image URL field for production-hosted assets.
- Keep option choice images URL-based until production image storage is decided.
- Add image replacement/editing later only after the deployment target is confirmed.

## Production Upload Concern

Writing uploads to `public/uploads` is acceptable for a local demo or a single persistent server, but it is usually unsafe for serverless or immutable deployments. On many platforms, files written at runtime can disappear on redeploy or may not be shared across instances.

The durable upload endpoint is controlled by `UPLOAD_STORAGE_DRIVER`, `UPLOAD_FILESYSTEM_DIR`, and `NEXT_PUBLIC_UPLOAD_BASE_URL`; it does not use the legacy `ALLOW_LOCAL_UPLOADS_IN_PRODUCTION` flag. The built-in `/gallery/webp` assets remain separate from uploaded files.

Before building a full admin upload workflow, confirm the production hosting target supports one of these:

- persistent local disk storage, or
- external object storage such as S3, Cloudflare R2, Supabase Storage, UploadThing, or the hosting provider's blob storage.

The production-safe pattern is:

1. Store the image in durable object storage, hosted media storage, or a confirmed persistent deployment volume.
2. Save the returned public URL in `src` for gallery records or `imageUrl` for menu records.
3. Menu cards, option choices, and gallery entries render that URL.
4. Add direct object-storage uploads later only after the client confirms the production storage provider.

## Production Rehearsal

After this gallery source fix is deployed:

- Upload a non-client QA image through `/admin/gallery`.
- Confirm it appears alongside the built-in images on `/gallery`.
- Confirm it is editable and deletable while built-in cards remain read-only.
- Confirm the public URL is under `/image_uploads/gallery` and survives the expected deployment/restart cycle.
