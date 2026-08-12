"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  defaultWeeklyMealSlotLabel,
  getWeeklyMealSlotLabelOptions,
  isBreakfastWeeklyMealSlotLabel,
  normalizeWeeklyMealSlotLabels,
} from "@/lib/weekly-package-labels";

export type WeeklyMealPlanPackageFormData = {
  id: string;
  name: string;
  days: number;
  mealsPerDay: number;
  price: number;
  available: boolean;
  requiresChefApproval: boolean;
  isSeasonal: boolean;
  mealSlotLabels: string[];
  displayOrder: number;
  notes: string | null;
};

type Props = {
  periodId: string;
  pkg?: WeeklyMealPlanPackageFormData;
  offerings: WeeklyOfferingEligibilityOption[];
};

export type WeeklyOfferingEligibilityOption = {
  id: string;
  name: string;
  breakfastOnly: boolean;
  available: boolean;
};

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? fallback;
}

export function WeeklyMealPlanPackageForm({ periodId, pkg, offerings }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [mealsPerDay, setMealsPerDay] = useState(pkg?.mealsPerDay ?? 1);
  const [mealSlotLabels, setMealSlotLabels] = useState(() =>
    normalizeWeeklyMealSlotLabels(
      pkg?.mealSlotLabels,
      pkg?.mealsPerDay ?? 1,
    ),
  );
  const [previewOfferingIds, setPreviewOfferingIds] = useState<
    Record<number, string>
  >({});
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(pkg);

  function changeMealsPerDay(nextMealsPerDay: number) {
    setMealsPerDay(nextMealsPerDay);
    setMealSlotLabels((current) =>
      normalizeWeeklyMealSlotLabels(current, nextMealsPerDay),
    );
    setPreviewOfferingIds((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([slotNumber]) => Number(slotNumber) <= nextMealsPerDay,
        ),
      ),
    );
  }

  function changeSlotLabel(slotNumber: number, nextLabel: string) {
    setMealSlotLabels((current) =>
      Array.from({ length: mealsPerDay }, (_, index) =>
        index === slotNumber - 1
          ? nextLabel
          : (current[index] ?? defaultWeeklyMealSlotLabel(index + 1)),
      ),
    );
    setPreviewOfferingIds((current) => ({
      ...current,
      [slotNumber]: "",
    }));
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true);

    try {
      const response = await fetch(
        pkg
          ? `/api/admin/menu/weekly-packages/${pkg.id}`
          : `/api/admin/menu/weekly-periods/${periodId}/packages`,
        {
          method: pkg ? "PATCH" : "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        alert(
          await readError(response, "Failed to save weekly meal plan package."),
        );
        return;
      }

      if (!pkg) {
        formRef.current?.reset();
        setMealsPerDay(1);
        setMealSlotLabels([defaultWeeklyMealSlotLabel(1)]);
        setPreviewOfferingIds({});
      }

      router.refresh();
    } catch {
      alert("Failed to save weekly meal plan package.");
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
          Package Name
          <input
            name="name"
            defaultValue={pkg?.name ?? ""}
            className="admin-input"
            placeholder="5-Day Lunch Package"
            required
          />
        </label>

        <label className="admin-label">
          Package Price
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={pkg ? pkg.price.toFixed(2) : ""}
            className="admin-input"
            required
          />
        </label>
      </div>

      <div className="grid gap-4">
        <label className="admin-label">
          Days
          <select
            name="days"
            defaultValue={String(pkg?.days ?? 5)}
            className="admin-input"
          >
            <option value="5">5 days</option>
            <option value="7">7 days</option>
          </select>
        </label>

        <label className="admin-label">
          Meals Per Day
          <select
            name="mealsPerDay"
            value={String(mealsPerDay)}
            onChange={(event) =>
              changeMealsPerDay(Number(event.target.value))
            }
            className="admin-input"
          >
            <option value="1">1 meal</option>
            <option value="2">2 meals</option>
            <option value="3">3 meals</option>
            <option value="4">4 meals</option>
          </select>
        </label>

        <label className="admin-label">
          Display Order
          <input
            name="displayOrder"
            type="number"
            min="0"
            step="1"
            defaultValue={pkg?.displayOrder ?? 0}
            className="admin-input"
            required
          />
        </label>
      </div>

      <div className="grid gap-3 rounded-lg border border-[#ead8c1] bg-[#fff8ee] p-4">
        <div>
          <p className="text-sm font-black text-[#24130f]">
            Meal Slot Labels
          </p>
          <p className="mt-1 text-xs text-[#6b5a50]">
            These labels appear for customers while building their weekly plan.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: mealsPerDay }, (_, index) => {
            const slotNumber = index + 1;
            const labelOptions = getWeeklyMealSlotLabelOptions(slotNumber);
            const savedLabel = mealSlotLabels[index];
            const selectedLabel = labelOptions.includes(savedLabel)
              ? savedLabel
              : defaultWeeklyMealSlotLabel(slotNumber);
            const isBreakfastSlot =
              isBreakfastWeeklyMealSlotLabel(selectedLabel);
            const eligibleOfferings = offerings.filter(
              (offering) =>
                offering.available &&
                (!offering.breakfastOnly || isBreakfastSlot),
            );

            return (
              <div
                key={slotNumber}
                className="grid gap-3 rounded-lg border border-[#ead8c1] bg-white p-3"
              >
                <label className="admin-label">
                  Slot {slotNumber}
                  <select
                    name={`mealSlotLabel${slotNumber}`}
                    value={selectedLabel}
                    onChange={(event) =>
                      changeSlotLabel(slotNumber, event.target.value)
                    }
                    className="admin-input"
                    required
                  >
                    {labelOptions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-label">
                  Eligible offering preview
                  <select
                    value={previewOfferingIds[slotNumber] ?? ""}
                    onChange={(event) =>
                      setPreviewOfferingIds((current) => ({
                        ...current,
                        [slotNumber]: event.target.value,
                      }))
                    }
                    className="admin-input"
                    aria-label={`Slot ${slotNumber} eligible offering preview`}
                  >
                    <option value="">Select an offering to preview</option>
                    {eligibleOfferings.map((offering) => (
                      <option key={offering.id} value={offering.id}>
                        {offering.name} ·{" "}
                        {offering.breakfastOnly ? "Breakfast" : "Standard"}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="text-xs leading-5 text-[#6b5a50]">
                  Preview only; packages do not save an offering per slot. {" "}
                  {isBreakfastSlot
                    ? "Breakfast and Standard offerings are eligible for a Breakfast slot."
                    : "Breakfast-only offerings are excluded because this is not a Breakfast slot."}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <label className="admin-label">
        Notes
        <textarea
          name="notes"
          rows={3}
          defaultValue={pkg?.notes ?? ""}
          className="admin-input"
          placeholder="Optional package details"
        />
      </label>

      <label className="flex items-center gap-3 text-sm font-bold text-[#3f2a1d]">
        <input
          name="available"
          type="checkbox"
          defaultChecked={pkg?.available ?? true}
          className="h-4 w-4"
        />
        Available for this weekly menu
      </label>

      <label className="flex items-center gap-3 text-sm font-bold text-[#3f2a1d]">
        <input
          name="requiresChefApproval"
          type="checkbox"
          defaultChecked={pkg?.requiresChefApproval ?? false}
          className="h-4 w-4"
        />
        Requires chef approval
      </label>

      <label className="flex items-center gap-3 text-sm font-bold text-[#3f2a1d]">
        <input
          name="isSeasonal"
          type="checkbox"
          defaultChecked={pkg?.isSeasonal ?? false}
          className="h-4 w-4"
        />
        Seasonal package
      </label>

      <button disabled={saving} className="admin-button-primary">
        {saving ? "Saving..." : isEditing ? "Save Package" : "Add Package"}
      </button>
    </form>
  );
}
