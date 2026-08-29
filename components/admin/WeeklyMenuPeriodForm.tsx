"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatWeeklyMenuStatus } from "@/lib/format-labels";
import { weeklyMenuStatuses } from "@/lib/prisma-enums";

export type WeeklyMenuPeriodFormData = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  orderCutoffAt: string | null;
  orderingOpenAt: string | null;
  lateFeeStartsAt: string | null;
  orderingClosesAt: string | null;
  fixedFulfillmentAt: string | null;
  customerSchedulingEnabled: boolean | null;
  deliveryWindowLabel: string | null;
  fulfillmentNotes: string | null;
  status: string;
  capacity: number;
};

type Props = {
  period?: WeeklyMenuPeriodFormData;
};

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? fallback;
}

export function WeeklyMenuPeriodForm({ period }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(period);

  async function handleSubmit(formData: FormData) {
    setSaving(true);

    try {
      const response = await fetch(
        period
          ? `/api/admin/menu/weekly-periods/${period.id}`
          : "/api/admin/menu/weekly-periods",
        {
          method: period ? "PATCH" : "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        alert(await readError(response, "Failed to save weekly menu."));
        return;
      }

      if (!period) {
        formRef.current?.reset();
      }

      router.refresh();
    } catch {
      alert("Failed to save weekly menu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="admin-card p-5">
      <div className="mb-5">
        <h2 className="text-xl font-black">
          {isEditing ? "Edit Weekly Menu" : "Create Weekly Menu"}
        </h2>

        <p className="mt-1 text-sm text-[#6b5a50]">
          Weekly menus can be drafted before they are published to customers.
        </p>
      </div>

      <div className="grid gap-4">
        <label className="admin-label">
          Week Label
          <input
            name="label"
            defaultValue={period?.label ?? ""}
            className="admin-input"
            placeholder="June 17-23 Meal Plan"
            required
          />
        </label>

        <div className="grid gap-4">
          <label className="admin-label">
            Start Date
            <input
              name="startDate"
              type="date"
              defaultValue={period?.startDate ?? ""}
              className="admin-input"
              required
            />
          </label>

          <label className="admin-label">
            End Date
            <input
              name="endDate"
              type="date"
              defaultValue={period?.endDate ?? ""}
              className="admin-input"
              required
            />
          </label>
        </div>

        <div className="grid gap-4">
          <label className="admin-label">
            Order Capacity
            <input
              name="capacity"
              type="number"
              min="1"
              step="1"
              defaultValue={period?.capacity ?? 10}
              className="admin-input"
              required
            />
            <span className="text-xs font-normal leading-5 text-[#6b5a50]">
              Counts submitted customer orders for this weekly menu, not meal
              plan item quantity.
            </span>
          </label>
        </div>

        <section className="rounded-lg border border-[#ead8c1] bg-[#fff8ee] p-4">
          <h3 className="text-sm font-black uppercase text-[#9f2f18]">
            Weekly Ordering Window
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
            Leave fields blank on new menus to use the business defaults.
            Published launch menus should resolve to Wednesday open, Friday late
            fee, Friday close, and Sunday fulfillment.
          </p>

          <div className="mt-4 grid gap-4">
            <label className="admin-label">
              Weekly Customer Scheduling
              <select
                name="customerSchedulingEnabled"
                defaultValue={
                  period?.customerSchedulingEnabled === true
                    ? "enabled"
                    : period?.customerSchedulingEnabled === false
                      ? "disabled"
                      : "inherit"
                }
                className="admin-input"
              >
                <option value="inherit">Use business setting</option>
                <option value="disabled">Fixed weekly fulfillment</option>
                <option value="enabled">Customer selects date/time</option>
              </select>
            </label>

            <label className="admin-label">
              Ordering Opens
              <input
                name="orderingOpenAt"
                type="datetime-local"
                defaultValue={period?.orderingOpenAt ?? ""}
                className="admin-input"
              />
            </label>

            <label className="admin-label">
              Late Fee Starts
              <input
                name="lateFeeStartsAt"
                type="datetime-local"
                defaultValue={period?.lateFeeStartsAt ?? ""}
                className="admin-input"
              />
            </label>

            <label className="admin-label">
              Ordering Closes
              <input
                name="orderingClosesAt"
                type="datetime-local"
                defaultValue={period?.orderingClosesAt ?? ""}
                className="admin-input"
              />
            </label>

            <label className="admin-label">
              Customer Delivery Message
              <input
                name="deliveryWindowLabel"
                defaultValue={period?.deliveryWindowLabel ?? ""}
                className="admin-input"
                placeholder="Weekly meal plan orders are delivered on Sunday. You will be notified when delivery is scheduled."
              />
            </label>
          </div>

          <details className="mt-4 rounded-lg border border-[#ead8c1] bg-white p-4 text-sm text-[#6b5a50]">
            <summary className="cursor-pointer font-bold text-[#3b241b]">
              Advanced / system schedule fields
            </summary>

            <div className="mt-3 space-y-2">
              <p>
                Legacy ordering cutoff is maintained automatically from the
                resolved Ordering Closes value.
              </p>
              <p>
                Current compatibility cutoff:{" "}
                <span className="font-semibold">
                  {period?.orderCutoffAt ?? "Will use Ordering Closes"}
                </span>
              </p>
              <p>
                Internal fixed fulfillment datetime:{" "}
                <span className="font-semibold">
                  {period?.fixedFulfillmentAt ??
                    "Resolved server-side from the Sunday fulfillment settings"}
                </span>
              </p>
            </div>
          </details>
        </section>

        <label className="admin-label">
          Status
          <select
            name="status"
            defaultValue={period?.status ?? "DRAFT"}
            className="admin-input"
          >
            {weeklyMenuStatuses.map((status) => (
              <option key={status} value={status}>
                {formatWeeklyMenuStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-label">
          Fulfillment Notes
          <textarea
            name="fulfillmentNotes"
            rows={4}
            defaultValue={period?.fulfillmentNotes ?? ""}
            className="admin-input"
            placeholder="Pickup or delivery notes for this weekly menu"
          />
        </label>

        <button disabled={saving} className="admin-button-primary">
          {saving
            ? "Saving..."
            : isEditing
              ? "Save Weekly Menu"
              : "Create Weekly Menu"}
        </button>
      </div>
    </form>
  );
}
