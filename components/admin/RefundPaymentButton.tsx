"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSquareAdminRefundLabel,
  type SquareDisplayEnvironment,
} from "@/lib/square-display-labels";

export function RefundPaymentButton({
  paymentAttemptId,
  disabledReason,
  environment,
}: {
  paymentAttemptId: string;
  disabledReason?: string | null;
  environment: SquareDisplayEnvironment;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const refundLabel = getSquareAdminRefundLabel(environment);

  async function submitRefund() {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) {
      setMessage("Enter a refund reason before continuing.");
      return;
    }
    if (
      !window.confirm(
        `Issue a full ${refundLabel}? This sends money back through Square.`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/payments/${paymentAttemptId}/refund`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: normalizedReason }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        status?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Refund request failed.");
      }
      setMessage(`Square refund status: ${result.status ?? "submitted"}.`);
      setReason("");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Refund request failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (disabledReason) {
    return (
      <p className="mt-3 rounded-lg bg-neutral-100 p-3 text-xs text-neutral-600">
        Refund unavailable: {disabledReason}
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-[#ead8c1] pt-4">
      <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-bold">Do not issue a second refund while the first refund remains pending.</p>
      <label
        className="block text-xs font-bold"
        htmlFor={`refund-${paymentAttemptId}`}
      >
        Full refund reason
      </label>
      <textarea
        id={`refund-${paymentAttemptId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={500}
        rows={2}
        className="mt-2 w-full rounded-lg border border-[#d8c4ac] bg-white p-2"
        placeholder="Required admin reason"
      />
      <button
        type="button"
        disabled={submitting || reason.trim().length < 3}
        onClick={submitRefund}
        className="mt-2 w-full rounded-lg bg-[#8c2f1b] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting refund…" : `Issue full ${refundLabel}`}
      </button>
      {message ? <p className="mt-2 text-xs">{message}</p> : null}
    </div>
  );
}
