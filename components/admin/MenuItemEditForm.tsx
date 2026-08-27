"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminImageUploadField } from "@/components/admin/AdminImageUploadField";

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? fallback;
}

type Props = {
  item: {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string | null;
    type: string;
    categoryName: string;
    seasonal: boolean;
    requiresApproval: boolean;
    customerInstructionsEnabled: boolean;
  };
};

export function MenuItemEditForm({ item }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);

    const response = await fetch(`/api/admin/menu/${item.id}`, {
      method: "PATCH",
      body: formData,
    });

    setSaving(false);

    if (!response.ok) {
      alert(await readError(response, "Failed to update menu item."));
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
        className="admin-button-secondary mt-3 px-4 py-2 text-xs"
      >
        Edit Item
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="mt-4 space-y-3 rounded-lg border border-[#ead8c1] p-4"
    >
      <input
        name="name"
        defaultValue={item.name}
        className="admin-input"
        required
      />

      <textarea
        name="description"
        defaultValue={item.description}
        rows={3}
        className="admin-input"
        required
      />

      <AdminImageUploadField
        label="Menu Item Image"
        context="menu-item"
        value={imageUrl}
        onChange={setImageUrl}
        onUploadingChange={setUploading}
      />

      <input
        name="price"
        type="number"
        min="0"
        step="0.01"
        defaultValue={item.price}
        className="admin-input"
        required
      />

      <div>
        <label className="block text-sm font-bold">Category</label>

        <select
          name="categoryName"
          defaultValue={item.categoryName}
          className="admin-input mt-2"
        >
          <option value="Meal Plans">Meal Plans</option>
          <option value="A La Carte">A La Carte</option>
          <option value="Catering">Catering</option>
          <option value="Desserts">Desserts</option>
          <option value="Sides">Sides</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold">Item Type</label>

        <select
          name="type"
          defaultValue={item.type}
          className="admin-input mt-2"
        >
          <option value="MEAL_PLAN">Meal Plan</option>
          <option value="A_LA_CARTE">A La Carte</option>
          <option value="CATERING">Catering Related</option>
          <option value="PLATE">Plate / Legacy</option>
          <option value="DESSERT">Dessert</option>
          <option value="SIDE">Side</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input name="seasonal" type="checkbox" defaultChecked={item.seasonal} />
        Seasonal
      </label>

      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          name="requiresApproval"
          type="checkbox"
          defaultChecked={item.requiresApproval}
        />
        Requires chef approval
      </label>

      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          name="customerInstructionsEnabled"
          type="checkbox"
          defaultChecked={item.customerInstructionsEnabled}
        />
        Allow customer instructions
      </label>

      <div className="flex gap-3">
        <button
          disabled={saving || uploading}
          className="admin-button-primary px-4 py-2"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="admin-button-secondary px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
