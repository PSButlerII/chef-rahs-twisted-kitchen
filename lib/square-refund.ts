import "server-only";

import {
  createSquareClient,
  createSquareReconciliationClient,
  getSquareServerConfig,
} from "@/lib/square";
import { parseSquareRefundStatus } from "@/lib/square-refund-status";
import type { SquareRefundState } from "@/lib/square-refund-reconciliation";

type RefundSquarePaymentInput = {
  paymentId: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  reason: string;
};

export async function refundSquareSandboxPayment({
  paymentId,
  amountCents,
  currency,
  idempotencyKey,
  reason,
}: RefundSquarePaymentInput) {
  getSquareServerConfig();
  if (currency !== "USD") {
    throw new Error("Square refunds currently support USD only.");
  }

  const response = await createSquareClient().refunds.refundPayment({
    idempotencyKey,
    paymentId,
    amountMoney: {
      amount: BigInt(amountCents),
      currency: "USD",
    },
    reason,
  });

  if (!response.refund?.id) {
    throw new Error("Square did not return a refund record.");
  }

  return response.refund;
}

export async function retrieveSquareRefund(
  refundId: string,
): Promise<SquareRefundState> {
  const response = await createSquareReconciliationClient().refunds.get({
    refundId,
  });
  const refund = response.refund;
  if (!refund?.id) throw new Error("Square did not return the requested refund.");

  return {
    id: refund.id,
    status: parseSquareRefundStatus(refund.status),
    paymentId: refund.paymentId?.trim() || null,
    locationId: refund.locationId?.trim() || null,
    amountCents: Number(refund.amountMoney.amount),
    currency: refund.amountMoney.currency?.trim() || null,
    updatedAt: new Date(refund.updatedAt ?? refund.createdAt ?? Date.now()),
  };
}
