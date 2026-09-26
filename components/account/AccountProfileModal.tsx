"use client";

import { useState } from "react";
import { AccountProfileForm } from "@/components/account/AccountProfileForm";
import { AccountPasswordForm } from "@/components/account/AccountPasswordForm";

type Props = {
  label?: string;
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
};

export function AccountProfileModal({
  user,
  label = "Update Account Information",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="brand-button-secondary px-5 py-3 text-sm"
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24130f]/70 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-[var(--brand-surface-soft)] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="brand-eyebrow">Account</p>

                <h2 className="mt-2 text-3xl font-black">{label}</h2>

                <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
                  Keep your contact, delivery, and service-location information
                  current for orders and service requests.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[var(--brand-border)] bg-white px-3 py-1 text-sm font-bold transition hover:border-[#9f2f18]"
              >
                Close
              </button>
            </div>

            <AccountProfileForm user={user} onSaved={() => setOpen(false)} />
            <AccountPasswordForm />
          </div>
        </div>
      )}
    </>
  );
}
