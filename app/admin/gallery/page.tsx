import Image from "next/image";
import Link from "next/link";
import { DeleteGalleryImageButton } from "@/components/admin/DeleteGalleryImageButton";
import { GalleryImageEditForm } from "@/components/admin/GalleryImageEditForm";
import { GalleryImageForm } from "@/components/admin/GalleryImageForm";
import { requireAdminPage } from "@/lib/auth-guards";
import {
  getAdminGalleryImages,
  getBuiltInGalleryImages,
} from "@/lib/gallery-images";
import { isRemoteImageUrl } from "@/lib/image-urls";

export default async function AdminGalleryPage() {
  await requireAdminPage();

  const images = await getAdminGalleryImages();
  const builtInImages = getBuiltInGalleryImages();

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
            Uploaded images are database-backed and fully manageable here.
            Built-in site images are shown below as read-only references.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
          <aside className="xl:sticky xl:top-24 xl:self-start">
            <GalleryImageForm />
          </aside>

          <section className="space-y-5">
            <div className="admin-card p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">Managed Images</h2>

                  <p className="mt-1 text-sm text-[#6b5a50]">
                    {images.length} database-backed image
                    {images.length === 1 ? "" : "s"}. New uploads appear here
                    and can be edited, reordered, or deleted.
                  </p>
                </div>

                <Link href="/gallery" className="admin-button-secondary">
                  View Public Gallery
                </Link>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {images.map((image) => (
                <article key={image.id} className="admin-card overflow-hidden">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                      unoptimized={isRemoteImageUrl(image.src)}
                    />
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">{image.title}</h3>

                        <span className="admin-badge admin-badge-neutral">
                          {image.category}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-[#6b5a50]">{image.alt}</p>

                      <p className="mt-2 text-xs text-[#6b5a50]">
                        Sort order: {image.sortOrder}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <GalleryImageEditForm
                        image={{
                          id: image.id,
                          src: image.src,
                          alt: image.alt,
                          title: image.title,
                          category: image.category,
                          sortOrder: image.sortOrder,
                        }}
                      />

                      <DeleteGalleryImageButton
                        imageId={image.id}
                        title={image.title}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {images.length === 0 && (
              <div className="admin-card p-8 text-center">
                <p className="font-bold">No managed gallery images yet.</p>

                <p className="mt-2 text-sm text-[#6b5a50]">
                  Built-in images remain visible below and on the public
                  gallery. Add an image to create a manageable database record.
                </p>
              </div>
            )}

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Built-in Images</h2>
              <p className="mt-2 text-sm text-[#6b5a50]">
                These {builtInImages.length} images are bundled with the site
                under <code>/gallery/webp</code>. They remain visible in the
                public gallery but cannot be edited or removed from the admin
                dashboard.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {builtInImages.map((image) => (
                <article key={image.src} className="admin-card overflow-hidden">
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
                      Read-only site asset
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
