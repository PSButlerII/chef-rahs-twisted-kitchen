import assert from "node:assert/strict";
import { galleryCategoryOptions, galleryImages } from "../data/gallery";
import { planBuiltInGalleryImport } from "../lib/gallery-built-in-import";
import {
  getGalleryCategoryScopeValues,
  orderGalleryRecords,
  validateCompleteGalleryOrder,
} from "../lib/gallery-ordering";

const records = [
  {
    id: "personal-chef",
    category: "Personal Chef",
    sortOrder: 0,
    createdAt: "2026-08-30T10:00:00.000Z",
  },
  {
    id: "meal-plan-later-id",
    category: "Meal Plans",
    sortOrder: 1,
    createdAt: "2026-08-30T10:00:00.000Z",
  },
  {
    id: "meal-plan-earlier-id",
    category: "Meal Prep",
    sortOrder: 1,
    createdAt: "2026-08-30T09:00:00.000Z",
  },
  {
    id: "meal-plan-first",
    category: "Meal Plans",
    sortOrder: 0,
    createdAt: "2026-08-30T12:00:00.000Z",
  },
  {
    id: "catering-b",
    category: "Catering",
    sortOrder: 0,
    createdAt: "2026-08-30T10:00:00.000Z",
  },
  {
    id: "catering-a",
    category: "Catering",
    sortOrder: 0,
    createdAt: "2026-08-30T10:00:00.000Z",
  },
];

assert.deepEqual(
  orderGalleryRecords(records).map((record) => record.id),
  [
    "meal-plan-first",
    "meal-plan-earlier-id",
    "meal-plan-later-id",
    "catering-a",
    "catering-b",
    "personal-chef",
  ],
);
assert.deepEqual(getGalleryCategoryScopeValues("Meal Plans"), [
  "Meal Plans",
  "Meal Prep",
]);
assert.equal(galleryCategoryOptions[0], "Meal Plans");

assert.deepEqual(validateCompleteGalleryOrder(["a", "a"], ["a", "b"]), {
  valid: false,
  reason: "duplicate",
});
assert.deepEqual(validateCompleteGalleryOrder(["a"], ["a", "b"]), {
  valid: false,
  reason: "scope-mismatch",
});
assert.deepEqual(validateCompleteGalleryOrder(["a", "b", "c"], ["a", "b"]), {
  valid: false,
  reason: "scope-mismatch",
});
assert.deepEqual(
  validateCompleteGalleryOrder(["a", "other-category"], ["a", "b"]),
  { valid: false, reason: "scope-mismatch" },
);
assert.deepEqual(validateCompleteGalleryOrder(["b", "a"], ["a", "b"]), {
  valid: true,
});

const importPlan = planBuiltInGalleryImport([
  { src: "/existing-meal-plan.webp", category: "Meal Prep", sortOrder: 4 },
  { src: "/existing-catering.webp", category: "Catering", sortOrder: 9 },
]);
const firstMealPlan = importPlan.rowsToCreate.find(
  (row) => row.category === "Meal Plans",
);
const firstCatering = importPlan.rowsToCreate.find(
  (row) => row.category === "Catering",
);
assert.equal(firstMealPlan?.sortOrder, 5);
assert.equal(firstCatering?.sortOrder, 10);

const rerunPlan = planBuiltInGalleryImport(
  galleryImages.map((image, index) => ({
    src: image.src,
    category: image.category,
    sortOrder: index,
  })),
);
assert.equal(rerunPlan.rowsToCreate.length, 0);
assert.equal(rerunPlan.skippedCount, galleryImages.length);

console.log(
  "Gallery ordering QA passed: deterministic category order, normalized scopes, complete-set validation, and per-category import planning.",
);
