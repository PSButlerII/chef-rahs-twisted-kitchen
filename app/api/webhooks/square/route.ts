import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  getSquareReconciliationConfig,
  getSquareWebhookConfig,
} from "@/lib/square";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { WebhooksHelper } from "square";
import {
  reconcileSquareRefundAttempt,
  squareRefundStateFromWebhook,
} from "@/lib/square-refund-reconciliation";
import { retrieveSquareRefund } from "@/lib/square-refund";

export const dynamic = "force-dynamic";

type SquareWebhookPayload = {
  event_id?: string;
  type?: string;
  data?: {
    object?: {
      payment?: {
        id?: string;
        order_id?: string;
        status?: string;
        location_id?: string;
        receipt_url?: string;
        receipt_number?: string;
        updated_at?: string;
        created_at?: string;
        total_money?: {
          amount?: number;
          currency?: string;
        };
      };
      refund?: {
        id?: string;
        payment_id?: string;
        status?: string;
        location_id?: string;
        reason?: string;
        updated_at?: string;
        created_at?: string;
        amount_money?: {
          amount?: number;
          currency?: string;
        };
      };
    };
  };
};

const supportedEvents = new Set([
  "payment.created",
  "payment.updated",
  "refund.created",
  "refund.updated",
]);

function isPrismaUniqueConstraintError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  const webhookConfig = getSquareWebhookConfig();
  const signature = request.headers.get("x-square-hmacsha256-signature") ?? "";

  if (!webhookConfig) {
    return NextResponse.json(
      { error: "Square webhook is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const validSignature = await WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader: signature,
    signatureKey: webhookConfig.signatureKey,
    notificationUrl: webhookConfig.notificationUrl,
  });

  if (!validSignature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: SquareWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as SquareWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventId = payload.event_id?.trim() ?? "";
  const eventType = payload.type?.trim() ?? "";

  if (!eventId || !eventType) {
    return NextResponse.json(
      { error: "Webhook event ID and type are required." },
      { status: 400 },
    );
  }

  const payment = payload.data?.object?.payment;
  const refund = payload.data?.object?.refund;
  const existingEvent = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_eventId: {
        provider: "SQUARE",
        eventId,
      },
    },
    select: { id: true },
  });

  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let storedEvent;

  try {
    storedEvent = await prisma.paymentWebhookEvent.create({
      data: {
        provider: "SQUARE",
        eventId,
        eventType,
        payloadHash: createHash("sha256").update(rawBody).digest("hex"),
        rawSummary: {
          paymentId: payment?.id ?? null,
          refundId: refund?.id ?? null,
          providerStatus: payment?.status ?? null,
          refundStatus: refund?.status ?? null,
          environment: process.env.SQUARE_ENVIRONMENT?.trim() ?? "unknown",
        },
      },
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    throw error;
  }

  if (!supportedEvents.has(eventType)) {
    await prisma.paymentWebhookEvent.update({
      where: { id: storedEvent.id },
      data: {
        processingStatus: "IGNORED",
        processedAt: new Date(),
      },
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const squareConfig = getSquareReconciliationConfig();

    if (eventType.startsWith("refund.")) {
      if (!refund) throw new Error("Refund event does not include a refund.");
      const webhookRefundState = squareRefundStateFromWebhook(refund);
      let refundState = webhookRefundState;

      const attempt = await prisma.paymentAttempt.findUnique({
        where: {
          provider_providerPaymentId: {
            provider: "SQUARE",
            providerPaymentId: refundState.id,
          },
        },
      });
      if (!attempt || attempt.paymentPurpose !== "REFUND") {
        await prisma.paymentWebhookEvent.update({
          where: { id: storedEvent.id },
          data: {
            processingStatus: "IGNORED",
            processedAt: new Date(),
            sanitizedProcessingError:
              "No matching website refund attempt was found.",
          },
        });
        return NextResponse.json({ received: true, ignored: true });
      }

      // Square can deliver an updated event while its snapshot is still
      // PENDING. Read the authoritative refund before accepting that state as
      // terminal for this delivery. This is read-only and never creates a
      // second refund.
      if (eventType === "refund.updated" && refundState.status === "PENDING") {
        refundState = await retrieveSquareRefund(refundState.id);
      }

      await reconcileSquareRefundAttempt({
        refundAttemptId: attempt.id,
        refund: refundState,
        expectedLocationId: squareConfig.locationId,
      });

      await prisma.paymentWebhookEvent.update({
        where: { id: storedEvent.id },
        data: {
          paymentAttemptId: attempt.id,
          processingStatus: "PROCESSED",
          processedAt: new Date(),
          rawSummary: {
            refundId: refundState.id,
            webhookRefundStatus: webhookRefundState.status,
            reconciledRefundStatus: refundState.status,
            environment:
              process.env.SQUARE_ENVIRONMENT?.trim() ?? "unknown",
          },
        },
      });
      return NextResponse.json({ received: true });
    }

    if (!payment?.id) {
      throw new Error("Payment event does not include a payment ID.");
    }

    let attempt = await prisma.paymentAttempt.findUnique({
      where: {
        provider_providerPaymentId: {
          provider: "SQUARE",
          providerPaymentId: payment.id,
        },
      },
    });
    if (!attempt && payment.order_id) {
      attempt = await prisma.paymentAttempt.findFirst({
        where: { provider: "SQUARE", providerOrderId: payment.order_id },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!attempt) {
      await prisma.paymentWebhookEvent.update({
        where: { id: storedEvent.id },
        data: {
          processingStatus: "IGNORED",
          processedAt: new Date(),
          sanitizedProcessingError:
            "No matching website payment attempt was found.",
        },
      });
      return NextResponse.json({ received: true, ignored: true });
    }

    const amountCents = Number(payment.total_money?.amount);
    const currency = payment.total_money?.currency;
    const paymentMatches =
      Number.isSafeInteger(amountCents) &&
      amountCents === attempt.amountCents &&
      currency === attempt.currency &&
      payment.location_id === squareConfig.locationId;

    if (!paymentMatches) {
      throw new Error(
        "Square payment amount, currency, or location does not match the ledger.",
      );
    }

    const isPaid = payment.status === "COMPLETED";
    const isAlreadyRefunded =
      attempt.websiteStatus === "REFUNDED" || Boolean(attempt.refundedAt);
    const paidAt = isPaid
      ? new Date(payment.updated_at ?? payment.created_at ?? Date.now())
      : null;
    const websiteStatus = isAlreadyRefunded
      ? "REFUNDED"
      : payment.status === "FAILED"
        ? "FAILED"
        : payment.status === "CANCELED"
          ? "CANCELLED"
          : isPaid
            ? "PAID"
            : "PENDING";

    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          providerStatus: payment.status ?? "UNKNOWN",
          providerPaymentId: payment.id,
          providerReceiptUrl: payment.receipt_url ?? null,
          receiptReference: payment.receipt_number ?? null,
          websiteStatus,
          ...(isPaid ? { paidAt } : {}),
          ...(websiteStatus === "FAILED" ? { failedAt: new Date() } : {}),
          ...(websiteStatus === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        },
      });

      if (isPaid && attempt.orderId && !isAlreadyRefunded) {
        await tx.order.update({
          where: { id: attempt.orderId },
          data: {
            status: "ACCEPTED",
            paymentProvider: "square",
            paymentStatus: "PAID",
            paidAt,
          },
        });
      }
      if (
        isPaid &&
        attempt.serviceRequestId &&
        attempt.paymentPurpose === "SERVICE_DEPOSIT"
      ) {
        await tx.cateringRequest.updateMany({
          where: {
            id: attempt.serviceRequestId,
            depositPaidAt: null,
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
          data: { status: "DEPOSIT_PAID", depositPaidAt: paidAt },
        });
      }

      await tx.paymentWebhookEvent.update({
        where: { id: storedEvent.id },
        data: {
          paymentAttemptId: attempt.id,
          processingStatus: "PROCESSED",
          processedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    await prisma.paymentWebhookEvent.update({
      where: { id: storedEvent.id },
      data: {
        processingStatus: "FAILED",
        processedAt: new Date(),
        sanitizedProcessingError:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Webhook processing failed.",
      },
    });

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
