import "server-only";

import { OrderCancelledForNonPaymentEmail } from "@/emails/OrderCancelledForNonPaymentEmail";
import {
  getEmailDeliveryMode,
  sendAppEmail,
  type EmailDeliveryMode,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const EXPIRATION_REASON = "non_payment_timeout";
const EXPIRED_ORDER_PAYMENT_STATUS = "EXPIRED_NON_PAYMENT";
const MAX_ATTEMPTS_PER_RUN = 100;

type ExpirationMetadata = Prisma.JsonObject & {
  expirationReason: typeof EXPIRATION_REASON;
  expiredAt: string;
  expirationEmailStatus: string;
};

export type PaymentExpirationSummary = {
  attemptsChecked: number;
  attemptsExpired: number;
  ordersCancelled: number;
  emailsSent: number;
  errors: number;
};

function metadataObject(value: Prisma.JsonValue | null): Prisma.JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return {};
}

function expirationMetadata(
  value: Prisma.JsonValue | null,
  now: Date,
  emailStatus = "pending",
): ExpirationMetadata {
  return {
    ...metadataObject(value),
    expirationReason: EXPIRATION_REASON,
    expiredAt: now.toISOString(),
    expirationEmailStatus: emailStatus,
  };
}

function canCountAsSent(mode: EmailDeliveryMode) {
  return mode === "live" || mode === "preview" || mode === "dry-run";
}

export async function expirePendingPayments(
  now = new Date(),
): Promise<PaymentExpirationSummary> {
  const candidates = await prisma.paymentAttempt.findMany({
    where: {
      websiteStatus: "PENDING",
      paidAt: null,
      cancelledAt: null,
      failedAt: null,
      expiresAt: {
        not: null,
        lte: now,
      },
      NOT: {
        providerStatus: "COMPLETED",
      },
    },
    orderBy: {
      expiresAt: "asc",
    },
    take: MAX_ATTEMPTS_PER_RUN,
    include: {
      order: {
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          orderType: true,
          status: true,
          approvalStatus: true,
          paymentStatus: true,
          paidAt: true,
          total: true,
          items: {
            select: {
              name: true,
              quantity: true,
              weeklyMealPlanSelection: {
                select: {
                  weeklyMenuPeriodId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const summary: PaymentExpirationSummary = {
    attemptsChecked: candidates.length,
    attemptsExpired: 0,
    ordersCancelled: 0,
    emailsSent: 0,
    errors: 0,
  };

  for (const candidate of candidates) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const acquired = await tx.paymentAttempt.updateMany({
          where: {
            id: candidate.id,
            websiteStatus: "PENDING",
            paidAt: null,
            cancelledAt: null,
            failedAt: null,
            expiresAt: {
              not: null,
              lte: now,
            },
            NOT: {
              providerStatus: "COMPLETED",
            },
          },
          data: {
            websiteStatus: "EXPIRED",
            cancelledAt: now,
            metadata: expirationMetadata(candidate.metadata, now),
          },
        });

        if (acquired.count !== 1) {
          return { expired: false, orderCancelled: false };
        }

        await tx.paymentRetryToken.updateMany({
          where: {
            paymentAttemptId: candidate.id,
            consumedAt: null,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

        if (!candidate.order) {
          return { expired: true, orderCancelled: false };
        }

        const cancelledOrder = await tx.order.updateMany({
          where: {
            id: candidate.order.id,
            status: "PENDING",
            approvalStatus: "APPROVED",
            paymentStatus: "PAYMENT_PENDING",
            paidAt: null,
          },
          data: {
            status: "CANCELLED",
            paymentStatus: EXPIRED_ORDER_PAYMENT_STATUS,
          },
        });

        if (cancelledOrder.count !== 1) {
          return { expired: true, orderCancelled: false };
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId: candidate.order.id,
            status: "CANCELLED",
            note: "Order cancelled because payment was not completed within the two-hour payment window.",
          },
        });

        const weeklyPeriodIds = Array.from(
          new Set(
            candidate.order.items
              .map(
                (item) =>
                  item.weeklyMealPlanSelection?.weeklyMenuPeriodId ?? null,
              )
              .filter((id): id is string => Boolean(id)),
          ),
        );

        for (const weeklyPeriodId of weeklyPeriodIds) {
          await tx.$executeRaw`
            UPDATE \`WeeklyMenuPeriod\`
            SET \`ordersPlaced\` = GREATEST(\`ordersPlaced\` - 1, 0)
            WHERE \`id\` = ${weeklyPeriodId}
          `;
        }

        return { expired: true, orderCancelled: true };
      });

      if (!result.expired) continue;
      summary.attemptsExpired += 1;

      if (!result.orderCancelled || !candidate.order) continue;
      summary.ordersCancelled += 1;

      const emailMode = getEmailDeliveryMode();

      await sendAppEmail({
        to: candidate.order.customerEmail,
        subject: "Order Cancelled — Payment Not Completed",
        type: "order-cancelled-non-payment",
        react: OrderCancelledForNonPaymentEmail({
          customerName: candidate.order.customerName,
          orderId: candidate.order.id,
          orderType: candidate.order.orderType,
          total: Number(candidate.order.total),
          items: candidate.order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
          })),
        }),
      });

      const emailStatus = canCountAsSent(emailMode) ? emailMode : "disabled";

      if (canCountAsSent(emailMode)) {
        summary.emailsSent += 1;
      } else {
        summary.errors += 1;
      }

      await prisma.paymentAttempt.update({
        where: { id: candidate.id },
        data: {
          metadata: {
            ...expirationMetadata(candidate.metadata, now, emailStatus),
            expirationEmailHandledAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      summary.errors += 1;
      console.error("Failed to expire pending payment attempt.", {
        paymentAttemptId: candidate.id,
        error:
          error instanceof Error ? error.message : "Unknown expiration error",
      });
    }
  }

  return summary;
}
