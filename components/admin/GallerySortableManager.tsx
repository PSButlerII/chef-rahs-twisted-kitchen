"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  galleryCategoryOptions,
  type GalleryImageCategory,
} from "@/data/gallery";
import { DeleteGalleryImageButton } from "@/components/admin/DeleteGalleryImageButton";
import { GalleryImageEditForm } from "@/components/admin/GalleryImageEditForm";
import { isRemoteImageUrl } from "@/lib/image-urls";

const ALL_IMAGES = "All Images" as const;
const KEYBOARD_INSTRUCTIONS_ID = "gallery-ordering-keyboard-instructions";
type GalleryView = typeof ALL_IMAGES | GalleryImageCategory;

export type SortableAdminGalleryImage = {
  id: string;
  src: string;
  alt: string;
  title: string;
  category: GalleryImageCategory;
  sortOrder: number;
};

type OrderByCategory = Record<GalleryImageCategory, string[]>;

const keyboardArrowCodes = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
]);

function getOrderByCategory(
  images: readonly SortableAdminGalleryImage[],
): OrderByCategory {
  return Object.fromEntries(
    galleryCategoryOptions.map((category) => [
      category,
      images
        .filter((image) => image.category === category)
        .map((image) => image.id),
    ]),
  ) as OrderByCategory;
}

function sameOrder(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

function sameIdSet(left: readonly string[], right: readonly string[]) {
  const rightIds = new Set(right);
  return left.length === right.length && left.every((id) => rightIds.has(id));
}

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return data?.error ?? fallback;
}

function SortableGalleryCard({
  image,
  position,
  sortable,
}: {
  image: SortableAdminGalleryImage;
  position: number;
  sortable: boolean;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled: !sortable });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`admin-card overflow-hidden ${
        isDragging ? "relative z-10 opacity-70 ring-2 ring-[#c66838]" : ""
      }`}
    >
      <div className="relative aspect-[4/3]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          unoptimized={isRemoteImageUrl(image.src)}
          draggable={false}
        />
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black">{image.title}</h3>
              <span className="admin-badge admin-badge-neutral">
                {image.category}
              </span>
            </div>

            {sortable && (
              <button
                ref={setActivatorNodeRef}
                type="button"
                aria-label={`Move image: ${image.title}`}
                className="touch-none rounded-lg border border-[#d8c1aa] bg-white p-2 text-[#5d4638] transition hover:bg-[#f8eee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d4f2d]"
                {...attributes}
                {...listeners}
                aria-describedby={`${attributes["aria-describedby"]} ${KEYBOARD_INSTRUCTIONS_ID}`}
              >
                <GripVertical aria-hidden="true" size={20} />
              </button>
            )}
          </div>

          <p className="mt-2 text-sm text-[#6b5a50]">{image.alt}</p>
          <p className="mt-2 text-xs font-semibold text-[#6b5a50]">
            Position {position + 1}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <GalleryImageEditForm image={image} />
          <DeleteGalleryImageButton imageId={image.id} title={image.title} />
        </div>
      </div>
    </article>
  );
}

