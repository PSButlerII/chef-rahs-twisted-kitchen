import "server-only";

import { createSquareClient, getSquareServerConfig } from "@/lib/square";

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
    throw new Error("Square sandbox refunds currently support USD only.");
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
