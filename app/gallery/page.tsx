import Link from "next/link";
import { ModernGallery } from "@/components/gallery/ModernGallery";
import { getPublicGalleryImages } from "@/lib/gallery-images";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const galleryImages = await getPublicGalleryImages();
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#1a1310] px-4 py-10 text-[#fff4e7] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <header className="mb-9 border-b border-white/10 pb-8 sm:mb-11 sm:pb-10">
          <p className="text-xs font-black tracking-[0.24em] text-[#d9975b] uppercase">
            From Our Kitchen
          </p>

          <h1 className="mt-3 max-w-4xl text-4xl leading-[1.05] font-black tracking-tight text-[#fff4e7] sm:text-6xl lg:text-7xl">
            Food worth a closer look.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-[#cdbbad] sm:text-lg">
            A taste of our meal prep, catering, and personal chef work. Choose a
            collection or open any image to see the details.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold">
            <Link
              href="/menu"
              className="text-[#f1b47b] underline decoration-[#f1b47b]/40 underline-offset-4 transition hover:text-[#ffd4ae] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0ad70]"
            >
              Explore the menu
            </Link>

            <Link
              href="/catering"
              className="text-[#d6c5b7] underline decoration-white/20 underline-offset-4 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0ad70]"
            >
              Plan a catered event
            </Link>
          </div>
        </header>

        <ModernGallery images={galleryImages} />

        <aside className="mt-14 rounded-3xl border border-white/10 bg-white/[0.035] px-6 py-8 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-[#d9975b] uppercase">
              Made for your table
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#fff4e7]">
              Ready to create your own spread?
            </h2>
          </div>
          <Link
            href="/catering"
            className="mt-5 inline-flex rounded-full border border-[#d9975b]/70 px-5 py-3 text-sm font-black text-[#ffe8d1] transition hover:bg-[#d9975b]/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0ad70] sm:mt-0"
          >
            Start a Catering Request
          </Link>
        </aside>
      </div>
    </main>
  );
}
