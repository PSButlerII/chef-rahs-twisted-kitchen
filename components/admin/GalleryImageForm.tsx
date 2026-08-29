"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { galleryCategoryOptions } from "@/data/gallery";
import { AdminImageUploadField } from "@/components/admin/AdminImageUploadField";

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? fallback;
}

export function GalleryImageForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);

    const response = await fetch("/api/admin/gallery", {
      method: "POST",
      body: formData,
    });

    setSaving(false);

    if (!response.ok) {
      alert(await readError(response, "Failed to create gallery image."));
      return;
    }

    formRef.current?.reset();
    setImageUrl("");
    router.refresh();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="admin-card h-fit p-6">
      <h2 className="text-2xl font-black">Add Gallery Image</h2>

      <div className="mt-5 space-y-4">
        <AdminImageUploadField
          context="gallery"
          value={imageUrl}
          onChange={setImageUrl}
          onUploadingChange={setUploading}
        />

        <input
          name="title"
          placeholder="Display title"
          className="admin-input"
          required
        />

        <textarea
          name="alt"
          placeholder="Alt text"
          rows={3}
          className="admin-input"
          required
        />

        <div>
          <label className="block text-sm font-bold">Category</label>

          <select
            name="category"
            className="admin-input mt-2"
            defaultValue="Meal Plans"
            required
          >
            {galleryCategoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold">Sort Order</label>

          <input
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            defaultValue="0"
            className="admin-input mt-2"
            required
          />
        </div>

        <p className="text-xs text-[#6b5a50]">
          Upload JPG, PNG, or WebP images up to 5 MB, or use a public image URL.
          WebP is preferred for the public gallery.
        </p>

        <button
          disabled={saving || uploading}
          className="admin-button-primary w-full"
        >
          {saving ? "Saving..." : "Add Image"}
        </button>
      </div>
    </form>
  );
}
