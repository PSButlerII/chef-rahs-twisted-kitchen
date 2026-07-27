import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth-guards";
import { MarkOrderPaidButton } from "@/components/admin/MarkOrderPaidButton";
import { formatPaymentStatus } from "@/lib/format-labels";
import type { DecimalLike } from "@/types/display";

type PaymentDueOrder = {
  id: string;
  customerName: string;
  customerEmail: string;
  paymentStatus: string | null;
  payByDate: Date | null;
  total: DecimalLike;
};

type ReconciliationOrder = {
  id: string;
  customerName: string;
  status: string;
  paymentProvider: string | null;
  paymentStatus: string | null;
  paidAt: Date | null;
  total: DecimalLike;
  paymentAttempts: LedgerPaymentAttempt[];
};

type LedgerPaymentAttempt = {
  id: string;
  provider: string;
  providerPaymentId: string | null;
  providerReceiptUrl: string | null;
  receiptReference: string | null;
  providerStatus: string | null;
  websiteStatus: string;
  paymentPurpose: string;
  amountCents: number;
  tipCents: number;
  currency: string;
  expiresAt: Date | null;
  paidAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
};

function getWebsiteMismatchWarning(
  order: ReconciliationOrder,
  ledgerAttempt: LedgerPaymentAttempt | undefined,
) {
  if (order.paymentStatus === "PAID" && !order.paidAt) {
    return "Paid status has no paid timestamp.";
  }

  if (order.paymentStatus !== "PAID" && order.paidAt) {
    return "Paid timestamp conflicts with website status.";
  }

  if (!ledgerAttempt) {
    return null;
  }

  if (
    (ledgerAttempt.websiteStatus === "PAID") !==
    (order.paymentStatus === "PAID")
  ) {
    return "Ledger and order payment statuses disagree.";
  }

  if (
    ledgerAttempt.paymentPurpose === "ORDER_TOTAL" &&
    ledgerAttempt.amountCents !== Math.round(Number(order.total) * 100)
  ) {
    return "Ledger amount does not match the order total.";
  }

  if (
    ledgerAttempt.websiteStatus === "PAID" &&
    Boolean(ledgerAttempt.paidAt) !== Boolean(order.paidAt)
  ) {
    return "Ledger and order paid timestamps disagree.";
  }

  return null;
}

