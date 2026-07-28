"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SendDepositPaymentRequestButton({
  requestId,
  disabledReason,
}: {
  requestId: string;
  disabledReason: string | null;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function sendRequest() {
    if (!confirm("Create and email this Square Sandbox deposit link?")) return;
    setSending(true);
    const response = await fetch(
      `/api/admin/catering/${requestId}/deposit-payment-request`,
      { method: "POST" },
    );
    const result = await response.json().catch(() => null);
    setSending(false);
    if (!response.ok) {
      alert(result?.error ?? "Failed to send deposit payment request.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={Boolean(disabledReason) || sending}
        onClick={sendRequest}
        className="brand-button-primary w-full px-4 py-3 text-sm disabled:bg-neutral-300 disabled:text-neutral-600"
        title={disabledReason ?? "Create and email a Square Sandbox link."}
      >
        {sending ? "Creating Square Link..." : "Send Deposit Payment Request"}
      </button>
      {disabledReason ? (
        <p className="mt-2 text-xs leading-5 text-[#6b5a50]">
          {disabledReason}
        </p>
      ) : null}
    </div>
  );
}
