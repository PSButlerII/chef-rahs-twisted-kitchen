import { galleryCategoryRename } from "../lib/gallery-category-rename";
import { prisma } from "../prisma/script-prisma";

const apply = process.argv.includes("--apply");

async function main() {
  console.log(
    "Verify DATABASE_URL targets the intended database before applying this gallery category cleanup.",
  );

  const matches = await prisma.galleryImage.findMany({
    where: { category: galleryCategoryRename.from },
    select: { id: true, title: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  console.log(
    `${apply ? "Apply" : "Dry run"}: ${matches.length} gallery record(s) match the retired category.`,
  );
  for (const record of matches.slice(0, 10)) {
    console.log(`- ${record.id}: ${record.title}`);
  }
  if (matches.length > 10) {
    console.log(`- ...and ${matches.length - 10} more`);
  }

  if (!apply) {
    console.log(
      "No database changes made. Rerun with --apply to rename categories.",
    );
    return;
  }

  const result = await prisma.galleryImage.updateMany({
    where: { category: galleryCategoryRename.from },
    data: { category: galleryCategoryRename.to },
  });

  console.log(
    `Cleanup complete: ${matches.length} matched; ${result.count} updated; ${Math.max(0, matches.length - result.count)} skipped.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Cleanup failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