export default async function AdminPaymentsPage() {
  await requireAdminPage();

  const [paymentDueOrders, reconciliationOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: {
          notIn: ["CANCELLED", "REFUNDED"],
        },
        paymentStatus: {
          in: ["PAY_BY_DATE", "OFFLINE_PAYMENT_DUE"],
        },
      },
      orderBy: {
        payByDate: "asc",
      },
      include: {
        items: true,
      },
    }) as Promise<PaymentDueOrder[]>,
    prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        customerName: true,
        status: true,
        paymentProvider: true,
        paymentStatus: true,
        paidAt: true,
        total: true,
        paymentAttempts: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          select: {
            id: true,
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
            expiresAt: true,
            paidAt: true,
            failedAt: true,
            cancelledAt: true,
            refundedAt: true,
            createdAt: true,
          },
        },
      },
    }) as Promise<ReconciliationOrder[]>,
  ]);

  const totalDue = paymentDueOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );

  return (
    <main className="admin-page">
      <div className="admin-container">
        <div className="mb-8">
          <Link className="admin-back-link" href="/admin">
            &larr; Back to Dashboard
          </Link>
          <p className="admin-eyebrow mt-5">Admin</p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Payment Management
          </h1>

          <p className="mt-3 max-w-2xl text-[#6b5a50]">
            Monitor manual invoices, offline payments, deposits, and future
            online payment integrations.
          </p>
        </div>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="admin-card p-6">
            <p className="text-sm font-bold text-[#6b5a50]">Payments Due</p>
            <p className="mt-3 text-4xl font-black tracking-tight">
              {paymentDueOrders.length}
            </p>
          </div>

          <div className="admin-card p-6">
            <p className="text-sm font-bold text-[#6b5a50]">
              Outstanding Total
            </p>
            <p className="mt-3 text-4xl font-black tracking-tight">
              ${totalDue.toFixed(2)}
            </p>
          </div>

          <div className="admin-card p-6">
            <p className="text-sm font-bold text-[#6b5a50]">
              Square Connection
            </p>
            <p className="mt-3 text-2xl font-black">Not Connected</p>
          </div>
        </section>

        <section className="admin-card mt-10 overflow-hidden">
          <div className="border-b border-[#ead8c1] p-6">
            <h2 className="text-2xl font-black">Payment Reconciliation</h2>
            <p className="mt-2 text-sm text-[#6b5a50]">
              Website payment summaries are available now. Square status,
              payment IDs, receipts, refunds, and provider mismatch checks
              require the future payment ledger and webhook integration.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-table min-w-[1180px]">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Website Status</th>
                  <th>Square Status</th>
                  <th>Square Payment ID</th>
                  <th>Receipt / Reference</th>
                  <th>Paid At</th>
                  <th>Refund Status</th>
                  <th>Mismatch Warning</th>
                </tr>
              </thead>

              <tbody>
                {reconciliationOrders.map((order) => {
                  const latestPaymentAttempt = order.paymentAttempts.find(
                    (attempt) => attempt.paymentPurpose !== "REFUND",
                  );
                  const latestSquareAttempt = order.paymentAttempts.find(
                    (attempt) =>
                      attempt.provider === "SQUARE" &&
                      attempt.paymentPurpose !== "REFUND",
                  );
                  const latestRefundAttempt = order.paymentAttempts.find(
                    (attempt) => attempt.paymentPurpose === "REFUND",
                  );
                  const mismatchWarning = getWebsiteMismatchWarning(
                    order,
                    latestPaymentAttempt,
                  );

                  return (
                    <tr key={order.id}>
                      <td>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="admin-action-link"
                        >
                          {order.id.slice(-8)}
                        </Link>
                      </td>
                      <td className="font-bold">{order.customerName}</td>
                      <td>${Number(order.total).toFixed(2)}</td>
                      <td>
                        <div>
                          {formatPaymentStatus(order.paymentStatus) ??
                            "Not set"}
                        </div>
                        <div className="mt-1 text-xs text-[#6b5a50]">
                          Legacy provider: {order.paymentProvider ?? "Not set"}
                        </div>
                        <div className="mt-1 text-xs text-[#6b5a50]">
                          Ledger:{" "}
                          {latestPaymentAttempt?.websiteStatus ?? "No row"}
                        </div>
                      </td>
                      <td>
                        {latestSquareAttempt?.providerStatus ?? "No Square row"}
                      </td>
                      <td className="break-all text-[#6b5a50]">
                        {latestSquareAttempt?.providerPaymentId ?? "Not set"}
                      </td>
                      <td>
                        {latestSquareAttempt?.providerReceiptUrl ? (
                          <a
                            className="admin-action-link"
                            href={latestSquareAttempt.providerReceiptUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Square receipt
                          </a>
                        ) : (
                          (latestSquareAttempt?.receiptReference ?? "Not set")
                        )}
                      </td>
                      <td>
                        {latestPaymentAttempt?.paidAt
                          ? latestPaymentAttempt.paidAt.toLocaleString()
                          : order.paidAt
                            ? order.paidAt.toLocaleString()
                            : "Not paid"}
                      </td>
                      <td>
                        {latestRefundAttempt
                          ? latestRefundAttempt.websiteStatus
                          : latestPaymentAttempt?.websiteStatus ===
                                "PARTIALLY_REFUNDED" ||
                              latestPaymentAttempt?.websiteStatus === "REFUNDED"
                            ? latestPaymentAttempt.websiteStatus
                            : order.status === "REFUNDED"
                              ? "Website marked refunded"
                              : "None recorded"}
                      </td>
                      <td>
                        {mismatchWarning ? (
                          <span className="admin-badge admin-badge-warning">
                            {mismatchWarning}
                          </span>
                        ) : (
                          <span className="text-[#6b5a50]">
                            {latestPaymentAttempt
                              ? "No mismatch detected"
                              : "Awaiting first ledger attempt"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {reconciliationOrders.length === 0 && (
                  <tr>
                    <td className="text-center text-[#6b5a50]" colSpan={10}>
                      No orders are available for reconciliation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card mt-10 overflow-hidden">
          <div className="border-b border-[#ead8c1] p-6">
            <h2 className="text-2xl font-black">Outstanding Payments</h2>
            <p className="mt-2 text-sm text-[#6b5a50]">
              Orders that still need manual payment, offline payment, or invoice
              follow-up.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Pay By</th>
                  <th>Total</th>
                  <th>Action</th>
                  <th>Order</th>
                </tr>
              </thead>

              <tbody>
                {paymentDueOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="font-black">{order.customerName}</div>
                      <div className="mt-1 text-xs text-[#6b5a50]">
                        {order.customerEmail}
                      </div>
                    </td>

                    <td>
                      <span className="admin-badge admin-badge-warning">
                        {formatPaymentStatus(order.paymentStatus)}
                      </span>
                    </td>

                    <td className="text-[#6b5a50]">
                      {order.payByDate
                        ? order.payByDate.toLocaleDateString()
                        : "Not set"}
                    </td>

                    <td className="font-black">
                      ${Number(order.total).toFixed(2)}
                    </td>

                    <td>
                      <MarkOrderPaidButton orderId={order.id} />
                    </td>

                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="admin-action-link"
                      >
                        View Order
                      </Link>
                    </td>
                  </tr>
                ))}

                {paymentDueOrders.length === 0 && (
                  <tr>
                    <td className="text-center text-[#6b5a50]" colSpan={6}>
                      No outstanding payments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
