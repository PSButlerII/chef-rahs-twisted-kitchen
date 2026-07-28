import "server-only";

import { createSquareClient, getSquareServerConfig } from "@/lib/square";

type Input = {
  amountCents: number;
  customerEmail: string;
  idempotencyKey: string;
  requestId: string;
  serviceTypeLabel: string;
};

export async function createSquareDepositPaymentLink(input: Input) {
  const config = getSquareServerConfig();
  const client = createSquareClient();
  const description = `${input.serviceTypeLabel} deposit for request ${input.requestId}`;
  const response = await client.checkout.paymentLinks.create({
    idempotencyKey: input.idempotencyKey,
    description,
    quickPay: {
      name: `${input.serviceTypeLabel} deposit`,
      priceMoney: { amount: BigInt(input.amountCents), currency: "USD" },
      locationId: config.locationId,
    },
    prePopulatedData: {
      buyerEmail: input.customerEmail,
    },
    paymentNote: description,
  });
  const link = response.paymentLink;

  if (!link?.id || !link.orderId || !link.url) {
    throw new Error("Square did not return a complete sandbox payment link.");
  }

  return {
    id: link.id,
    orderId: link.orderId,
    url: link.url,
    longUrl: link.longUrl ?? null,
  };
}
