import assert from "node:assert/strict";
import { galleryCategoryOptions, galleryImages } from "../data/gallery";
import {
  galleryCategoryRename,
  selectGalleryCategoryRenameCandidates,
} from "../lib/gallery-category-rename";
import {
  LEGACY_GALLERY_CATEGORY,
  normalizeGalleryImageTerminology,
} from "../lib/gallery-terminology";

assert.equal(
  galleryCategoryOptions.includes(LEGACY_GALLERY_CATEGORY as never),
  false,
);
assert.ok(
  galleryImages.every(
    (image) =>
      String(image.category) !== LEGACY_GALLERY_CATEGORY &&
      !/meal[ _-]?prep/i.test(`${image.title} ${image.alt}`),
  ),
);

const legacyRecord = {
  id: "legacy-gallery-row",
  src: "/gallery/webp/example.webp",
  title: "Weekly Meal Prep",
  alt: "A meal prep plate",
  category: LEGACY_GALLERY_CATEGORY,
};
const normalized = normalizeGalleryImageTerminology(legacyRecord);
assert.equal(normalized.title, "Weekly Meal Plan");
assert.equal(normalized.alt, "A meal plan plate");
assert.equal(normalized.category, "Meal Plans");
assert.equal(normalized.src, legacyRecord.src);

const untouched = {
  id: "current-gallery-row",
  title: "Current Meal Plan",
  category: "Meal Plans",
};
const candidates = selectGalleryCategoryRenameCandidates([
  legacyRecord,
  untouched,
]);
assert.deepEqual(candidates, [legacyRecord]);
const simulatedUpdate = {
  ...candidates[0],
  category: galleryCategoryRename.to,
};
assert.equal(simulatedUpdate.category, "Meal Plans");
assert.equal(simulatedUpdate.id, legacyRecord.id);
assert.equal(simulatedUpdate.title, legacyRecord.title);

console.log(
  "Gallery terminology QA passed: active taxonomy, built-ins, display normalization, and category-only cleanup targeting.",
);
