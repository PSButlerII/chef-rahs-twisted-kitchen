export const PENDING_PAYMENT_EXPIRATION_MINUTES = 120;
export const PENDING_PAYMENT_EXPIRATION_MS =
  PENDING_PAYMENT_EXPIRATION_MINUTES * 60 * 1000;
export const GUEST_PAYMENT_RETRY_EXPIRATION_MINUTES = 120;
export const NORMAL_REFUND_WINDOW_HOURS = 24;
export const NORMAL_REFUND_WINDOW_MS =
  NORMAL_REFUND_WINDOW_HOURS * 60 * 60 * 1000;
export const TIP_PRESET_PERCENTAGES = [10, 15, 20] as const;
export const TAXES_INCLUDED_IN_LISTED_PRICES = true;

export const PAYMENT_METHOD_AWAITING_APPROVAL = "approval";
export const PAYMENT_STATUS_AWAITING_APPROVAL = "AWAITING_APPROVAL";

type PaymentEnvironment = {
  NODE_ENV?: string;
  ALLOW_MANUAL_PAYMENT_IN_CHECKOUT?: string;
};

export function isManualPaymentCheckoutAllowed(
  environment: PaymentEnvironment = process.env,
) {
  return (
    environment.NODE_ENV !== "production" &&
    environment.ALLOW_MANUAL_PAYMENT_IN_CHECKOUT === "true"
  );
}

const REFUND_BLOCKED_STATUSES = new Set([
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

type RefundEligibilityInput = {
  createdAt: Date;
  status: string;
  statusHistory?: string[];
  now?: Date;
};

export type RefundEligibility = {
  eligible: boolean;
  reason: string | null;
  expiresAt: Date;
};

export function getNormalRefundEligibility({
  createdAt,
  status,
  statusHistory = [],
  now = new Date(),
}: RefundEligibilityInput): RefundEligibility {
  const expiresAt = new Date(createdAt.getTime() + NORMAL_REFUND_WINDOW_MS);

  if (
    REFUND_BLOCKED_STATUSES.has(status) ||
    statusHistory.some((historicalStatus) =>
      REFUND_BLOCKED_STATUSES.has(historicalStatus),
    )
  ) {
    return {
      eligible: false,
      reason:
        "Normal refunds are unavailable after preparation or service work starts, after fulfillment, or for a final order.",
      expiresAt,
    };
  }

  if (now.getTime() > expiresAt.getTime()) {
    return {
      eligible: false,
      reason: "The 24-hour normal refund window has expired.",
      expiresAt,
    };
  }

  return {
    eligible: true,
    reason: null,
    expiresAt,
  };
}
