import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth-guards";
import { UpdateOrderStatusForm } from "@/components/admin/UpdateOrderStatusForm";
import { MarkOrderPaidButton } from "@/components/admin/MarkOrderPaidButton";
import { OrderApprovalForm } from "@/components/admin/OrderApprovalForm";
import Link from "next/link";
import { PrintButton } from "@/components/admin/PrintButton";
import {
  formatOrderStatus,
  formatOrderType,
  formatPaymentStatus,
} from "@/lib/format-labels";
import {
  getWeeklyMealPlanSelectionDetails,
  type WeeklyOrderSelectionDisplay,
} from "@/lib/weekly-order-display";
import {
  formatOrderScheduleDateTime,
  getOrderScheduleLabel,
} from "@/lib/order-schedule-display";
import { getBusinessSettings } from "@/lib/business-settings";
import { getFixedCheckoutScheduleDisplayMessage } from "@/lib/checkout-fulfillment";
import type { DecimalLike } from "@/types/display";
import { getNormalRefundEligibility } from "@/lib/payment-config";
import { getPaymentRefundEligibility } from "@/lib/refund-eligibility";
import { RefundPaymentButton } from "@/components/admin/RefundPaymentButton";
import { getSquareReadiness } from "@/lib/square-readiness";
import {
  getSquareAdminProviderLabel,
  getSquareHistoryDisplayNote,
} from "@/lib/square-display-labels";
import type { PaymentPurpose, PaymentWebsiteStatus } from "@prisma/client";
import { SendOrderPaymentRequestButton } from "@/components/admin/SendOrderPaymentRequestButton";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AdminOrderDetail = {
  id: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  orderType: string;
  requestedDateTime: Date | null;
  deliveryName: string | null;
  deliveryPhone: string | null;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryPostalCode: string | null;
  deliveryNotes: string | null;
  approvalStatus: string;
  approvalNote: string | null;
  status: string;
  allergyNotes: string | null;
  allergenAcknowledged: boolean;
  allergenAcknowledgedAt: Date | null;
  substitutionPreference: string | null;
  subtotal: DecimalLike;
  deliveryFee: DecimalLike;
  lateFee: DecimalLike;
  tipAmount: DecimalLike;
  total: DecimalLike;
  paymentProvider: string | null;
  paymentStatus: string | null;
  payByDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: DecimalLike;
    lineTotal: DecimalLike;
    notes: string | null;
    weeklyMealPlanSelection: WeeklyOrderSelectionDisplay | null;
  }[];
  statusHistory: {
    id: string;
    status: string;
    note: string | null;
    createdAt: Date;
  }[];
  paymentAttempts: {
    id: string;
    provider: string;
    providerPaymentId: string | null;
    providerReceiptUrl: string | null;
    receiptReference: string | null;
    providerStatus: string | null;
    websiteStatus: PaymentWebsiteStatus;
    paymentPurpose: PaymentPurpose;
    amountCents: number;
    tipCents: number;
    currency: string;
    expiresAt: Date | null;
    paidAt: Date | null;
    failedAt: Date | null;
    cancelledAt: Date | null;
    refundedAt: Date | null;
    parentPaymentId: string | null;
    metadata: unknown;
    childPayments: {
      paymentPurpose: PaymentPurpose;
      websiteStatus: PaymentWebsiteStatus;
    }[];
    createdAt: Date;
  }[];
};

