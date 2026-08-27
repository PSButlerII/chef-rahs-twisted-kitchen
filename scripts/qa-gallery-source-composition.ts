import assert from "node:assert/strict";
import { galleryImages } from "../data/gallery";
import { mergeGalleryImages } from "../lib/gallery-source-composition";

const uploaded = {
  src: "https://example.test/image_uploads/gallery/qa.webp",
  alt: "QA uploaded gallery image",
  title: "QA Upload",
  category: "Meal Prep" as const,
};

const emptyDatabaseResult = mergeGalleryImages([]);
assert.equal(emptyDatabaseResult.length, galleryImages.length);
assert.deepEqual(emptyDatabaseResult, galleryImages);

const combinedResult = mergeGalleryImages([uploaded]);
assert.equal(combinedResult[0], uploaded);
assert.equal(combinedResult.length, galleryImages.length + 1);

const builtInDuplicate = {
  ...galleryImages[0],
  title: "Database title takes precedence",
};
const deduplicatedResult = mergeGalleryImages([builtInDuplicate]);
assert.equal(
  deduplicatedResult.filter((image) => image.src === builtInDuplicate.src)
    .length,
  1,
);
assert.equal(deduplicatedResult[0].title, "Database title takes precedence");

console.log(
  "Gallery composition QA passed: empty DB fallback, combined sources, DB precedence, and src deduplication.",
);
