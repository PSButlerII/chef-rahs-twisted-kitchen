import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  removeFilesystemImage,
  saveFilesystemImage,
  validateImageUpload,
} from "@/lib/uploads/filesystem-storage";

async function main() {
  const directory = await mkdtemp(path.join(tmpdir(), "chef-rahs-upload-qa-"));
  process.env.UPLOAD_STORAGE_DRIVER = "filesystem";
  process.env.UPLOAD_FILESYSTEM_DIR = directory;
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL =
    "https://example.test/image_uploads";

  const fixtures = [
    new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])], "unsafe name.jpg", {
      type: "image/jpeg",
    }),
    new File(
      [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "image.png",
      { type: "image/png" },
    ),
    new File([Buffer.from("RIFF0000WEBP", "ascii")], "image.webp", {
      type: "image/webp",
    }),
  ];

  try {
    for (const file of fixtures) {
      const result = await saveFilesystemImage(file, "general");
      if (
        !result.publicUrl.startsWith(
          "https://example.test/image_uploads/general/",
        )
      )
        throw new Error("Unexpected public URL.");
      if (result.filename.includes("unsafe"))
        throw new Error("Original filename leaked into storage name.");
      if (
        (await readFile(path.join(directory, "general", result.filename)))
          .length !== file.size
      )
        throw new Error("Stored bytes do not match.");
    }

    const rejected = [
      new File([Buffer.from("<svg></svg>")], "image.svg", {
        type: "image/svg+xml",
      }),
      new File([Uint8Array.from([0xff, 0xd8, 0xff])], "fake.png", {
        type: "image/png",
      }),
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
        type: "image/jpeg",
      }),
    ];
    for (const file of rejected) {
      let failed = false;
      try {
        await validateImageUpload(file);
      } catch {
        failed = true;
      }
      if (!failed) throw new Error(`Expected rejection for ${file.name}.`);
    }

    const staticAsset = path.join(directory, "static-gallery-asset.webp");
    await writeFile(staticAsset, "static asset remains");
    await removeFilesystemImage("/gallery/webp/IMG_1416.webp", "gallery");
    await access(staticAsset);

    const removable = await saveFilesystemImage(fixtures[2], "gallery");
    const removablePath = path.join(directory, "gallery", removable.filename);
    await removeFilesystemImage(removable.publicUrl, "gallery");
    let uploadedFileRemoved = false;
    try {
      await access(removablePath);
    } catch {
      uploadedFileRemoved = true;
    }
    if (!uploadedFileRemoved)
      throw new Error("Managed gallery upload was not removed.");
    console.log(
      "Durable image upload QA passed: formats, validation, safe names, public URLs, uploaded-file cleanup, and static-path protection.",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
