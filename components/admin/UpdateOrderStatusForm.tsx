"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatOrderStatus } from "@/lib/format-labels";

const statuses = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

type UpdateOrderStatusFormProps = {
  orderId: string;
  currentStatus: string;
  normalRefundEligible: boolean;
};

export function UpdateOrderStatusForm({
  orderId,
  currentStatus,
  normalRefundEligible,
}: UpdateOrderStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function updateStatus() {
    setSaving(true);

    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        note,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      alert("Failed to update order status.");
      return;
    }

    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold">New Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-2 w-full rounded-lg border border-[#d7bea1] px-4 py-3 outline-none transition focus:border-[#8a2b18] focus:ring-2 focus:ring-[#d99426]/30"
        >
          {statuses
            .filter(
              (statusOption) =>
                statusOption !== "REFUNDED" ||
                currentStatus === "REFUNDED" ||
                normalRefundEligible,
            )
            .map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {formatOrderStatus(statusOption)}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold">Status Note</label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-2 w-full rounded-lg border border-[#d7bea1] px-4 py-3 outline-none transition focus:border-[#8a2b18] focus:ring-2 focus:ring-[#d99426]/30"
          placeholder="Optional note for this status update."
        />
      </div>

      <button
        type="button"
        onClick={updateStatus}
        disabled={saving}
        className="brand-button-primary w-full px-5 py-3 text-sm disabled:bg-neutral-400"
      >
        {saving ? "Saving..." : "Update Status"}
      </button>
    </div>
  );
}
