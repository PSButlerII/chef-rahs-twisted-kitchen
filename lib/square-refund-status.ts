export const SQUARE_REFUND_STATUSES = [
  "PENDING",
  "COMPLETED",
  "REJECTED",
  "FAILED",
] as const;

export type SquareRefundStatus = (typeof SQUARE_REFUND_STATUSES)[number];

export function parseSquareRefundStatus(value: unknown): SquareRefundStatus {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (
    SQUARE_REFUND_STATUSES.includes(normalized as SquareRefundStatus)
  ) {
    return normalized as SquareRefundStatus;
  }

  throw new Error("Square refund status is missing or unsupported.");
}

export function refundWebsiteStatusForProviderStatus(
  status: SquareRefundStatus,
) {
  return status === "COMPLETED"
    ? "REFUNDED"
    : status === "FAILED" || status === "REJECTED"
      ? "FAILED"
      : "PENDING";
}