export function GallerySortableManager({
  images,
}: {
  images: SortableAdminGalleryImage[];
}) {
  const router = useRouter();
  const [selectedView, setSelectedView] = useState<GalleryView>(ALL_IMAGES);
  const [savedOrders, setSavedOrders] = useState<OrderByCategory>(() =>
    getOrderByCategory(images),
  );
  const [workingOrders, setWorkingOrders] = useState<OrderByCategory>(() =>
    getOrderByCategory(images),
  );
  const savedOrdersRef = useRef(savedOrders);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const keyboardPositionRef = useRef<number | null>(null);
  const keyboardDragRef = useRef(false);

  useEffect(() => {
    const nextSavedOrders = getOrderByCategory(images);
    setWorkingOrders((current) => {
      const next = { ...nextSavedOrders };
      for (const category of galleryCategoryOptions) {
        if (!sameOrder(current[category], savedOrdersRef.current[category])) {
          next[category] = current[category];
        }
      }
      return next;
    });
    savedOrdersRef.current = nextSavedOrders;
    setSavedOrders(nextSavedOrders);
  }, [images]);

  const imageById = useMemo(
    () => new Map(images.map((image) => [image.id, image])),
    [images],
  );
  const selectedIds = useMemo(
    () => (selectedView === ALL_IMAGES ? [] : workingOrders[selectedView]),
    [selectedView, workingOrders],
  );
  const savedIds = selectedView === ALL_IMAGES ? [] : savedOrders[selectedView];
  const dirty =
    selectedView !== ALL_IMAGES && !sameOrder(selectedIds, savedIds);
  const completeScope =
    selectedView !== ALL_IMAGES && sameIdSet(selectedIds, savedIds);
  const displayedImages =
    selectedView === ALL_IMAGES
      ? images
      : selectedIds
          .map((id) => imageById.get(id))
          .filter((image): image is SortableAdminGalleryImage =>
            Boolean(image),
          );
  const canSort =
    selectedView !== ALL_IMAGES && displayedImages.length > 1 && completeScope;
  const canSave = canSort && dirty && !saving;
  const galleryKeyboardCoordinates = useCallback<KeyboardCoordinateGetter>(
    (event, { context, currentCoordinates }) => {
      if (!keyboardArrowCodes.has(event.code)) return;

      const sortable = context.active?.data.current?.sortable as
        | { items?: string[] }
        | undefined;
      const items = sortable?.items;
      const currentIndex = keyboardPositionRef.current;
      if (!items || currentIndex === null) return;

      event.preventDefault();
      const currentId = items[currentIndex];
      const currentRect = context.droppableRects.get(currentId);
      if (!currentRect) return currentCoordinates;

      const candidates = items
        .map((id, index) => ({
          id,
          index,
          rect: context.droppableRects.get(id),
        }))
        .filter(
          (candidate): candidate is {
            id: string;
            index: number;
            rect: NonNullable<typeof candidate.rect>;
          } => Boolean(candidate.rect) && candidate.index !== currentIndex,
        );
      const sameRowTolerance = 2;
      let eligible = candidates.filter((candidate) => {
        switch (event.code) {
          case "ArrowLeft":
            return (
              Math.abs(candidate.rect.top - currentRect.top) <=
                sameRowTolerance && candidate.rect.left < currentRect.left
            );
          case "ArrowRight":
            return (
              Math.abs(candidate.rect.top - currentRect.top) <=
                sameRowTolerance && candidate.rect.left > currentRect.left
            );
          case "ArrowUp":
            return candidate.rect.top < currentRect.top - sameRowTolerance;
          case "ArrowDown":
            return candidate.rect.top > currentRect.top + sameRowTolerance;
          default:
            return false;
        }
      });

      eligible = eligible.sort((left, right) => {
        const leftRowDistance = Math.abs(left.rect.top - currentRect.top);
        const rightRowDistance = Math.abs(right.rect.top - currentRect.top);
        if (leftRowDistance !== rightRowDistance) {
          return leftRowDistance - rightRowDistance;
        }
        return (
          Math.abs(left.rect.left - currentRect.left) -
          Math.abs(right.rect.left - currentRect.left)
        );
      });

      const target = eligible[0];
      if (!target) return currentCoordinates;

      keyboardPositionRef.current = target.index;
      return {
        x: currentCoordinates.x + target.rect.left - currentRect.left,
        y: currentCoordinates.y + target.rect.top - currentRect.top,
      };
    },
    [],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: galleryKeyboardCoordinates,
    }),
  );
  const announcements = useMemo<Announcements>(() => {
    const imageTitle = (id: string) => imageById.get(id)?.title ?? "Image";
    const positionFor = (overId: string | undefined) => {
      const index = keyboardDragRef.current
        ? keyboardPositionRef.current
        : overId
          ? selectedIds.indexOf(overId)
          : -1;
      return index !== null && index >= 0 ? index + 1 : null;
    };

    return {
      onDragStart({ active }) {
        return `Picked up ${imageTitle(String(active.id))}.`;
      },
      onDragOver({ active, over }) {
        const position = positionFor(over ? String(over.id) : undefined);
        return position
          ? `${imageTitle(String(active.id))} moved to position ${position} of ${selectedIds.length}.`
          : undefined;
      },
      onDragEnd({ active, over }) {
        const position = positionFor(over ? String(over.id) : undefined);
        return position
          ? `${imageTitle(String(active.id))} was dropped at position ${position} of ${selectedIds.length}.`
          : `${imageTitle(String(active.id))} was dropped.`;
      },
      onDragCancel({ active }) {
        return `Moving ${imageTitle(String(active.id))} was cancelled.`;
      },
    };
  }, [imageById, selectedIds]);

  function selectView(nextView: GalleryView) {
    if (nextView === selectedView) return;
    if (
      dirty &&
      !window.confirm(
        "Discard the unsaved gallery order and switch categories?",
      )
    ) {
      return;
    }

    if (selectedView !== ALL_IMAGES && dirty) {
      setWorkingOrders((current) => ({
        ...current,
        [selectedView]: savedOrders[selectedView],
      }));
    }
    setSelectedView(nextView);
    setFeedback("");
  }

  function handleDragEnd(event: DragEndEvent) {
    const keyboardTargetIndex =
      keyboardDragRef.current ? keyboardPositionRef.current : null;
    if (selectedView === ALL_IMAGES) return;
    const activeId = String(event.active.id);
    const oldIndex = selectedIds.indexOf(activeId);
    const newIndex =
      keyboardTargetIndex ??
      (event.over ? selectedIds.indexOf(String(event.over.id)) : -1);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    setWorkingOrders((current) => ({
      ...current,
      [selectedView]: arrayMove(current[selectedView], oldIndex, newIndex),
    }));
    setFeedback("Order changed. Save when the arrangement is ready.");
  }

  function handleDragStart(event: DragStartEvent) {
    keyboardDragRef.current = event.activatorEvent instanceof KeyboardEvent;
    keyboardPositionRef.current = selectedIds.indexOf(String(event.active.id));
    const image = imageById.get(String(event.active.id));
    setFeedback(
      image
        ? `Picked up ${image.title}. Use the arrow keys to move it, then press Space or Enter to drop.`
        : "Image picked up. Use the arrow keys to move it, then press Space or Enter to drop.",
    );
  }

  function handleDragCancel() {
    keyboardPositionRef.current = null;
    setFeedback("Move cancelled. The image returned to its previous position.");
  }

  function resetOrder() {
    if (selectedView === ALL_IMAGES || !dirty || saving) return;
    setWorkingOrders((current) => ({
      ...current,
      [selectedView]: savedOrders[selectedView],
    }));
    setFeedback("Unsaved order reset.");
  }

  async function saveOrder() {
    if (selectedView === ALL_IMAGES || !canSave) return;
    const category = selectedView;
    const previousSavedIds = savedOrders[category];
    setSaving(true);
    setFeedback("");

    const response = await fetch("/api/admin/gallery/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, orderedIds: selectedIds }),
    });

    if (!response.ok) {
      const message = await readError(
        response,
        "Failed to save gallery order.",
      );
      setWorkingOrders((current) => ({
        ...current,
        [category]: previousSavedIds,
      }));
      setSaving(false);
      setFeedback(message);
      alert(message);
      if (response.status === 409) router.refresh();
      return;
    }

    const result = (await response.json()) as { orderedIds: string[] };
    setSavedOrders((current) => ({
      ...current,
      [category]: result.orderedIds,
    }));
    savedOrdersRef.current = {
      ...savedOrdersRef.current,
      [category]: result.orderedIds,
    };
    setWorkingOrders((current) => ({
      ...current,
      [category]: result.orderedIds,
    }));
    setSaving(false);
    setFeedback("Gallery order saved.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="admin-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Managed Images</h2>
            <p className="mt-1 text-sm text-[#6b5a50]">
              {images.length} database-backed image
              {images.length === 1 ? "" : "s"}. Select one category to change
              its saved public order.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="admin-button-secondary"
              disabled={!dirty || saving}
              onClick={resetOrder}
            >
              Reset Order
            </button>
            <button
              type="button"
              className="admin-button-primary"
              disabled={!canSave}
              onClick={saveOrder}
            >
              {saving ? "Saving..." : "Save Order"}
            </button>
          </div>
        </div>

        <div
          className="mt-5 flex flex-wrap gap-2"
          aria-label="Gallery category"
        >
          {[ALL_IMAGES, ...galleryCategoryOptions].map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={selectedView === view}
              onClick={() => selectView(view)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d4f2d] ${
                selectedView === view
                  ? "border-[#9d4f2d] bg-[#9d4f2d] text-white"
                  : "border-[#d8c1aa] bg-white text-[#5d4638] hover:bg-[#f8eee3]"
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        <div
          className={[
            "mt-4 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm",
            selectedView === ALL_IMAGES
              ? "border-[#d6a85f] bg-[#fff7e8] text-[#6b3f16]"
              : canSort
                ? "border-[#b98b5f] bg-[#fffaf4] text-[#5a3928]"
                : "border-red-300 bg-red-50 text-red-800",
          ].join(" ")}
        >
          {selectedView === ALL_IMAGES
            ? "Select a category to rearrange its images."
            : canSort
              ? "Use each card’s move handle, then save the complete category order."
              : "This category needs at least two managed images before it can be reordered."}
        </div>
        {canSort && (
          <p
            id={KEYBOARD_INSTRUCTIONS_ID}
            className="mt-2 text-sm text-[#6b5a50]"
          >
            Keyboard: focus a move handle, press Space or Enter to pick up,
            use the arrow keys to move, then press Space or Enter to drop.
            Press Escape to cancel.
          </p>
        )}
        {!completeScope && selectedView !== ALL_IMAGES && (
          <p className="mt-2 text-sm font-bold text-[#9d2f24]">
            The category changed while you were working. Reset or refresh before
            saving.
          </p>
        )}
        <p
          className="mt-2 min-h-5 text-sm font-semibold text-[#7a3d24]"
          aria-live="polite"
        >
          {feedback}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To pick up an image, press Space or Enter. Use the arrow keys to move it. Press Space or Enter to drop, or Escape to cancel.",
          },
        }}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={
            selectedView === ALL_IMAGES
              ? displayedImages.map((image) => image.id)
              : selectedIds
          }
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            {displayedImages.map((image, position) => (
              <SortableGalleryCard
                key={image.id}
                image={image}
                position={
                  selectedView === ALL_IMAGES
                    ? savedOrders[image.category].indexOf(image.id)
                    : position
                }
                sortable={canSort}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {displayedImages.length === 0 && (
        <div className="admin-card p-8 text-center">
          <p className="font-bold">No managed images in this view.</p>
        </div>
      )}
    </div>
  );
}
