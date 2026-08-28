# Gallery And Image Management

Last updated: August 28, 2026

## Sources Of Truth

- `data/gallery.ts` and `/gallery/webp/...` provide a safety fallback for a completely empty `GalleryImage` table.
- Once at least one database gallery record exists, the database is the public gallery source of truth.
- Built-in metadata can be imported as database records that continue to reference the existing `/gallery/webp/...` files.
- Imported built-ins and uploaded images both support normal admin edit, sort, and delete operations.
- Durable production uploads use `NEXT_PUBLIC_UPLOAD_BASE_URL/gallery/<uuid>`; with the production base this is `/image_uploads/gallery/<uuid>`.

## Public Gallery Experience

Public `/gallery` uses an image-first warm espresso layout. It renders nine images initially, offers category filter buttons, and reveals subsequent groups through Load More instead of mounting every record at once. Titles and categories stay off the default card surface; they appear on mouse hover, keyboard focus, or in the click/tap lightbox. The accessible lightbox includes details, close and previous/next controls, Escape/arrow-key support, focus containment, and background scroll locking.

This presentation layer does not change database loading, built-in fallback/import behavior, durable upload storage, or admin gallery CRUD.

## Import Built-in Images

The import is explicit, idempotent, and dry-run by default. It matches existing rows by exact `src`, never deletes rows, and appends missing built-ins after the current highest sort order.

```powershell
npm run gallery:import-built-ins -- --dry-run
npm run gallery:import-built-ins -- --apply
```

Always verify `DATABASE_URL` and take a database backup/checkpoint before the production apply command. The dry-run prints created/skipped counts and every proposed path. Rerunning after import skips existing `src` values.

No import runs during build, migration, seed, or deployment. A fresh database continues to show the static fallback until an operator runs the import.

## Admin Behavior

- Imported built-ins appear under Managed Images with edit, delete, and sort controls.
- Built-ins missing from the database appear in an “Awaiting Import” read-only section with instructions.
- Deleting an imported `/gallery/webp/...` record removes only its database row. The bundled physical file remains in the repository/deployment.
- Deleting or replacing a managed `/image_uploads/gallery/<uuid>` record also removes the durable uploaded file when storage is configured and the URL passes containment checks.
- External URLs and root-relative static paths are never filesystem deletion targets.

Because a nonempty database is authoritative, deleting an imported built-in removes it from the public gallery instead of allowing the static fallback to resurrect it. If every database gallery row is removed, the empty-table safety fallback becomes visible again.

## Production Rehearsal

After deployment:

1. Back up/checkpoint the production database and verify `DATABASE_URL`.
2. Run the import dry-run and review created/skipped paths.
3. Run `--apply` only with owner approval.
4. Confirm imported cards have full admin controls and `/gallery` has no duplicates.
5. Upload one non-client QA image and confirm its `/image_uploads/gallery/<uuid>` URL is public and durable.
6. Confirm deleting a test uploaded record removes its uploaded file, while deleting an imported static-path test record does not remove the bundled asset.

Do not use real client images for the rehearsal.
