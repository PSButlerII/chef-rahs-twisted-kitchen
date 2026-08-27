"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AdminImageUploadField } from "@/components/admin/AdminImageUploadField";

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? fallback;
}

export function MenuItemForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    if (uploading) return;
    setSaving(true);

    const response = await fetch("/api/admin/menu", {
      method: "POST",
      body: formData,
    });

    setSaving(false);

    if (!response.ok) {
      alert(await readError(response, "Failed to create menu item."));
      return;
    }

    formRef.current?.reset();
    setImageUrl("");

    router.refresh();
  }

  return (
    <form action={handleSubmit} className="admin-card h-fit p-6">
      <h2 className="text-2xl font-black">Add Meal Plan / Menu Item</h2>

      <div className="mt-5 space-y-4">
        <AdminImageUploadField
          label="Menu Item Image"
          context="menu-item"
          value={imageUrl}
          onChange={setImageUrl}
          onUploadingChange={setUploading}
        />

        <input
          name="name"
          placeholder="Item name"
          className="admin-input"
          required
        />

        <textarea
          name="description"
          placeholder="Description"
          rows={4}
          className="admin-input"
          required
        />

        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          placeholder="Price"
          className="admin-input"
          required
        />

        <label className="flex items-center gap-2 text-sm font-bold">
          <input name="available" type="checkbox" defaultChecked />
          Available
        </label>

        <label className="flex items-center gap-2 text-sm font-bold">
          <input name="seasonal" type="checkbox" />
          Seasonal
        </label>

        <div>
          <label className="block text-sm font-bold">Category</label>

          <select
            name="categoryName"
            className="admin-input mt-2"
            defaultValue="Meal Plans"
            required
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
            className="admin-input mt-2"
            defaultValue="MEAL_PLAN"
            required
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

        <p className="mt-2 text-xs text-[#6b5a50]">
          Meal plans are package-based and can use meal plan templates. Personal
          chef requests should use the Personal Chef inquiry workflow instead of
          menu items.
        </p>

        <label className="flex items-center gap-2 text-sm font-bold">
          <input name="requiresApproval" type="checkbox" />
          Requires chef approval
        </label>

        <label className="flex items-center gap-2 text-sm font-bold">
          <input name="customerInstructionsEnabled" type="checkbox" />
          Allow customer instructions
        </label>

        <button
          disabled={saving || uploading}
          className="admin-button-primary w-full"
        >
          {saving ? "Saving..." : "Create Offering"}
        </button>
      </div>
    </form>
  );
}
