"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  galleryCategoryOptions,
  type GalleryImageCategory,
} from "@/data/gallery";
import { AdminImageUploadField } from "@/components/admin/AdminImageUploadField";

type Props = {
  image: {
    id: string;
    src: string;
    alt: string;
    title: string;
    category: GalleryImageCategory;
    sortOrder: number;
  };
};

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? fallback;
}

export function GalleryImageEditForm({ image }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState(image.src);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);

    const response = await fetch(`/api/admin/gallery/${image.id}`, {
      method: "PATCH",
      body: formData,
    });

    setSaving(false);

    if (!response.ok) {
      alert(await readError(response, "Failed to update gallery image."));
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="admin-button-secondary px-4 py-2 text-xs"
      >
        Edit
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-3 rounded-lg border border-[#ead8c1] p-4"
    >
      <AdminImageUploadField
        label="Replace Image"
        context="gallery"
        value={imageUrl}
        onChange={setImageUrl}
        onUploadingChange={setUploading}
      />

      <input
        name="title"
        defaultValue={image.title}
        className="admin-input"
        required
      />

      <textarea
        name="alt"
        defaultValue={image.alt}
        rows={3}
        className="admin-input"
        required
      />

      <select
        name="category"
        defaultValue={image.category}
        className="admin-input"
        required
      >
        {galleryCategoryOptions.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <input
        name="sortOrder"
        type="number"
        min="0"
        step="1"
        defaultValue={image.sortOrder}
        className="admin-input"
        required
      />

      <div className="flex flex-wrap gap-3">
        <button
          disabled={saving || uploading}
          className="admin-button-primary px-4 py-2"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
          }}
          className="admin-button-secondary px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
