// scripts/inspect-recent-payment-attempts.ts
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import("../lib/prisma");

  try {
    const attempts = await prisma.paymentAttempt.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        orderId: true,
        provider: true,
        providerPaymentId: true,
        providerReceiptUrl: true,
        receiptReference: true,
        providerStatus: true,
        websiteStatus: true,
        paymentPurpose: true,
        amountCents: true,
        tipCents: true,
        currency: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        serviceRequestId: true,
        metadata: true,
        expiresAt: true,
      },
    });

    console.log(JSON.stringify(attempts, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});