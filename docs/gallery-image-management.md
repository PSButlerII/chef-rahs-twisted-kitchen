# Gallery And Image Management

Last updated: August 30, 2026

## Sources Of Truth

- `data/gallery.ts` and `/gallery/webp/...` provide a safety fallback for a completely empty `GalleryImage` table.
- Once at least one database gallery record exists, the database is the public gallery source of truth.
- Built-in metadata can be imported as database records that continue to reference the existing `/gallery/webp/...` files.
- Imported built-ins and uploaded images both support normal admin edit, category-scoped drag-and-drop ordering, and delete operations.
- Durable production uploads use `NEXT_PUBLIC_UPLOAD_BASE_URL/gallery/<uuid>`; with the production base this is `/image_uploads/gallery/<uuid>`.
- **Meal Plans** is the required current terminology and gallery category. The retired category is normalized for display and is not available in admin category selectors.

## Retired Category Cleanup

Existing database rows imported before the terminology update may still store the retired category. The cleanup command is explicit, idempotent, and dry-run by default:

```powershell
npm run gallery:rename-meal-prep-category -- --dry-run
npm run gallery:rename-meal-prep-category -- --apply
```

Verify `DATABASE_URL` before either command and take a backup/checkpoint before apply. The script matches the retired category exactly and changes only `GalleryImage.category` to `Meal Plans`; it does not modify IDs, titles, alt text, paths, sort order, or files. The application normalizes legacy title/alt/category terminology at read time so public and admin views use current language before cleanup is applied.

## Public Gallery Experience

Public `/gallery` uses an image-first warm espresso layout. It renders nine images initially, offers category filter buttons, and reveals subsequent groups through Load More instead of mounting every record at once. Titles and categories stay off the default card surface; they appear on mouse hover, keyboard focus, or in the click/tap lightbox. The accessible lightbox includes details, close and previous/next controls, Escape/arrow-key support, focus containment, and background scroll locking.

This presentation layer does not change database loading, built-in fallback/import behavior, durable upload storage, or admin gallery CRUD.

## Import Built-in Images

The import is explicit, idempotent, and dry-run by default. It matches existing rows by exact `src`, never deletes rows, and appends missing built-ins after the current highest sort order in each normalized category. Missing images in one category do not change another category's next position, and the built-in array's relative order is preserved within each category.

```powershell
npm run gallery:import-built-ins -- --dry-run
npm run gallery:import-built-ins -- --apply
```

Always verify `DATABASE_URL` and take a database backup/checkpoint before the production apply command. The dry-run prints created/skipped counts and every proposed path. Rerunning after import skips existing `src` values.

No import runs during build, migration, seed, or deployment. A fresh database continues to show the static fallback until an operator runs the import.

## Admin Behavior

- Imported built-ins appear under Managed Images with edit, delete, and ordering controls.
- Built-ins missing from the database appear in an “Awaiting Import” read-only section with instructions.
- Deleting an imported `/gallery/webp/...` record removes only its database row. The bundled physical file remains in the repository/deployment.
- Deleting or replacing a managed `/image_uploads/gallery/<uuid>` record also removes the durable uploaded file when storage is configured and the URL passes containment checks.
- External URLs and root-relative static paths are never filesystem deletion targets.

Because a nonempty database is authoritative, deleting an imported built-in removes it from the public gallery instead of allowing the static fallback to resurrect it. If every database gallery row is removed, the empty-table safety fallback becomes visible again.

## Category-Scoped Drag-And-Drop Ordering

The client-requested Gallery Manager ordering workflow uses the existing zero-based `GalleryImage.sortOrder` field. No new ordering column or Prisma migration was needed. A successfully saved category is compacted to `0, 1, 2, ...`; deleting an image may leave a harmless gap until the next saved reorder.

- **All Images** is a read-only review view. Select one existing gallery category to enable ordering.
- Each sortable card has a dedicated, labeled move handle. Pointer, touch, and keyboard sorting are supported without turning Edit, Delete, or the entire card into drag activators.
- Dragging changes only the local working order. **Save Order** makes one deliberate request; **Reset Order** restores the last server-provided order without a request.
- Switching views with unsaved changes requires confirmation before the working arrangement is discarded.
- Save is disabled when unchanged, while saving, for All Images, for fewer than two images, or when the current IDs no longer represent the complete category.
- A failed save restores the last saved arrangement. A `409` stale-scope response also refreshes server-rendered data so added, deleted, or moved records become visible.

The protected endpoint is `PATCH /api/admin/gallery/reorder`:

```json
{
  "category": "Meal Plans",
  "orderedIds": ["gallery-image-id-a", "gallery-image-id-b"]
}
```

The route requires the existing admin authorization guard, bounds and validates the JSON payload, rejects duplicate IDs, and verifies inside one interactive transaction that the submitted set exactly matches the complete current normalized category. Missing, extra, stale, deleted, newly omitted, and cross-category IDs produce a `409` before any position is updated. Successful saves update every position sequentially inside the transaction, revalidate `/gallery` and `/admin/gallery`, and write one `GALLERY_IMAGES_REORDERED` audit entry.

`Meal Prep` and `Meal Plans` database rows share the `Meal Plans` ordering scope. Reordering does not rewrite the stored legacy category. Creating an image appends it to its normalized category; editing without a logical category change preserves its position; changing category appends it to the destination category. Manual sort-order fields are no longer accepted by create or edit forms/routes.

For database-backed public data, categories are grouped in `galleryCategoryOptions` order: Meal Plans, Catering, Personal Chef, then Behind the Scenes. Within each normalized category, ordering is `sortOrder`, `createdAt`, then `id`. Category filters preserve that same saved order. Static built-ins remain unchanged as the empty/unavailable-table fallback.

## Verification And Post-Deployment Checks

The focused gallery ordering QA covers configured category ranking, sort-order placement, deterministic timestamp/ID tie-breaking, the combined legacy/current Meal Plans scope, duplicate/missing/extra ID rejection, complete-set acceptance, independent per-category import positions, and import idempotency. Existing built-in import, source-composition, and terminology QA remain part of this feature's verification.

After deployment, use an admin-controlled test category with multiple images:

1. Reorder with the pointer and save; refresh both admin and public gallery views and confirm persistence.
2. Reorder again and reset without saving; confirm the persisted arrangement returns.
3. Focus a move handle and verify keyboard sorting, visible focus, and clear accessible labeling.
4. Confirm Edit and Delete still work without beginning a drag.
5. Add an image and confirm it appears at the category end; move an image to another category and confirm destination append behavior.
6. Confirm All Images is read-only, other categories remain unchanged, and public All groups categories in the configured order.
7. In a controlled concurrent-change test, confirm a stale save returns `409`, changes no positions, restores the saved UI state, and refreshes the complete scope.
8. Confirm uploaded URLs/files are unchanged by reorder and existing replacement/deletion containment protections still apply.

## Production Rehearsal

After deployment:

1. Back up/checkpoint the production database and verify `DATABASE_URL`.
2. Run the import dry-run and review created/skipped paths.
3. Run the retired-category cleanup dry-run and review matched IDs/titles.
4. Run either `--apply` command only with owner approval.
5. Confirm imported cards have full admin controls, use Meal Plans, and `/gallery` has no duplicates or retired labels.
6. Upload one non-client QA image and confirm its `/image_uploads/gallery/<uuid>` URL is public and durable.
7. Confirm deleting a test uploaded record removes its uploaded file, while deleting an imported static-path test record does not remove the bundled asset.

Do not use real client images for the rehearsal.
