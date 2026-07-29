export const serviceRequestPaymentPhases = [
  "NOT_READY",
  "DEPOSIT_DUE",
  "DEPOSIT_PAID",
  "FINAL_BALANCE_DUE",
  "FINAL_BALANCE_PENDING",
  "PAID_IN_FULL",
] as const;

export type ServiceRequestPaymentPhase =
  (typeof serviceRequestPaymentPhases)[number];

type PaymentAttemptSummary = {
  paymentPurpose: string;
  websiteStatus: string;
  paidAt: Date | null;
  expiresAt: Date | null;
};

type Input = {
  approvalStatus: string;
  estimatedTotal: number | null;
  depositAmount: number | null;
  depositPaidAt: Date | null;
  paymentAttempts: PaymentAttemptSummary[];
};

export function deriveServiceRequestPaymentPhase(
  input: Input,
  now = new Date(),
): ServiceRequestPaymentPhase {
  const finalBalanceAttempts = input.paymentAttempts.filter(
    (attempt) => attempt.paymentPurpose === "SERVICE_FINAL_BALANCE",
  );
  const finalBalancePaid = finalBalanceAttempts.some(
    (attempt) => attempt.websiteStatus === "PAID" && Boolean(attempt.paidAt),
  );

  if (input.depositPaidAt && finalBalancePaid) {
    return "PAID_IN_FULL";
  }

  const finalBalancePending = finalBalanceAttempts.some(
    (attempt) =>
      ["CREATED", "PENDING", "REQUIRES_ACTION"].includes(
        attempt.websiteStatus,
      ) &&
      !attempt.paidAt &&
      Boolean(attempt.expiresAt && attempt.expiresAt > now),
  );

  if (input.depositPaidAt && finalBalancePending) {
    return "FINAL_BALANCE_PENDING";
  }

  const totalCents =
    input.estimatedTotal === null
      ? null
      : Math.round(input.estimatedTotal * 100);
  const depositCents =
    input.depositAmount === null ? 0 : Math.round(input.depositAmount * 100);

  if (
    input.depositPaidAt &&
    totalCents !== null &&
    totalCents - depositCents > 0
  ) {
    return "FINAL_BALANCE_DUE";
  }

  if (input.depositPaidAt) {
    return "DEPOSIT_PAID";
  }

  if (
    input.approvalStatus === "APPROVED" &&
    input.depositAmount !== null &&
    input.depositAmount > 0
  ) {
    return "DEPOSIT_DUE";
  }

  return "NOT_READY";
}

export function formatServiceRequestPaymentPhase(
  phase: ServiceRequestPaymentPhase,
) {
  switch (phase) {
    case "NOT_READY":
      return "Payment Not Ready";
    case "DEPOSIT_DUE":
      return "Deposit Due";
    case "DEPOSIT_PAID":
      return "Deposit Paid";
    case "FINAL_BALANCE_DUE":
      return "Final Balance Due";
    case "FINAL_BALANCE_PENDING":
      return "Final Balance Pending";
    case "PAID_IN_FULL":
      return "Paid in Full";
  }
}

export function serviceRequestPaymentPhaseBadgeClass(
  phase: ServiceRequestPaymentPhase,
) {
  if (phase === "PAID_IN_FULL" || phase === "DEPOSIT_PAID") {
    return "admin-badge admin-badge-success";
  }
  if (phase === "FINAL_BALANCE_PENDING") {
    return "admin-badge admin-badge-info";
  }
  if (phase === "NOT_READY") {
    return "admin-badge admin-badge-neutral";
  }
  return "admin-badge admin-badge-warning";
}
