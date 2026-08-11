import {
  parseSquareRefundStatus,
  refundWebsiteStatusForProviderStatus,
} from "../lib/square-refund-status";

const expected = {
  PENDING: "PENDING",
  COMPLETED: "REFUNDED",
  FAILED: "FAILED",
  REJECTED: "FAILED",
} as const;

for (const [providerStatus, websiteStatus] of Object.entries(expected)) {
  const parsed = parseSquareRefundStatus(providerStatus.toLowerCase());
  const actual = refundWebsiteStatusForProviderStatus(parsed);
  if (actual !== websiteStatus) {
    throw new Error(
      `${providerStatus} mapped to ${actual}; expected ${websiteStatus}.`,
    );
  }
}

if (
  refundWebsiteStatusForProviderStatus(parseSquareRefundStatus("COMPLETED")) !==
  "REFUNDED"
) {
  throw new Error("Duplicate COMPLETED mapping is not idempotent.");
}

console.log("Square refund status checks passed.");
