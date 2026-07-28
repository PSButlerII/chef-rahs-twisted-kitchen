import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { DepositPaymentRequestEmail } from "@/emails/DepositPaymentRequestEmail";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { requireAdminApi } from "@/lib/auth-guards";
import { getEmailDeliveryMode, sendAppEmail } from "@/lib/email";
import { formatServiceRequestType } from "@/lib/format-labels";
import { PENDING_PAYMENT_EXPIRATION_MS } from "@/lib/payment-config";
import { prisma } from "@/lib/prisma";
import { createSquareDepositPaymentLink } from "@/lib/square-deposit-payment-link";

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
  const amountCents = serviceRequest.depositAmount
    ? Math.round(Number(serviceRequest.depositAmount) * 100)
    : 0;
  if (serviceRequest.approvalStatus !== "APPROVED") {
    return NextResponse.json(
      { error: "Approve the service request first." },
      { status: 409 },
    );
  }
  if (serviceRequest.depositPaidAt) {
    return NextResponse.json(
      { error: "The deposit is already paid." },
      { status: 409 },
    );
  }
  if (
    amountCents <= 0 ||
    ["COMPLETED", "CANCELLED"].includes(serviceRequest.status)
  ) {
    return NextResponse.json(
      { error: "This service request has no payable deposit." },
      { status: 409 },
    );
  }

  let attempt = await prisma.paymentAttempt.findFirst({
    where: {
      serviceRequestId: id,
      paymentPurpose: "SERVICE_DEPOSIT",
      websiteStatus: { in: [...activeStatuses] },
      paidAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
  let created = false;
  if (!attempt) {
    const count = await prisma.paymentAttempt.count({
      where: { serviceRequestId: id, paymentPurpose: "SERVICE_DEPOSIT" },
    });
    const idempotencyKey = `dep_${createHash("sha256")
      .update(`${id}:${amountCents}:${count + 1}`)
      .digest("hex")
      .slice(0, 40)}`;
    try {
      attempt = await prisma.paymentAttempt.create({
        data: {
          provider: "SQUARE",
          paymentPurpose: "SERVICE_DEPOSIT",
          websiteStatus: "PENDING",
          providerStatus: "PAYMENT_LINK_PENDING",
          amountCents,
          tipCents: 0,
          currency: "USD",
          idempotencyKey,
          serviceRequestId: id,
          expiresAt: new Date(now.getTime() + PENDING_PAYMENT_EXPIRATION_MS),
          metadata: {
            environment: "sandbox",
            serviceRequestId: id,
            serviceType: serviceRequest.requestType,
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
      )
        throw error;
      attempt = await prisma.paymentAttempt.findUnique({
        where: { idempotencyKey },
      });
    }
  }
  if (!attempt) throw new Error("Unable to acquire deposit payment attempt.");
  const existingMetadata = metadata(attempt.metadata);
  let paymentUrl =
    typeof existingMetadata.squarePaymentLinkUrl === "string"
      ? existingMetadata.squarePaymentLinkUrl
      : null;
  if (!paymentUrl) {
    const serviceTypeLabel = formatServiceRequestType(
      serviceRequest.requestType,
    );
    const link = await createSquareDepositPaymentLink({
      amountCents: attempt.amountCents,
      customerEmail: serviceRequest.email,
      idempotencyKey: attempt.idempotencyKey,
      requestId: id,
      serviceTypeLabel,
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
    typeof latestMetadata.depositEmailHandledAt === "string";
  if (!emailAlreadyHandled) {
    const serviceTypeLabel = formatServiceRequestType(
      serviceRequest.requestType,
    );
    const mode = getEmailDeliveryMode();
    await sendAppEmail({
      to: serviceRequest.email,
      subject: `Your ${serviceTypeLabel.toLowerCase()} deposit is ready`,
      type: "service-deposit-payment-request",
      react: DepositPaymentRequestEmail({
        customerName: serviceRequest.name,
        serviceType: serviceTypeLabel,
        depositAmount: attempt.amountCents / 100,
        paymentUrl,
      }),
    });
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        metadata: {
          ...latestMetadata,
          depositEmailMode: mode,
          depositEmailHandledAt: new Date().toISOString(),
        },
      },
    });
    await writeAdminAuditLog({
      session,
      action: "SERVICE_DEPOSIT_PAYMENT_REQUEST_SENT",
      entityType: "CateringRequest",
      entityId: id,
      metadata: { paymentAttemptId: attempt.id, environment: "sandbox" },
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
