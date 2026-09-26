"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  user: {
    name: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    deliveryNotes: string | null;
  };
  onSaved?: () => void;
};

export function AccountProfileForm({ user, onSaved }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);

    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      body: formData,
    });

    setSaving(false);

    if (!response.ok) {
      alert("Failed to update account information.");
      return;
    }

    router.refresh();
    onSaved?.();
  }

  return (
    <form
      action={handleSubmit}
      className="rounded-lg border border-[var(--brand-border)] bg-white p-5"
    >
      <h2 className="text-2xl font-black">Account Information</h2>

      <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
        Update your contact, delivery, and service-location information for
        orders and service requests.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <label className="block text-sm font-bold">Name</label>
          <input
            name="name"
            defaultValue={user.name ?? ""}
            className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />
        </div>

        <div>
          <label className="block text-sm font-bold">Email</label>
          <input
            value={user.email ?? ""}
            disabled
            className="mt-2 w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-soft)] px-4 py-3 text-[#6b5a50]"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Email changes are not available here yet.
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold">Phone</label>
          <input
            name="phone"
            defaultValue={user.phone ?? ""}
            className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />
        </div>

        <div>
          <label className="block text-sm font-bold">ZIP / Postal Code</label>
          <input
            name="postalCode"
            defaultValue={user.postalCode ?? ""}
            className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-bold">Address Line 1</label>
          <input
            name="addressLine1"
            defaultValue={user.addressLine1 ?? ""}
            className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-bold">Address Line 2</label>
          <input
            name="addressLine2"
            defaultValue={user.addressLine2 ?? ""}
            placeholder="Apartment, suite, unit, building, etc."
            className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition placeholder:text-[#9c897d] focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />
        </div>

        <div>
          <label className="block text-sm font-bold">City</label>
          <input
            name="city"
            defaultValue={user.city ?? ""}
            className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />
        </div>

        <div>
          <label className="block text-sm font-bold">State</label>
          <input
            name="state"
            defaultValue={user.state ?? ""}
            className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-bold">Delivery Notes</label>
          <textarea
            name="deliveryNotes"
            defaultValue={user.deliveryNotes ?? ""}
            rows={4}
            placeholder="Gate code, apartment instructions, preferred drop-off notes, parking details, etc."
            className="mt-2 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition placeholder:text-[#9c897d] focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />
        </div>
      </div>

      <button
        disabled={saving}
        className="brand-button-primary mt-8 px-5 py-3 disabled:bg-neutral-400 disabled:text-neutral-700 disabled:shadow-none"
      >
        {saving ? "Saving..." : "Save Account Information"}
      </button>
    </form>
  );
}
