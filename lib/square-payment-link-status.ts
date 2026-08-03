import "server-only";

import { Prisma, type PaymentAttempt } from "@prisma/client";
import { SquareError } from "square";
import { prisma } from "@/lib/prisma";
import { createSquareReconciliationClient } from "@/lib/square";

const STALE_REASON = "square_payment_link_not_found";

function metadataObject(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function isSquareNotFound(error: unknown) {
  return (
    error instanceof SquareError &&
    (error.statusCode === 404 ||
      error.errors.some((item) => item.code === "NOT_FOUND"))
  );
}

export type SquarePaymentLinkCheckResult =
  | { status: "valid" }
  | { status: "stale"; invalidated: boolean }
  | { status: "unchecked" };

export async function checkActiveServicePaymentLink(
  attempt: PaymentAttempt,
): Promise<SquarePaymentLinkCheckResult> {
  if (
    attempt.websiteStatus !== "PENDING" ||
    attempt.paidAt ||
    !["SERVICE_DEPOSIT", "SERVICE_FINAL_BALANCE"].includes(
      attempt.paymentPurpose,
    )
  ) {
    return { status: "unchecked" };
  }

  const existingMetadata = metadataObject(attempt.metadata);
  const paymentLinkId =
    typeof existingMetadata.squarePaymentLinkId === "string"
      ? existingMetadata.squarePaymentLinkId.trim()
      : "";

  if (!paymentLinkId) {
    return { status: "unchecked" };
  }

  try {
    const response =
      await createSquareReconciliationClient().checkout.paymentLinks.get({
        id: paymentLinkId,
      });

    return response.paymentLink ? { status: "valid" } : { status: "unchecked" };
  } catch (error) {
    if (!isSquareNotFound(error)) {
      console.warn("Unable to verify Square payment link availability.", {
        paymentAttemptId: attempt.id,
      });
      return { status: "unchecked" };
    }

    const checkedAt = new Date();
    const updated = await prisma.paymentAttempt.updateMany({
      where: {
        id: attempt.id,
        websiteStatus: "PENDING",
        paidAt: null,
        paymentPurpose: {
          in: ["SERVICE_DEPOSIT", "SERVICE_FINAL_BALANCE"],
        },
      },
      data: {
        websiteStatus: "EXPIRED",
        cancelledAt: checkedAt,
        metadata: {
          ...existingMetadata,
          staleReason: STALE_REASON,
          staleCheckedAt: checkedAt.toISOString(),
          staleSquarePaymentLinkId: paymentLinkId,
        },
      },
    });

    return { status: "stale", invalidated: updated.count === 1 };
  }
}
