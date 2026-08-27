"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminImageUploadField } from "@/components/admin/AdminImageUploadField";

type Props = {
  choice: {
    id: string;
    name: string;
    description?: string | null;
    dietaryInfo?: string | null;
    imageUrl?: string | null;
    requestOnly?: boolean;
    priceDelta: number;
  };
};

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? fallback;
}

export function EditOptionChoiceForm({ choice }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState(choice.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);

    const response = await fetch(
      `/api/admin/menu/options/choices/${choice.id}`,
      {
        method: "PATCH",
        body: formData,
      },
    );

    setSaving(false);

    if (!response.ok) {
      alert(await readError(response, "Failed to update option choice."));
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
        className="admin-button-secondary mt-2 text-xs"
      >
        Edit Choice
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="admin-card-muted mt-3 space-y-3 p-4">
      <input
        name="name"
        defaultValue={choice.name}
        className="admin-input"
        required
      />

      <textarea
        name="description"
        defaultValue={choice.description ?? ""}
        rows={3}
        placeholder="Description"
        className="admin-input"
      />

      <input
        name="dietaryInfo"
        defaultValue={choice.dietaryInfo ?? ""}
        placeholder="Dietary info, e.g. Lean protein, request only"
        className="admin-input"
      />

      <AdminImageUploadField
        label="Option Image"
        context="option-choice"
        value={imageUrl}
        onChange={setImageUrl}
        onUploadingChange={setUploading}
      />

      <input
        name="priceDelta"
        type="number"
        min="0"
        step="0.01"
        defaultValue={choice.priceDelta}
        className="admin-input"
      />

      <label className="flex items-center gap-2 text-sm font-bold text-[#3f2a1d]">
        <input
          name="requestOnly"
          type="checkbox"
          defaultChecked={choice.requestOnly}
        />
        Request only / pricing may vary
      </label>

      <div className="flex flex-wrap gap-3">
        <button disabled={saving || uploading} className="admin-button-primary">
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="admin-button-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
