import assert from "node:assert/strict";
import { galleryImages } from "../data/gallery";
import { planBuiltInGalleryImport } from "../lib/gallery-built-in-import";

const emptyPlan = planBuiltInGalleryImport([]);
assert.equal(emptyPlan.rowsToCreate.length, galleryImages.length);
assert.equal(emptyPlan.skippedCount, 0);
assert.deepEqual(
  emptyPlan.rowsToCreate.map((row) => row.sortOrder),
  galleryImages.map((_, index) => index),
);

const partialPlan = planBuiltInGalleryImport([
  { src: galleryImages[0].src, sortOrder: 7 },
]);
assert.equal(partialPlan.rowsToCreate.length, galleryImages.length - 1);
assert.equal(partialPlan.skippedCount, 1);
assert.equal(partialPlan.rowsToCreate[0].sortOrder, 8);

const rerunPlan = planBuiltInGalleryImport(
  galleryImages.map((image, index) => ({
    src: image.src,
    sortOrder: index,
  })),
);
assert.equal(rerunPlan.rowsToCreate.length, 0);
assert.equal(rerunPlan.skippedCount, galleryImages.length);

console.log(
  "Built-in gallery import QA passed: missing detection, stable ordering, and idempotent rerun planning.",
);
