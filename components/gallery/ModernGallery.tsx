"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GalleryImage } from "@/data/gallery";
import { isRemoteImageUrl } from "@/lib/image-urls";

const PAGE_SIZE = 9;

type Props = {
  images: GalleryImage[];
};

export function ModernGallery({ images }: Props) {
  const categories = useMemo(
    () => Array.from(new Set(images.map((image) => image.category))),
    [images],
  );
  const [activeCategory, setActiveCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const filteredImages = useMemo(
    () =>
      activeCategory === "All"
        ? images
        : images.filter((image) => image.category === activeCategory),
    [activeCategory, images],
  );
  const visibleImages = filteredImages.slice(0, visibleCount);
  const selectedImage =
    selectedIndex === null ? null : filteredImages[selectedIndex];

  function selectCategory(category: string) {
    setActiveCategory(category);
    setVisibleCount(PAGE_SIZE);
    setSelectedIndex(null);
  }

  function openImage(index: number, trigger: HTMLButtonElement) {
    lastTriggerRef.current = trigger;
    setSelectedIndex(index);
  }

  function closeLightbox() {
    setSelectedIndex(null);
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
  }

  function moveSelection(direction: -1 | 1) {
    if (selectedIndex === null) return;
    setSelectedIndex(
      (selectedIndex + direction + filteredImages.length) %
        filteredImages.length,
    );
  }

  useEffect(() => {
    if (!selectedImage) return;

    const bodyWasLocked = document.body.classList.contains("overflow-hidden");
    document.body.classList.add("overflow-hidden");
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedIndex(null);
        window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
      }
      if (event.key === "ArrowLeft") {
        setSelectedIndex((index) =>
          index === null
            ? null
            : (index - 1 + filteredImages.length) % filteredImages.length,
        );
      }
      if (event.key === "ArrowRight") {
        setSelectedIndex((index) =>
          index === null ? null : (index + 1) % filteredImages.length,
        );
      }
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (!bodyWasLocked) document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [filteredImages.length, selectedImage]);

  if (images.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center shadow-2xl shadow-black/20">
        <p className="text-sm font-black tracking-[0.22em] text-[#d9975b] uppercase">
          New work coming soon
        </p>
        <h2 className="mt-4 text-3xl font-black text-[#fff4e7]">
          The next plate is in the works.
        </h2>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-[#cfbfb0]">
          Explore the menu or tell us what you are planning while the gallery is
          being refreshed.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            href="/menu"
            className="rounded-full bg-[#c66838] px-5 py-3 text-sm font-black text-white transition hover:bg-[#dd7843] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0ad70]"
          >
            Explore the Menu
          </a>
          <a
            href="/catering"
            className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-[#fff4e7] transition hover:border-[#d9975b] hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0ad70]"
          >
            Request Catering
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <section aria-label="Gallery filters">
        <div className="flex flex-wrap gap-2.5">
          {["All", ...categories].map((category) => {
            const active = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => selectCategory(category)}
                className={`rounded-full border px-4 py-2.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0ad70] ${
                  active
                    ? "border-[#d9975b] bg-[#d9975b] text-[#211612] shadow-lg shadow-black/20"
                    : "border-white/15 bg-white/[0.04] text-[#eadbcd] hover:border-[#d9975b]/70 hover:bg-white/[0.08]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-[#a99788]" aria-live="polite">
          Showing {visibleImages.length} of {filteredImages.length} images
          {activeCategory === "All" ? "" : ` in ${activeCategory}`}.
        </p>
      </section>

      <section className="mt-7" aria-label="Food gallery">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleImages.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={(event) => openImage(index, event.currentTarget)}
              aria-label={`View ${image.title}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#2b211c] text-left shadow-xl shadow-black/25 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 focus-visible:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0ad70]"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
                loading={index < 3 ? "eager" : "lazy"}
                unoptimized={isRemoteImageUrl(image.src)}
              />
              <span className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-black/90 via-black/15 to-transparent opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 md:block" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-3 p-5 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 md:block">
                <span className="inline-flex rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[0.68rem] font-black tracking-[0.14em] text-[#f2bb84] uppercase backdrop-blur-sm">
                  {image.category}
                </span>
                <span className="mt-2 block text-xl font-black text-white">
                  {image.title}
                </span>
              </span>
            </button>
          ))}
        </div>

        {visibleCount < filteredImages.length && (
          <div className="mt-9 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="rounded-full border border-[#d9975b]/70 bg-[#d9975b]/10 px-6 py-3 text-sm font-black text-[#ffe8d1] transition hover:border-[#eeb47e] hover:bg-[#d9975b]/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0ad70]"
            >
              Load More
            </button>
          </div>
        )}
      </section>

      {selectedImage && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#100b09]/95 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-lightbox-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeLightbox();
          }}
        >
          <div
            ref={dialogRef}
            className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#211813] shadow-2xl shadow-black/60 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeLightbox}
              aria-label="Close image details"
              className="absolute top-3 right-3 z-20 grid size-11 place-items-center rounded-full border border-white/20 bg-black/65 text-white backdrop-blur transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0ad70]"
            >
              <X aria-hidden="true" size={21} />
            </button>

            <div className="relative min-h-[52vh] bg-black/40 lg:min-h-[76vh]">
              <Image
                src={selectedImage.src}
                alt={selectedImage.alt}
                fill
                sizes="(min-width: 1024px) 75vw, 100vw"
                className="object-contain"
                loading="eager"
                unoptimized={isRemoteImageUrl(selectedImage.src)}
              />
              {filteredImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => moveSelection(-1)}
                    aria-label="View previous image"
                    className="absolute top-1/2 left-3 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0ad70]"
                  >
                    <ChevronLeft aria-hidden="true" size={23} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSelection(1)}
                    aria-label="View next image"
                    className="absolute top-1/2 right-3 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0ad70] lg:right-3"
                  >
                    <ChevronRight aria-hidden="true" size={23} />
                  </button>
                </>
              )}
            </div>

            <div className="overflow-y-auto p-5 sm:p-7 lg:flex lg:flex-col lg:justify-end">
              <p className="text-xs font-black tracking-[0.18em] text-[#e6a76d] uppercase">
                {selectedImage.category}
              </p>
              <h2
                id="gallery-lightbox-title"
                className="mt-2 text-3xl font-black text-[#fff4e7]"
              >
                {selectedImage.title}
              </h2>
              <p className="mt-3 leading-7 text-[#cdbbad]">
                {selectedImage.alt}
              </p>
              <p className="mt-5 text-xs text-[#8f7d70]">
                Image {selectedIndex + 1} of {filteredImages.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
