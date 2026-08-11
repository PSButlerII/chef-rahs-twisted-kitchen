import "server-only";

import type { Prisma } from "@prisma/client";
import { RefundConfirmationEmail } from "@/emails/RefundConfirmationEmail";
import { getEmailDeliveryMode, sendAppEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

function metadataObject(value: Prisma.JsonValue | null) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export async function completeRefundAttempt({
  refundAttemptId,
  providerStatus,
  completedAt,
}: {
  refundAttemptId: string;
  providerStatus: string;
  completedAt: Date;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const transitioned = await tx.paymentAttempt.updateMany({
      where: {
        id: refundAttemptId,
        websiteStatus: { not: "REFUNDED" },
      },
      data: {
        providerStatus,
        websiteStatus: "REFUNDED",
        refundedAt: completedAt,
        failedAt: null,
      },
    });
    const refund = await tx.paymentAttempt.findUniqueOrThrow({
      where: { id: refundAttemptId },
      include: {
        parentPayment: true,
        order: true,
        serviceRequest: true,
      },
    });

    if (refund.paymentPurpose !== "REFUND" || !refund.parentPayment) {
      throw new Error("Refund ledger lineage is invalid.");
    }

    const metadata = metadataObject(refund.metadata);
    const reason =
      typeof metadata.refundReason === "string"
        ? metadata.refundReason
        : "Admin-approved full refund";

    await tx.paymentAttempt.update({
      where: { id: refund.parentPayment.id },
      data: {
        websiteStatus: "REFUNDED",
        refundedAt: completedAt,
      },
    });

    const order = refund.order;
    const isFullOrderRefund =
      Boolean(order) &&
      refund.parentPayment.paymentPurpose === "ORDER_TOTAL" &&
      refund.amountCents === refund.parentPayment.amountCents;

    if (isFullOrderRefund && order && order.status !== "REFUNDED") {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "REFUNDED",
          paymentStatus: "REFUNDED",
          statusHistory: {
            create: {
              status: "REFUNDED",
              note: "Full Square refund completed.",
            },
          },
        },
      });
    }

    return {
      transitioned: transitioned.count === 1,
      refundId: refund.id,
      metadata,
      reason,
      amountCents: refund.amountCents,
      customerName:
        refund.order?.customerName ?? refund.serviceRequest?.name ?? "Customer",
      customerEmail:
        refund.order?.customerEmail ?? refund.serviceRequest?.email ?? null,
      referenceLabel: refund.order ? "Order ID" : "Request ID",
      referenceId: refund.order?.id ?? refund.serviceRequest?.id ?? refund.id,
    };
  });

  if (result.transitioned && result.customerEmail) {
    const deliveryMode = getEmailDeliveryMode();
    await sendAppEmail({
      to: result.customerEmail,
      subject: `Refund completed for ${result.referenceId}`,
      type: "refund-confirmation",
      react: RefundConfirmationEmail({
        customerName: result.customerName,
        referenceLabel: result.referenceLabel,
        referenceId: result.referenceId,
        amount: result.amountCents / 100,
        reason: result.reason,
      }),
    });
    await prisma.paymentAttempt.update({
      where: { id: result.refundId },
      data: {
        metadata: {
          ...result.metadata,
          refundEmailHandledAt: new Date().toISOString(),
          refundEmailDeliveryMode: deliveryMode,
        },
      },
    });
  }

  return result;
}
