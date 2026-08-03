import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { FinalBalancePaymentRequestEmail } from "@/emails/FinalBalancePaymentRequestEmail";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { requireAdminApi } from "@/lib/auth-guards";
import { getEmailDeliveryMode, sendAppEmail } from "@/lib/email";
import { formatServiceRequestType } from "@/lib/format-labels";
import { PENDING_PAYMENT_EXPIRATION_MS } from "@/lib/payment-config";
import { prisma } from "@/lib/prisma";
import { createSquareServicePaymentLink } from "@/lib/square-deposit-payment-link";
import { getSquareReadiness } from "@/lib/square-readiness";

type Context = { params: Promise<{ id: string }> };
const activeStatuses = ["CREATED", "PENDING", "REQUIRES_ACTION"] as const;

function metadata(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export async function POST(_request: Request, context: Context) {
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const squareReadiness = getSquareReadiness();
  if (!squareReadiness.enabled) {
    return NextResponse.json(
      { error: squareReadiness.adminMessage, readiness: squareReadiness },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const now = new Date();
  const serviceRequest = await prisma.cateringRequest.findUnique({
    where: { id },
  });
  if (!serviceRequest) {
    return NextResponse.json(
      { error: "Service request not found." },
      { status: 404 },
    );
  }

  const quoteTotalCents =
    serviceRequest.estimatedTotal === null
      ? null
      : Math.round(Number(serviceRequest.estimatedTotal) * 100);
  const depositCents = serviceRequest.depositAmount
    ? Math.round(Number(serviceRequest.depositAmount) * 100)
    : 0;
  const amountCents =
    quoteTotalCents === null ? 0 : quoteTotalCents - depositCents;

  if (serviceRequest.approvalStatus !== "APPROVED") {
    return NextResponse.json(
      { error: "Approve the service request first." },
      { status: 409 },
    );
  }
  if (!serviceRequest.depositPaidAt) {
    return NextResponse.json(
      { error: "The deposit must be paid first." },
      { status: 409 },
    );
  }
  if (quoteTotalCents === null) {
    return NextResponse.json(
      { error: "Set a quoted total first." },
      { status: 409 },
    );
  }
  if (
    amountCents <= 0 ||
    ["COMPLETED", "CANCELLED"].includes(serviceRequest.status)
  ) {
    return NextResponse.json(
      { error: "This service request has no payable final balance." },
      { status: 409 },
    );
  }

  const paidAttempt = await prisma.paymentAttempt.findFirst({
    where: {
      serviceRequestId: id,
      paymentPurpose: "SERVICE_FINAL_BALANCE",
      websiteStatus: "PAID",
      paidAt: { not: null },
    },
    select: { id: true },
  });
  if (paidAttempt) {
    return NextResponse.json(
      { error: "The final balance is already paid." },
      { status: 409 },
    );
  }

  let attempt = await prisma.paymentAttempt.findFirst({
    where: {
      serviceRequestId: id,
      paymentPurpose: "SERVICE_FINAL_BALANCE",
      websiteStatus: { in: [...activeStatuses] },
      paidAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
  let created = false;
  if (!attempt) {
    const count = await prisma.paymentAttempt.count({
      where: {
        serviceRequestId: id,
        paymentPurpose: "SERVICE_FINAL_BALANCE",
      },
    });
    const idempotencyKey = `bal_${createHash("sha256")
      .update(`${id}:${amountCents}:${count + 1}`)
      .digest("hex")
      .slice(0, 40)}`;
    try {
      attempt = await prisma.paymentAttempt.create({
        data: {
          provider: "SQUARE",
          paymentPurpose: "SERVICE_FINAL_BALANCE",
          websiteStatus: "PENDING",
          providerStatus: "PAYMENT_LINK_PENDING",
          amountCents,
          tipCents: 0,
          currency: "USD",
          idempotencyKey,
          serviceRequestId: id,
          expiresAt: new Date(now.getTime() + PENDING_PAYMENT_EXPIRATION_MS),
          metadata: {
            environment: squareReadiness.environment,
            serviceRequestId: id,
            serviceType: serviceRequest.requestType,
            quoteTotalCents,
            depositPaidCents: depositCents,
            remainingBalanceCents: amountCents,
          },
        },
      });
      created = true;
    } catch (error) {
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
      ) {
        throw error;
      }
      attempt = await prisma.paymentAttempt.findUnique({
        where: { idempotencyKey },
      });
    }
  }
  if (!attempt) {
    throw new Error("Unable to acquire final-balance payment attempt.");
  }

  const existingMetadata = metadata(attempt.metadata);
  let paymentUrl =
    typeof existingMetadata.squarePaymentLinkUrl === "string"
      ? existingMetadata.squarePaymentLinkUrl
      : null;
  if (!paymentUrl) {
    const serviceTypeLabel = formatServiceRequestType(
      serviceRequest.requestType,
    );
    const link = await createSquareServicePaymentLink({
      amountCents: attempt.amountCents,
      customerEmail: serviceRequest.email,
      idempotencyKey: attempt.idempotencyKey,
      requestId: id,
      serviceTypeLabel,
      purposeLabel: "final balance",
    });
    paymentUrl = link.url;
    attempt = await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        providerOrderId: link.orderId,
        providerStatus: "PAYMENT_LINK_CREATED",
        metadata: {
          ...existingMetadata,
          squarePaymentLinkId: link.id,
          squarePaymentLinkUrl: link.url,
          squarePaymentLinkLongUrl: link.longUrl,
        },
      },
    });
  }

  const latestMetadata = metadata(attempt.metadata);
  const emailAlreadyHandled =
    typeof latestMetadata.finalBalanceEmailHandledAt === "string";
  if (!emailAlreadyHandled) {
    const serviceTypeLabel = formatServiceRequestType(
      serviceRequest.requestType,
    );
    const mode = getEmailDeliveryMode();
    await sendAppEmail({
      to: serviceRequest.email,
      subject: `Your ${serviceTypeLabel.toLowerCase()} final balance is ready`,
      type: "service-final-balance-payment-request",
      react: FinalBalancePaymentRequestEmail({
        customerName: serviceRequest.name,
        serviceType: serviceTypeLabel,
        quotedTotal: quoteTotalCents / 100,
        depositPaid: depositCents / 100,
        remainingBalance: attempt.amountCents / 100,
        paymentUrl,
      }),
    });
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        metadata: {
          ...latestMetadata,
          finalBalanceEmailMode: mode,
          finalBalanceEmailHandledAt: new Date().toISOString(),
        },
      },
    });
    await writeAdminAuditLog({
      session,
      action: "SERVICE_FINAL_BALANCE_PAYMENT_REQUEST_SENT",
      entityType: "CateringRequest",
      entityId: id,
      metadata: {
        paymentAttemptId: attempt.id,
        environment: squareReadiness.environment,
      },
    });
  }

  return NextResponse.json({
    created,
    duplicate: !created,
    paymentAttemptId: attempt.id,
    paymentUrl,
    expiresAt: attempt.expiresAt,
  });
}
