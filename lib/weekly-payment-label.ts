const MAX_SQUARE_ITEM_NAME_LENGTH = 120;

function cleanPackageName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateLabel(value: string) {
  if (value.length <= MAX_SQUARE_ITEM_NAME_LENGTH) return value;
  return `${value.slice(0, MAX_SQUARE_ITEM_NAME_LENGTH - 1).trimEnd()}…`;
}

export function getWeeklyOrderPaymentItemName(
  selections: Array<{ packageName: string }>,
) {
  const packageNames = [
    ...new Set(
      selections
        .map((selection) => cleanPackageName(selection.packageName))
        .filter(Boolean),
    ),
  ];

  if (packageNames.length === 0) return "Weekly Meal Plan";
  if (packageNames.length === 1) {
    return truncateLabel(`Weekly Meal Plan — ${packageNames[0]}`);
  }

  return truncateLabel(
    `Weekly Meal Plans — ${packageNames[0]} + ${packageNames.length - 1} more`,
  );
}

export function getWebsiteOrderReferenceNote(orderId: string) {
  return `Website order ${orderId.slice(-8)}`;
}

export function buildSquareOrderPaymentLinkRequest(input: {
  amountCents: number;
  customerEmail: string;
  idempotencyKey: string;
  itemName: string;
  locationId: string;
  orderId: string;
  orderReferenceNote: string;
}) {
  return {
    idempotencyKey: input.idempotencyKey,
    description: `Order payment for ${input.orderId}`,
    quickPay: {
      name: input.itemName,
      priceMoney: { amount: BigInt(input.amountCents), currency: "USD" },
      locationId: input.locationId,
    },
    prePopulatedData: { buyerEmail: input.customerEmail },
    paymentNote: input.orderReferenceNote,
  } as const;
}
