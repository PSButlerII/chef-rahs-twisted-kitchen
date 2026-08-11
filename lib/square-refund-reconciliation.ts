import "server-only";

import { completeRefundAttempt } from "@/lib/refund-completion";
import { prisma } from "@/lib/prisma";
import {
  parseSquareRefundStatus,
  refundWebsiteStatusForProviderStatus,
  type SquareRefundStatus,
} from "@/lib/square-refund-status";

export type SquareRefundState = {
  id: string;
  status: SquareRefundStatus;
  paymentId: string | null;
  locationId: string | null;
  amountCents: number;
  currency: string | null;
  updatedAt: Date;
};

export function squareRefundStateFromWebhook(refund: {
  id?: string;
  status?: string | null;
  payment_id?: string | null;
  location_id?: string | null;
  updated_at?: string;
  created_at?: string;
  amount_money?: { amount?: number; currency?: string | null };
}): SquareRefundState {
  const id = refund.id?.trim() ?? "";
  if (!id) throw new Error("Refund event does not include a refund ID.");

  return {
    id,
    status: parseSquareRefundStatus(refund.status),
    paymentId: refund.payment_id?.trim() || null,
    locationId: refund.location_id?.trim() || null,
    amountCents: Number(refund.amount_money?.amount),
    currency: refund.amount_money?.currency?.trim() || null,
    updatedAt: new Date(refund.updated_at ?? refund.created_at ?? Date.now()),
  };
}

export async function reconcileSquareRefundAttempt({
  refundAttemptId,
  refund,
  expectedLocationId,
}: {
  refundAttemptId: string;
  refund: SquareRefundState;
  expectedLocationId: string;
}) {
  const attempt = await prisma.paymentAttempt.findUniqueOrThrow({
    where: { id: refundAttemptId },
    include: { parentPayment: true },
  });

  if (attempt.paymentPurpose !== "REFUND" || !attempt.parentPayment) {
    throw new Error("Refund ledger lineage is invalid.");
  }
  if (attempt.providerPaymentId !== refund.id) {
    throw new Error("Square refund ID does not match the ledger.");
  }
  if (
    refund.paymentId &&
    attempt.parentPayment.providerPaymentId !== refund.paymentId
  ) {
    throw new Error("Square original payment ID does not match the ledger.");
  }
  if (
    !Number.isSafeInteger(refund.amountCents) ||
    refund.amountCents !== attempt.amountCents ||
    refund.currency !== attempt.currency ||
    refund.locationId !== expectedLocationId
  ) {
    throw new Error(
      "Square refund amount, currency, or location does not match the ledger.",
    );
  }

  if (attempt.websiteStatus === "REFUNDED") {
    return { status: "COMPLETED" as const, changed: false };
  }

  if (refund.status === "COMPLETED") {
    const result = await completeRefundAttempt({
      refundAttemptId: attempt.id,
      providerStatus: refund.status,
      completedAt: refund.updatedAt,
    });
    return { status: refund.status, changed: result.transitioned };
  }

  const failed = refund.status === "FAILED" || refund.status === "REJECTED";
  if (attempt.websiteStatus === "FAILED" && !failed) {
    return { status: refund.status, changed: false };
  }

  const websiteStatus = refundWebsiteStatusForProviderStatus(refund.status);
  const updated = await prisma.paymentAttempt.updateMany({
    where: {
      id: attempt.id,
      websiteStatus: { not: "REFUNDED" },
    },
    data: {
      providerStatus: refund.status,
      websiteStatus,
      ...(failed ? { failedAt: refund.updatedAt } : {}),
    },
  });
  return { status: refund.status, changed: updated.count === 1 };
}
