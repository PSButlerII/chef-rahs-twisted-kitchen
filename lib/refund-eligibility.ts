import type { PaymentPurpose, PaymentWebsiteStatus } from "@prisma/client";
import { getNormalRefundEligibility } from "@/lib/payment-config";

const BLOCKING_REFUND_STATUSES = new Set<PaymentWebsiteStatus>([
  "CREATED",
  "PENDING",
  "REQUIRES_ACTION",
  "PAID",
  "REFUNDED",
]);

type RefundAttempt = {
  provider: string;
  providerPaymentId: string | null;
  websiteStatus: PaymentWebsiteStatus;
  paymentPurpose: PaymentPurpose;
  refundedAt: Date | null;
  childPayments: {
    paymentPurpose: PaymentPurpose;
    websiteStatus: PaymentWebsiteStatus;
  }[];
  order: {
    createdAt: Date;
    status: string;
    statusHistory: { status: string }[];
  } | null;
  serviceRequestId: string | null;
};

export type PaymentRefundEligibility = {
  eligible: boolean;
  reason: string | null;
  expiresAt: Date | null;
};

export function getPaymentRefundEligibility(
  attempt: RefundAttempt,
): PaymentRefundEligibility {
  if (attempt.paymentPurpose !== "ORDER_TOTAL") {
    if (
      attempt.paymentPurpose === "SERVICE_DEPOSIT" ||
      attempt.paymentPurpose === "SERVICE_FINAL_BALANCE"
    ) {
      return {
        eligible: false,
        reason:
          "Service payment refunds are disabled until the service-work-start policy is defined.",
        expiresAt: null,
      };
    }

    return {
      eligible: false,
      reason: "This payment purpose does not support refunds.",
      expiresAt: null,
    };
  }

  if (attempt.provider !== "SQUARE") {
    return {
      eligible: false,
      reason: "Only Square payments can be refunded here.",
      expiresAt: null,
    };
  }

  if (attempt.websiteStatus !== "PAID") {
    return {
      eligible: false,
      reason:
        attempt.websiteStatus === "REFUNDED" || attempt.refundedAt
          ? "This payment has already been refunded."
          : "Only completed paid payments can be refunded.",
      expiresAt: null,
    };
  }

  if (!attempt.providerPaymentId) {
    return {
      eligible: false,
      reason: "The Square payment ID is missing.",
      expiresAt: null,
    };
  }

  if (
    attempt.refundedAt ||
    attempt.childPayments.some(
      (child) =>
        child.paymentPurpose === "REFUND" &&
        BLOCKING_REFUND_STATUSES.has(child.websiteStatus),
    )
  ) {
    return {
      eligible: false,
      reason: "A refund already exists for this payment.",
      expiresAt: null,
    };
  }

  if (!attempt.order) {
    return {
      eligible: false,
      reason: "The original order is no longer available.",
      expiresAt: null,
    };
  }

  return getNormalRefundEligibility({
    createdAt: attempt.order.createdAt,
    status: attempt.order.status,
    statusHistory: attempt.order.statusHistory.map((entry) => entry.status),
  });
}
