import Image from "next/image";
import Link from "next/link";
import { GalleryImageForm } from "@/components/admin/GalleryImageForm";
import { GallerySortableManager } from "@/components/admin/GallerySortableManager";
import { requireAdminPage } from "@/lib/auth-guards";
import {
  getAdminGalleryImages,
  getBuiltInGalleryImages,
} from "@/lib/gallery-images";

export default async function AdminGalleryPage() {
  await requireAdminPage();

  const images = await getAdminGalleryImages();
  const builtInImages = getBuiltInGalleryImages(
    images.map((image) => image.src),
  );

  return (
    <main className="admin-page">
      <div className="admin-container">
        <div className="mb-8">
          <Link className="admin-back-link" href="/admin">
            &larr; Back to Dashboard
          </Link>

          <p className="admin-eyebrow mt-5">Admin</p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Gallery Manager
          </h1>

          <p className="mt-3 max-w-3xl text-[#6b5a50]">
            Database-backed images are fully manageable here. Built-in site
            images remain fallback-only until they are imported into the
            database.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
          <aside className="xl:sticky xl:top-24 xl:self-start">
            <GalleryImageForm />
          </aside>

          <section className="space-y-5">
            <div className="flex justify-end">
              <Link href="/gallery" className="admin-button-secondary">
                View Public Gallery
              </Link>
            </div>

            <GallerySortableManager
              images={images.map((image) => ({
                id: image.id,
                src: image.src,
                alt: image.alt,
                title: image.title,
                category: image.category,
                sortOrder: image.sortOrder,
              }))}
            />

            {builtInImages.length > 0 && (
              <div className="admin-card p-6">
                <h2 className="text-2xl font-black">
                  Built-in Images Awaiting Import
                </h2>
                <p className="mt-2 text-sm text-[#6b5a50]">
                  These {builtInImages.length} images are bundled under{" "}
                  <code>/gallery/webp</code> but do not yet have database
                  records. Run the documented built-in gallery import to make
                  them editable, reorderable, and removable through admin.
                </p>
              </div>
            )}

            {builtInImages.length > 0 && (
              <div className="grid gap-5 lg:grid-cols-2">
                {builtInImages.map((image) => (
                  <article
                    key={image.src}
                    className="admin-card overflow-hidden"
                  >
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>

                    <div className="space-y-3 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">{image.title}</h3>
                        <span className="admin-badge admin-badge-neutral">
                          Built-in
                        </span>
                        <span className="admin-badge admin-badge-neutral">
                          {image.category}
                        </span>
                      </div>
                      <p className="text-sm text-[#6b5a50]">{image.alt}</p>
                      <p className="text-xs font-semibold text-[#6b5a50]">
                        Fallback-only until imported
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