export default async function AdminOrderDetailsPage({ params }: PageProps) {
  await requireAdminPage();
  const squareReadiness = getSquareReadiness();
  const squareProviderLabel = getSquareAdminProviderLabel(
    squareReadiness.environment,
  );

  const { id } = await params;

  const order = (await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          weeklyMealPlanSelection: {
            include: {
              mealSlots: {
                orderBy: [{ dayNumber: "asc" }, { mealNumber: "asc" }],
                include: {
                  selectedOptions: {
                    orderBy: [{ optionType: "asc" }, { createdAt: "asc" }],
                  },
                },
              },
            },
          },
        },
      },
      statusHistory: {
        orderBy: {
          createdAt: "desc",
        },
      },
      paymentAttempts: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          childPayments: {
            select: {
              paymentPurpose: true,
              websiteStatus: true,
            },
          },
        },
      },
    },
  })) as AdminOrderDetail | null;

  if (!order) {
    notFound();
  }

  const paymentDue = ["PAY_BY_DATE", "OFFLINE_PAYMENT_DUE"].includes(
    order.paymentStatus ?? "",
  );
  const hasWeeklyMealPlan = order.items.some((item) =>
    Boolean(item.weeklyMealPlanSelection),
  );
  const businessSettings = await getBusinessSettings();
  const fixedCheckoutScheduleMessage =
    getFixedCheckoutScheduleDisplayMessage(businessSettings);
  const refundEligibility = getNormalRefundEligibility({
    createdAt: order.createdAt,
    status: order.status,
    statusHistory: order.statusHistory.map((history) => history.status),
  });
  const activeOrderPaymentAttempt = order.paymentAttempts.find((attempt) =>
    attempt.paymentPurpose === "ORDER_TOTAL" &&
    ["CREATED", "PENDING", "REQUIRES_ACTION"].includes(attempt.websiteStatus) &&
    !attempt.paidAt &&
    (!attempt.expiresAt || attempt.expiresAt > new Date())
  );
  const activePaymentMetadata = activeOrderPaymentAttempt?.metadata;
  const activePaymentUrl = activePaymentMetadata && typeof activePaymentMetadata === "object" && !Array.isArray(activePaymentMetadata) && "squarePaymentLinkUrl" in activePaymentMetadata && typeof activePaymentMetadata.squarePaymentLinkUrl === "string"
    ? activePaymentMetadata.squarePaymentLinkUrl
    : null;
  const paymentRequestDisabledReason = !hasWeeklyMealPlan
    ? "Only weekly orders use this post-approval payment request."
    : order.approvalStatus !== "APPROVED"
      ? "Approve this order before requesting payment."
      : order.paidAt || order.paymentStatus === "PAID"
        ? "This order is already paid."
        : ["CANCELLED", "COMPLETED", "REFUNDED"].includes(order.status)
          ? "This order is no longer payable."
          : !squareReadiness.enabled
            ? squareReadiness.adminMessage
            : null;

  return (
    <main className="admin-page print:bg-white print:px-0 print:py-0">
      <div className="admin-container max-w-6xl print:max-w-none print:p-0">
        <Link className="admin-back-link print:hidden" href="/admin/kitchen">
          &uarr; Back to Kitchen tickets
        </Link>
        <div className="mb-8">
          <Link className="admin-back-link print:hidden" href="/admin/orders">
            &larr; Back to Orders
          </Link>
          <p className="admin-eyebrow mt-5">Admin Order</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Order Details
          </h1>
          <p className="mt-3 break-all text-sm text-[#6b5a50]">{order.id}</p>
        </div>
        <div className="mt-4 print:hidden">
          <PrintButton label="Print Kitchen Ticket" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <div className="admin-card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black">Customer</h2>
                {!order.userId && (
                  <span className="admin-badge admin-badge-neutral">Guest</span>
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <strong>Name:</strong> {order.customerName}
                </p>
                <p>
                  <strong>Email:</strong> {order.customerEmail}
                </p>
                <p>
                  <strong>Phone:</strong>{" "}
                  {order.customerPhone ?? "Not provided"}
                </p>
                <p>
                  <strong>Order Type:</strong>{" "}
                  {formatOrderType(order.orderType)}
                </p>
                <p>
                  <strong>{getOrderScheduleLabel(hasWeeklyMealPlan)}:</strong>{" "}
                  {formatOrderScheduleDateTime(order.requestedDateTime, {
                    hasWeeklyMealPlan,
                    fixedFulfillmentMessage: hasWeeklyMealPlan
                      ? null
                      : fixedCheckoutScheduleMessage,
                  })}
                </p>
              </div>
            </div>
            <section className="admin-card p-6">
              <h2 className="text-2xl font-black">Delivery / Contact Info</h2>

              <div className="mt-5 space-y-2 text-sm text-neutral-700">
                <p>
                  <strong>Name:</strong>{" "}
                  {order.deliveryName ?? order.customerName ?? "Not provided"}
                </p>

                <p>
                  <strong>Phone:</strong>{" "}
                  {order.deliveryPhone ?? "Not provided"}
                </p>

                <p>
                  <strong>Address:</strong>{" "}
                  {order.deliveryAddressLine1
                    ? `${order.deliveryAddressLine1}${
                        order.deliveryAddressLine2
                          ? `, ${order.deliveryAddressLine2}`
                          : ""
                      }`
                    : "Not provided"}
                </p>

                <p>
                  <strong>City/State/ZIP:</strong>{" "}
                  {[
                    order.deliveryCity,
                    order.deliveryState,
                    order.deliveryPostalCode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not provided"}
                </p>

                <p>
                  <strong>Delivery Notes:</strong>{" "}
                  {order.deliveryNotes ?? "None"}
                </p>
              </div>
              {order.approvalStatus === "PENDING" && (
                <div className="mt-6 rounded-lg border border-blue-300 bg-blue-50 p-5 text-blue-950">
                  <h2 className="text-xl font-black">Approval Needed</h2>

                  <p className="mt-2 text-sm leading-6">
                    This order includes one or more items or selections that
                    require review before it can move into preparation.
                  </p>
                </div>
              )}

              {order.approvalStatus === "APPROVED" && (
                <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-5 text-green-950">
                  <h2 className="text-xl font-black">Approved</h2>

                  <p className="mt-2 text-sm leading-6">
                    This order has been approved and can continue through the
                    kitchen workflow.
                  </p>
                </div>
              )}

              {order.approvalStatus === "DENIED" && (
                <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-5 text-red-950">
                  <h2 className="text-xl font-black">Denied</h2>

                  <p className="mt-2 text-sm leading-6">
                    This order was denied and should not move forward unless the
                    customer submits a revised order.
                  </p>

                  {order.approvalNote && (
                    <p className="mt-3 text-sm">
                      <span className="font-semibold">Note:</span>{" "}
                      {order.approvalNote}
                    </p>
                  )}
                </div>
              )}
            </section>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Items</h2>

              <div className="mt-5 space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#ead8c1] p-4"
                  >
                    {item.weeklyMealPlanSelection ? (
                      <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                        <p className="font-black">Weekly Meal Plan Snapshot</p>

                        <dl className="mt-2 space-y-1">
                          {getWeeklyMealPlanSelectionDetails(
                            item.weeklyMealPlanSelection,
                          ).map((detail) => (
                            <div key={detail.label}>
                              <dt className="inline font-semibold">
                                {detail.label}:{" "}
                              </dt>
                              <dd className="inline">{detail.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                      <div>
                        <h3 className="font-black">{item.name}</h3>
                        <p className="text-sm text-neutral-600">
                          Qty: {item.quantity} x $
                          {Number(item.unitPrice).toFixed(2)}
                        </p>
                        {item.notes && (
                          <div className="mt-3 whitespace-pre-wrap rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                            <p className="mb-1 font-black">
                              Selections / Add-ons
                            </p>
                            {item.notes}
                          </div>
                        )}
                      </div>

                      <p className="font-black">
                        ${Number(item.lineTotal).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {order.allergenAcknowledged && (
              <section className="rounded-lg border border-red-300 bg-red-50 p-5 text-sm text-red-900">
                <h2 className="text-xl font-black">
                  Allergen Warning Acknowledged
                </h2>

                <p className="mt-2 leading-6">
                  The customer acknowledged that this order may contain allergen
                  tags matching their account preferences before submitting.
                </p>

                {order.allergenAcknowledgedAt && (
                  <p className="mt-2 text-xs">
                    Acknowledged on{" "}
                    {order.allergenAcknowledgedAt.toLocaleString()}
                  </p>
                )}
              </section>
            )}
            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Notes</h2>

              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="font-medium">Allergy Notes</p>

                  {order.allergyNotes ? (
                    <div className="mt-2 rounded-lg border-2 border-red-500 bg-red-50 p-4 text-red-900">
                      <p className="text-xs font-bold uppercase text-red-700">
                        Allergy Alert
                      </p>
                      <p className="mt-2">{order.allergyNotes}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-neutral-700">None provided.</p>
                  )}
                </div>

                <div>
                  <p className="font-medium">Substitution Preference</p>
                  <p className="mt-1 text-neutral-700">
                    {order.substitutionPreference || "None provided."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6 print:hidden">
            <section className="space-y-4">
              <OrderApprovalForm
                orderId={order.id}
                currentApprovalStatus={order.approvalStatus}
              />

              {order.approvalNote && (
                <p className="admin-card p-4 text-sm text-[#6b5a50]">
                  <strong>Note:</strong> {order.approvalNote}
                </p>
              )}
            </section>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Status</h2>
              <p className="admin-badge admin-badge-neutral mt-3 justify-center px-3 py-2">
                {formatOrderStatus(order.status)}
              </p>

              <div className="mt-6">
                <UpdateOrderStatusForm
                  key={order.status}
                  orderId={order.id}
                  currentStatus={order.status}
                  normalRefundEligible={refundEligibility.eligible}
                />
              </div>
            </div>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Totals</h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${Number(order.subtotal).toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>${Number(order.deliveryFee).toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Late Fee</span>
                  <span>${Number(order.lateFee).toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Tip</span>
                  <span>${Number(order.tipAmount).toFixed(2)}</span>
                </div>

                <div className="border-t pt-3 text-base font-bold">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>${Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Payment</h2>

              {order.paymentStatus === "EXPIRED_NON_PAYMENT" ? (
                <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-950">
                  Cancelled for non-payment after the two-hour Square payment
                  window expired. Any reserved weekly capacity was released.
                </div>
              ) : null}

              <div className="mt-5 space-y-3 text-sm">
                <p>
                  <strong>Provider:</strong>{" "}
                  {order.paymentProvider ?? "Not set"}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {formatPaymentStatus(order.paymentStatus)}
                </p>

                <p>
                  <strong>Pay By:</strong>{" "}
                  {order.payByDate
                    ? order.payByDate.toLocaleDateString()
                    : "Not set"}
                </p>

                <p>
                  <strong>Paid At:</strong>{" "}
                  {order.paidAt ? order.paidAt.toLocaleString() : "Not paid"}
                </p>

                <div className="mt-5 border-t border-[#ead8c1] pt-5">
                  <p className="font-bold">Normal Refund Eligibility</p>
                  <p className="mt-2 text-[#6b5a50]">
                    {refundEligibility.eligible
                      ? `Eligible until ${refundEligibility.expiresAt.toLocaleString()}, unless fulfillment or preparation starts first.`
                      : refundEligibility.reason}
                  </p>

                  <p className="mt-3 text-xs text-[#6b5a50]">
                    Refund an eligible paid Square transaction from its ledger
                    row below. Refunds are full-amount through{" "}
                    {squareProviderLabel}.
                  </p>
                </div>

                {paymentDue && (
                  <div className="mt-5">
                    <MarkOrderPaidButton orderId={order.id} />
                  </div>
                )}
                <SendOrderPaymentRequestButton
                  orderId={order.id}
                  environment={squareReadiness.environment}
                  activePaymentUrl={activePaymentUrl}
                  disabledReason={paymentRequestDisabledReason}
                />
                {activeOrderPaymentAttempt ? (
                  <p className="mt-3 text-xs text-[#6b5a50]">
                    Active request expires: {activeOrderPaymentAttempt.expiresAt?.toLocaleString() ?? "Not set"}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">History</h2>

              <div className="mt-5 space-y-3">
                {order.statusHistory.map((history) => (
                  <div key={history.id} className="border-l-2 pl-3 text-sm">
                    <p className="font-medium">
                      {formatOrderStatus(history.status)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {history.createdAt.toLocaleString()}
                    </p>
                    {history.note && (
                      <p className="mt-1 text-neutral-700">
                        {getSquareHistoryDisplayNote(history.note)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Payment Ledger</h2>

              <div className="mt-5 space-y-4">
                {order.paymentAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="rounded-lg border border-[#ead8c1] bg-[#fff8ee] p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black">
                        {attempt.provider} ·{" "}
                        {attempt.paymentPurpose.replaceAll("_", " ")}
                      </p>
                      <span className="admin-badge admin-badge-neutral">
                        {attempt.websiteStatus}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-2 text-[#6b5a50]">
                      <div>
                        <dt className="inline font-bold text-[#24130f]">
                          Amount:
                        </dt>{" "}
                        <dd className="inline">
                          {(attempt.amountCents / 100).toLocaleString("en-US", {
                            style: "currency",
                            currency: attempt.currency,
                          })}
                          {attempt.tipCents > 0
                            ? ` (${(attempt.tipCents / 100).toLocaleString(
                                "en-US",
                                {
                                  style: "currency",
                                  currency: attempt.currency,
                                },
                              )} tip)`
                            : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-bold text-[#24130f]">
                          Provider status:
                        </dt>{" "}
                        <dd className="inline">
                          {attempt.providerStatus ?? "Not set"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-bold text-[#24130f]">
                          Provider payment ID:
                        </dt>{" "}
                        <dd className="inline break-all">
                          {attempt.providerPaymentId ?? "Not set"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-bold text-[#24130f]">
                          Receipt:
                        </dt>{" "}
                        <dd className="inline">
                          {attempt.providerReceiptUrl ? (
                            <a
                              className="admin-action-link"
                              href={attempt.providerReceiptUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open provider receipt
                            </a>
                          ) : (
                            (attempt.receiptReference ?? "Not set")
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-bold text-[#24130f]">
                          Created:
                        </dt>{" "}
                        <dd className="inline">
                          {attempt.createdAt.toLocaleString()}
                        </dd>
                      </div>
                      {attempt.expiresAt ? (
                        <div>
                          <dt className="inline font-bold text-[#24130f]">
                            Expires:
                          </dt>{" "}
                          <dd className="inline">
                            {attempt.expiresAt.toLocaleString()}
                          </dd>
                        </div>
                      ) : null}
                      {attempt.paidAt ? (
                        <div>
                          <dt className="inline font-bold text-[#24130f]">
                            Paid:
                          </dt>{" "}
                          <dd className="inline">
                            {attempt.paidAt.toLocaleString()}
                          </dd>
                        </div>
                      ) : null}
                      {attempt.failedAt ? (
                        <div>
                          <dt className="inline font-bold text-[#24130f]">
                            Failed:
                          </dt>{" "}
                          <dd className="inline">
                            {attempt.failedAt.toLocaleString()}
                          </dd>
                        </div>
                      ) : null}
                      {attempt.cancelledAt ? (
                        <div>
                          <dt className="inline font-bold text-[#24130f]">
                            Cancelled:
                          </dt>{" "}
                          <dd className="inline">
                            {attempt.cancelledAt.toLocaleString()}
                          </dd>
                        </div>
                      ) : null}
                      {attempt.refundedAt ? (
                        <div>
                          <dt className="inline font-bold text-[#24130f]">
                            Refunded:
                          </dt>{" "}
                          <dd className="inline">
                            {attempt.refundedAt.toLocaleString()}
                          </dd>
                        </div>
                      ) : null}
                      {attempt.parentPaymentId ? (
                        <div>
                          <dt className="inline font-bold text-[#24130f]">
                            Parent payment:
                          </dt>{" "}
                          <dd className="inline break-all">
                            {attempt.parentPaymentId}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    {attempt.paymentPurpose === "ORDER_TOTAL" ? (
                      <RefundPaymentButton
                        paymentAttemptId={attempt.id}
                        environment={squareReadiness.environment}
                        disabledReason={
                          getPaymentRefundEligibility({
                            ...attempt,
                            order: {
                              createdAt: order.createdAt,
                              status: order.status,
                              statusHistory: order.statusHistory,
                            },
                            serviceRequestId: null,
                          }).reason
                        }
                      />
                    ) : null}
                    {attempt.paymentPurpose === "REFUND" &&
                    attempt.metadata &&
                    typeof attempt.metadata === "object" &&
                    !Array.isArray(attempt.metadata) &&
                    "refundReason" in attempt.metadata ? (
                      <p className="mt-3 text-xs text-[#6b5a50]">
                        <strong>Reason:</strong>{" "}
                        {String(attempt.metadata.refundReason)}
                      </p>
                    ) : null}
                  </div>
                ))}

                {order.paymentAttempts.length === 0 ? (
                  <p className="rounded-lg border border-[#ead8c1] bg-[#fff8ee] p-4 text-sm text-[#6b5a50]">
                    No payment ledger attempts have been recorded for this
                    order.
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
