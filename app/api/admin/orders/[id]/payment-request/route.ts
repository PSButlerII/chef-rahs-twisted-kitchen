import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { OrderPaymentRequestEmail } from "@/emails/OrderPaymentRequestEmail";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { requireAdminApi } from "@/lib/auth-guards";
import { getEmailDeliveryMode, sendAppEmail } from "@/lib/email";
import { PENDING_PAYMENT_EXPIRATION_MS } from "@/lib/payment-config";
import { prisma } from "@/lib/prisma";
import { createSquareOrderPaymentLink } from "@/lib/square-deposit-payment-link";
import { getSquareReadiness } from "@/lib/square-readiness";

type Context = { params: Promise<{ id: string }> };
const activeStatuses = ["CREATED", "PENDING", "REQUIRES_ACTION"] as const;
function metadata(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export async function POST(_request: Request, context: Context) {
  const { session, response } = await requireAdminApi();
  if (response) return response;
  const readiness = getSquareReadiness();
  if (!readiness.enabled) {
    return NextResponse.json({ error: readiness.adminMessage }, { status: 503 });
  }
  const { id } = await context.params;
  const now = new Date();
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { select: { weeklyMealPlanSelection: { select: { id: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const isWeekly = order.items.some((item) => Boolean(item.weeklyMealPlanSelection));
  if (!isWeekly || order.approvalStatus !== "APPROVED") {
    return NextResponse.json({ error: "Only approved weekly orders support this payment request." }, { status: 409 });
  }
  if (order.paidAt || order.paymentStatus === "PAID") {
    return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
  }
  if (["CANCELLED", "COMPLETED", "REFUNDED"].includes(order.status)) {
    return NextResponse.json({ error: "This order is no longer payable." }, { status: 409 });
  }
  const amountCents = Math.round(Number(order.total) * 100);
  if (amountCents <= 0) return NextResponse.json({ error: "This order has no payable balance." }, { status: 409 });

  let attempt = await prisma.paymentAttempt.findFirst({
    where: { orderId: id, paymentPurpose: "ORDER_TOTAL", websiteStatus: { in: [...activeStatuses] }, paidAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  let created = false;
  if (!attempt) {
    const count = await prisma.paymentAttempt.count({ where: { orderId: id, paymentPurpose: "ORDER_TOTAL" } });
    const idempotencyKey = `ordlink_${createHash("sha256").update(`${id}:${amountCents}:${count + 1}`).digest("hex").slice(0, 36)}`;
    try {
      attempt = await prisma.paymentAttempt.create({
        data: { provider: "SQUARE", paymentPurpose: "ORDER_TOTAL", websiteStatus: "PENDING", providerStatus: "PAYMENT_LINK_PENDING", amountCents, tipCents: Math.round(Number(order.tipAmount) * 100), currency: "USD", idempotencyKey, orderId: id, expiresAt: new Date(now.getTime() + PENDING_PAYMENT_EXPIRATION_MS), metadata: { environment: readiness.environment, checkout: "approved-weekly-payment-request" } },
      });
      created = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      attempt = await prisma.paymentAttempt.findUnique({ where: { idempotencyKey } });
    }
  }
  if (!attempt) throw new Error("Unable to acquire order payment attempt.");
  let attemptMetadata = metadata(attempt.metadata);
  let paymentUrl = typeof attemptMetadata.squarePaymentLinkUrl === "string" ? attemptMetadata.squarePaymentLinkUrl : null;
  if (!paymentUrl) {
    const link = await createSquareOrderPaymentLink({ amountCents: attempt.amountCents, customerEmail: order.customerEmail, idempotencyKey: attempt.idempotencyKey, orderId: id });
    paymentUrl = link.url;
    attemptMetadata = { ...attemptMetadata, squarePaymentLinkId: link.id, squarePaymentLinkUrl: link.url, squarePaymentLinkLongUrl: link.longUrl };
    attempt = await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { providerOrderId: link.orderId, providerStatus: "PAYMENT_LINK_CREATED", metadata: attemptMetadata } });
  }
  const mode = getEmailDeliveryMode();
  await sendAppEmail({ to: order.customerEmail, subject: "Your approved order is ready for payment", type: "approved-order-payment-request", react: OrderPaymentRequestEmail({ customerName: order.customerName, orderId: id, amountDue: attempt.amountCents / 100, paymentUrl, environment: readiness.environment }) });
  await prisma.$transaction([
    prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { metadata: { ...attemptMetadata, paymentRequestEmailMode: mode, paymentRequestEmailHandledAt: new Date().toISOString() } } }),
    prisma.order.update({ where: { id }, data: { paymentProvider: "square", paymentStatus: "PAYMENT_PENDING", payByDate: attempt.expiresAt } }),
  ]);
  await writeAdminAuditLog({ session, action: created ? "ORDER_PAYMENT_REQUEST_SENT" : "ORDER_PAYMENT_REQUEST_RESENT", entityType: "Order", entityId: id, metadata: { paymentAttemptId: attempt.id, environment: readiness.environment } });
  return NextResponse.json({ created, duplicate: !created, paymentAttemptId: attempt.id, paymentUrl, expiresAt: attempt.expiresAt });
}
