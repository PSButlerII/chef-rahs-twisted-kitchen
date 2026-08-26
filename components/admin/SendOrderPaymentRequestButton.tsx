"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SquareDisplayEnvironment } from "@/lib/square-display-labels";

export function SendOrderPaymentRequestButton({
  orderId,
  disabledReason,
  environment,
  activePaymentUrl,
}: {
  orderId: string;
  disabledReason: string | null;
  environment: SquareDisplayEnvironment;
  activePaymentUrl: string | null;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  async function send() {
    if (!confirm("Create or reuse and email this Square payment request?")) return;
    setSending(true);
    const response = await fetch(`/api/admin/orders/${orderId}/payment-request`, {
      method: "POST",
    });
    const result = await response.json().catch(() => null);
    setSending(false);
    if (!response.ok) {
      alert(result?.error ?? "Failed to send payment request.");
      return;
    }
    router.refresh();
  }
  return (
    <div className="mt-5 space-y-2">
      <button
        type="button"
        disabled={Boolean(disabledReason) || sending}
        onClick={send}
        className="brand-button-primary w-full px-4 py-3 text-sm disabled:bg-neutral-300 disabled:text-neutral-600"
        title={disabledReason ?? `Send ${environment === "sandbox" ? "Sandbox " : ""}Square payment request`}
      >
        {sending ? "Preparing Payment Request..." : activePaymentUrl ? "Resend Payment Request" : "Send Payment Request"}
      </button>
      {activePaymentUrl ? (
        <a className="block text-center text-sm font-bold text-[#9f2f18] underline" href={activePaymentUrl} target="_blank" rel="noreferrer">
          Open / copy active payment link
        </a>
      ) : null}
      {disabledReason ? <p className="text-xs leading-5 text-[#6b5a50]">{disabledReason}</p> : null}
    </div>
  );
}
