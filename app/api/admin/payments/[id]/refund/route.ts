import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { requireAdminApi } from "@/lib/auth-guards";
import { completeRefundAttempt } from "@/lib/refund-completion";
import { getPaymentRefundEligibility } from "@/lib/refund-eligibility";
import { prisma } from "@/lib/prisma";
import { refundSquareSandboxPayment } from "@/lib/square-refund";
import { getSquareReadiness } from "@/lib/square-readiness";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function isP2002(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  const squareReadiness = getSquareReadiness();
  if (!squareReadiness.enabled) {
    return NextResponse.json(
      { error: squareReadiness.adminMessage, readiness: squareReadiness },
      { status: 503 },
    );
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    reason?: unknown;
  } | null;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (reason.length < 3 || reason.length > 500) {
    return NextResponse.json(
      { error: "A refund reason between 3 and 500 characters is required." },
      { status: 400 },
    );
  }

  const original = await prisma.paymentAttempt.findUnique({
    where: { id },
    include: {
      childPayments: {
        select: { paymentPurpose: true, websiteStatus: true },
      },
      order: {
        include: {
          statusHistory: { select: { status: true } },
        },
      },
    },
  });

  if (!original) {
    return NextResponse.json(
      { error: "Payment was not found." },
      { status: 404 },
    );
  }

  const eligibility = getPaymentRefundEligibility(original);
  if (!eligibility.eligible || !original.providerPaymentId) {
    return NextResponse.json(
      { error: eligibility.reason ?? "This payment is not refundable." },
      { status: 409 },
    );
  }

  const idempotencyKey = `refund_${createHash("sha256")
    .update(original.id)
    .digest("hex")
    .slice(0, 36)}`;
  let refundAttempt;

  try {
    refundAttempt = await prisma.paymentAttempt.create({
      data: {
        provider: "SQUARE",
        paymentPurpose: "REFUND",
        parentPaymentId: original.id,
        orderId: original.orderId,
        serviceRequestId: original.serviceRequestId,
        amountCents: original.amountCents,
        tipCents: 0,
        currency: original.currency,
        idempotencyKey,
        websiteStatus: "PENDING",
        providerStatus: "REQUESTING",
        metadata: {
          refundReason: reason,
          originalPaymentAttemptId: original.id,
          originalProviderPaymentId: original.providerPaymentId,
          environment: squareReadiness.environment,
          requestedByAdminUserId: auth.session?.user?.id ?? null,
          requestedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    if (isP2002(error)) {
      return NextResponse.json(
        { error: "A refund request already exists for this payment." },
        { status: 409 },
      );
    }
    throw error;
  }

  try {
    const squareRefund = await refundSquareSandboxPayment({
      paymentId: original.providerPaymentId,
      amountCents: original.amountCents,
      currency: original.currency,
      idempotencyKey,
      reason,
    });
    const status = squareRefund.status ?? "UNKNOWN";
    const completedAt = new Date(squareRefund.updatedAt ?? Date.now());

    await prisma.paymentAttempt.update({
      where: { id: refundAttempt.id },
      data: {
        providerPaymentId: squareRefund.id,
        providerStatus: status,
        websiteStatus:
          status === "COMPLETED"
            ? "PENDING"
            : status === "FAILED" || status === "REJECTED"
              ? "FAILED"
              : "PENDING",
        ...(status === "FAILED" || status === "REJECTED"
          ? { failedAt: completedAt }
          : {}),
      },
    });

    if (status === "COMPLETED") {
      await completeRefundAttempt({
        refundAttemptId: refundAttempt.id,
        providerStatus: status,
        completedAt,
      });
    }

    await writeAdminAuditLog({
      session: auth.session,
      action: "square_refund_requested",
      entityType: "PaymentAttempt",
      entityId: refundAttempt.id,
      metadata: {
        originalPaymentAttemptId: original.id,
        amountCents: original.amountCents,
        providerStatus: status,
        environment: squareReadiness.environment,
      },
    });

    return NextResponse.json({
      success: true,
      refundAttemptId: refundAttempt.id,
      status,
    });
  } catch (error) {
    await prisma.paymentAttempt.update({
      where: { id: refundAttempt.id },
      data: {
        providerStatus: "REQUEST_ERROR",
        metadata: {
          refundReason: reason,
          originalPaymentAttemptId: original.id,
          originalProviderPaymentId: original.providerPaymentId,
          environment: squareReadiness.environment,
          requestedByAdminUserId: auth.session?.user?.id ?? null,
          requestedAt: refundAttempt.createdAt.toISOString(),
          requestErrorAt: new Date().toISOString(),
        },
      },
    });
    console.error("Square sandbox refund request failed.", error);
    return NextResponse.json(
      {
        error:
          "Square could not confirm the refund. Review the ledger before retrying.",
      },
      { status: 502 },
    );
  }
}
