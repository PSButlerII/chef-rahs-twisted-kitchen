"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AdminImageUploadField } from "@/components/admin/AdminImageUploadField";

export type WeeklyMealPlanOfferingFormData = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  dietaryInfo: string | null;
  available: boolean;
  breakfastOnly: boolean;
  displayOrder: number;
};

type Props = {
  periodId: string;
  offering?: WeeklyMealPlanOfferingFormData;
};

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? fallback;
}

export function WeeklyMealPlanOfferingForm({ periodId, offering }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState(offering?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const isEditing = Boolean(offering);

  async function handleSubmit(formData: FormData) {
    setSaving(true);

    try {
      const response = await fetch(
        offering
          ? `/api/admin/menu/weekly-offerings/${offering.id}`
          : `/api/admin/menu/weekly-periods/${periodId}/offerings`,
        {
          method: offering ? "PATCH" : "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        alert(
          await readError(
            response,
            "Failed to save weekly meal plan offering.",
          ),
        );
        return;
      }

      if (!offering) {
        formRef.current?.reset();
      }

      router.refresh();
    } catch {
      alert("Failed to save weekly meal plan offering.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="admin-row-card grid gap-4"
    >
      <div className="grid gap-4">
        <label className="admin-label">
          Offering Name
          <input
            name="name"
            defaultValue={offering?.name ?? ""}
            className="admin-input"
            placeholder="Jerk Chicken Bowl"
            required
          />
        </label>

        <label className="admin-label">
          Display Order
          <input
            name="displayOrder"
            type="number"
            min="0"
            step="1"
            defaultValue={offering?.displayOrder ?? 0}
            className="admin-input"
            required
          />
        </label>
      </div>

      <label className="admin-label">
        Description
        <textarea
          name="description"
          rows={4}
          defaultValue={offering?.description ?? ""}
          className="admin-input"
          placeholder="Fixed weekly meal description"
          required
        />
      </label>

      <div className="grid gap-4">
        <label className="admin-label">
          Dietary Info
          <input
            name="dietaryInfo"
            defaultValue={offering?.dietaryInfo ?? ""}
            className="admin-input"
            placeholder="Gluten-free, dairy-free, etc."
          />
        </label>

        <AdminImageUploadField
          label="Offering Image"
          context="weekly-offering"
          value={imageUrl}
          onChange={setImageUrl}
          onUploadingChange={setUploading}
        />
      </div>

      <label className="admin-label">
        Meal Type
        <select
          name="breakfastOnly"
          defaultValue={offering?.breakfastOnly ? "true" : "false"}
          className="admin-input"
        >
          <option value="false">General</option>
          <option value="true">Breakfast</option>
        </select>
      </label>

      <label className="flex items-center gap-3 text-sm font-bold text-[#3f2a1d]">
        <input
          name="available"
          type="checkbox"
          defaultChecked={offering?.available ?? true}
          className="h-4 w-4"
        />
        Available for this weekly menu
      </label>

      <button disabled={saving || uploading} className="admin-button-primary">
        {saving ? "Saving..." : isEditing ? "Save Offering" : "Add Offering"}
      </button>
    </form>
  );
}
