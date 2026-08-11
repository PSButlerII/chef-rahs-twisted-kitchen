import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const AFFECTED = {
  orderId: "cmsor3yxz0000rv3plvm7j5gi",
  parentPaymentId: "cmsor3yyc0003rv3p8lqy7z60",
  refundAttemptId: "cmsor6p2h000erv3p8o7hljt5",
} as const;

async function main() {
  const apply = process.argv.includes("--apply");
  const { prisma } = await import("../lib/prisma");
  const { getSquareReconciliationConfig } = await import("../lib/square");
  const { retrieveSquareRefund } = await import("../lib/square-refund");
  const { reconcileSquareRefundAttempt } = await import(
    "../lib/square-refund-reconciliation"
  );

  try {
    const refundAttempt = await prisma.paymentAttempt.findUnique({
      where: { id: AFFECTED.refundAttemptId },
      include: { parentPayment: true, order: true },
    });
    if (!refundAttempt) throw new Error("Affected refund attempt was not found.");
    if (
      refundAttempt.paymentPurpose !== "REFUND" ||
      refundAttempt.orderId !== AFFECTED.orderId ||
      refundAttempt.parentPaymentId !== AFFECTED.parentPaymentId ||
      refundAttempt.parentPayment?.id !== AFFECTED.parentPaymentId ||
      refundAttempt.order?.id !== AFFECTED.orderId
    ) {
      throw new Error("Affected refund lineage does not match the guarded IDs.");
    }
    if (!refundAttempt.providerPaymentId) {
      throw new Error("Affected refund has no Square refund ID.");
    }

    const config = getSquareReconciliationConfig();
    const providerRefund = await retrieveSquareRefund(
      refundAttempt.providerPaymentId,
    );
    console.log({
      mode: apply ? "apply" : "dry-run",
      environment: config.environment,
      orderId: AFFECTED.orderId,
      parentPaymentId: AFFECTED.parentPaymentId,
      refundAttemptId: AFFECTED.refundAttemptId,
      providerRefundId: providerRefund.id,
      providerStatus: providerRefund.status,
      amountCents: providerRefund.amountCents,
      currentWebsiteStatus: refundAttempt.websiteStatus,
    });

    if (providerRefund.status !== "COMPLETED") {
      throw new Error(
        `Square refund is ${providerRefund.status}; refusing completion backfill.`,
      );
    }
    if (!apply) {
      console.log(
        "Dry-run only. Re-run with --apply after reviewing the provider result.",
      );
      return;
    }

    const result = await reconcileSquareRefundAttempt({
      refundAttemptId: refundAttempt.id,
      refund: providerRefund,
      expectedLocationId: config.locationId,
    });
    const updated = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: refundAttempt.id },
      include: { parentPayment: true, order: true },
    });
    console.log({
      reconciled: true,
      changed: result.changed,
      refundWebsiteStatus: updated.websiteStatus,
      refundProviderStatus: updated.providerStatus,
      refundRefundedAt: updated.refundedAt,
      parentWebsiteStatus: updated.parentPayment?.websiteStatus,
      parentRefundedAt: updated.parentPayment?.refundedAt,
      orderStatus: updated.order?.status,
      orderPaymentStatus: updated.order?.paymentStatus,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
