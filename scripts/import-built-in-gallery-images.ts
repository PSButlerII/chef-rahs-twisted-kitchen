import { galleryImages } from "../data/gallery";
import { planBuiltInGalleryImport } from "../lib/gallery-built-in-import";
import { prisma } from "../prisma/script-prisma";

const apply = process.argv.includes("--apply");

async function main() {
  const existingRecords = await prisma.galleryImage.findMany({
    select: { src: true, sortOrder: true },
  });
  const plan = planBuiltInGalleryImport(existingRecords);

  console.log(
    `${apply ? "Apply" : "Dry run"}: ${plan.rowsToCreate.length} built-in gallery image(s) to create; ${plan.skippedCount} already present.`,
  );
  for (const row of plan.rowsToCreate) {
    console.log(
      `- ${row.src} [${row.category}] -> sort order ${row.sortOrder}`,
    );
  }

  if (!apply) {
    console.log("No database changes made. Rerun with --apply to import.");
    return;
  }

  let createdCount = 0;
  let skippedDuringApply = 0;
  for (const row of plan.rowsToCreate) {
    const existing = await prisma.galleryImage.findFirst({
      where: { src: row.src },
      select: { id: true },
    });
    if (existing) {
      skippedDuringApply += 1;
      continue;
    }

    await prisma.galleryImage.create({ data: row });
    createdCount += 1;
  }

  console.log(
    `Import complete: ${createdCount} created; ${plan.skippedCount + skippedDuringApply} skipped; ${galleryImages.length} built-in image(s) evaluated.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Import failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
