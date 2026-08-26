import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import {
  formatOrderStatus,
  formatOrderType,
  formatPaymentStatus,
  formatApprovalStatus,
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

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type OrderDetail = {
  id: string;
  customerName: string;
  customerEmail: string;
  orderType: string;
  status: string;
  approvalStatus: string;
  approvalNote: string | null;
  paymentStatus: string | null;
  paymentProvider: string | null;
  payByDate: Date | null;
  paidAt: Date | null;
  requestedDateTime: Date | null;
  deliveryName: string | null;
  deliveryPhone: string | null;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryPostalCode: string | null;
  deliveryNotes: string | null;
  allergyNotes: string | null;
  allergenAcknowledged: boolean;
  allergenAcknowledgedAt: Date | null;
  substitutionPreference: string | null;
  subtotal: DecimalLike;
  deliveryFee: DecimalLike;
  lateFee: DecimalLike;
  tipAmount: DecimalLike;
  total: DecimalLike;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: DecimalLike;
    lineTotal: DecimalLike;
    notes: string | null;
    weeklyMealPlanSelection: WeeklyOrderSelectionDisplay | null;
  }[];
  paymentAttempts: {
    websiteStatus: string;
    paymentPurpose: string;
    paidAt: Date | null;
    expiresAt: Date | null;
    metadata: unknown;
  }[];
};

export default async function OrderPage({ params }: OrderPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const { id } = await params;

  const order = (await prisma.order.findFirst({
    where: {
      id,
      user: {
        email: session.user.email,
      },
    },
    include: {
      items: {
        include: {
          weeklyMealPlanSelection: {
            include: {
                  mealSlots: {
                    orderBy: [
                      { dayNumber: "asc" },
                      { mealNumber: "asc" },
                    ],
                    include: {
                      selectedOptions: {
                        orderBy: [
                          { optionType: "asc" },
                          { createdAt: "asc" },
                        ],
                      },
                    },
                  },
                },
              },
        },
      },
      user: true,
      paymentAttempts: {
        where: { paymentPurpose: "ORDER_TOTAL" },
        orderBy: { createdAt: "desc" },
      },
    },
  })) as OrderDetail | null;

  if (!order) {
    notFound();
  }

  const paymentDue =
    order.paymentStatus === "PAY_BY_DATE" ||
    order.paymentStatus === "OFFLINE_PAYMENT_DUE";
  const activePaymentAttempt = order.paymentAttempts.find((attempt) =>
    ["CREATED", "PENDING", "REQUIRES_ACTION"].includes(attempt.websiteStatus) &&
    !attempt.paidAt &&
    (!attempt.expiresAt || attempt.expiresAt > new Date())
  );
  const activeMetadata = activePaymentAttempt?.metadata;
  const paymentUrl = activeMetadata && typeof activeMetadata === "object" && !Array.isArray(activeMetadata) && "squarePaymentLinkUrl" in activeMetadata && typeof activeMetadata.squarePaymentLinkUrl === "string"
    ? activeMetadata.squarePaymentLinkUrl
    : null;
  const hasWeeklyMealPlan = order.items.some((item) =>
    Boolean(item.weeklyMealPlanSelection),
  );
  const businessSettings = await getBusinessSettings();
  const fixedCheckoutScheduleMessage =
    getFixedCheckoutScheduleDisplayMessage(businessSettings);

  return (
    <main className="brand-page px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/account/orders"
          className="text-sm font-bold text-[#9f2f18] underline"
        >
          &larr; Back to Order History
        </Link>

        <div className="brand-card mt-8 p-6 sm:p-8">
          <p className="brand-eyebrow">Order Details</p>

          <h1 className="mt-3 text-5xl font-black">Order Details</h1>

          <p className="mt-3 break-all text-sm text-[#6b5a50]">{order.id}</p>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-[#fff8ee] p-4">
              <p className="text-sm font-bold text-[#9f2f18]">Status</p>
              <p className="mt-2 font-black">
                {formatOrderStatus(order.status)}
              </p>
            </div>

            <div className="rounded-lg bg-[#fff8ee] p-4">
              <p className="text-sm font-bold text-[#9f2f18]">Approval</p>
              <p className="mt-2 font-black">
                {formatApprovalStatus(order.approvalStatus)}
              </p>
            </div>

            <div className="rounded-lg bg-[#fff8ee] p-4">
              <p className="text-sm font-bold text-[#9f2f18]">Payment</p>
              <p className="mt-2 font-black">
                {formatPaymentStatus(order.paymentStatus) ?? "Not set"}
              </p>
            </div>
          </section>

          {order.approvalStatus === "PENDING" && (
            <section className="mt-6 rounded-lg border border-blue-300 bg-blue-50 p-5 text-blue-950">
              <h2 className="text-xl font-black">Waiting for Chef Approval</h2>

              <p className="mt-2 text-sm leading-6">
                Your order has been received and is waiting for chef review. You
                will receive an update once the order is approved or if changes
                are needed.
              </p>
            </section>
          )}

          {order.approvalStatus === "DENIED" && (
            <section className="mt-6 rounded-lg border border-red-300 bg-red-50 p-5 text-red-950">
              <h2 className="text-xl font-black">Order Not Approved</h2>

              <p className="mt-2 text-sm leading-6">
                This order was not approved. Please review any notes from the
                business or contact Chef Rah&apos;s Twisted Kitchen for next
                steps.
              </p>

              {order.approvalNote && (
                <p className="mt-3 text-sm">
                  <strong>Note:</strong> {order.approvalNote}
                </p>
              )}
            </section>
          )}

          {order.approvalStatus === "APPROVED" && (
            <section className="mt-6 rounded-lg border border-green-300 bg-green-50 p-5 text-green-950">
              <h2 className="text-xl font-black">Order Approved</h2>

              <p className="mt-2 text-sm leading-6">
                This order has been approved and can continue through
                preparation, pickup, or delivery.
              </p>

              {order.approvalNote && (
                <p className="mt-3 text-sm">
                  <strong>Note:</strong> {order.approvalNote}
                </p>
              )}
            </section>
          )}

          {order.approvalStatus === "APPROVED" && paymentUrl && order.paymentStatus !== "PAID" && !["CANCELLED", "COMPLETED", "REFUNDED"].includes(order.status) ? (
            <section className="mt-6 rounded-lg border border-[#d99426] bg-[#fff3cf] p-5 text-[#6f1f12]">
              <h2 className="text-xl font-black">Payment Due</h2>
              <p className="mt-2 text-sm">
                Complete payment through Square before {activePaymentAttempt?.expiresAt?.toLocaleString() ?? "the payment request expires"}.
              </p>
              <a href={paymentUrl} target="_blank" rel="noreferrer" className="brand-button-primary mt-4 inline-block px-5 py-3 text-sm">
                Pay Now with Square
              </a>
            </section>
          ) : null}

          {paymentDue && (
            <section className="mt-6 rounded-lg border border-[#d99426] bg-[#fff3cf] p-5 text-[#6f1f12]">
              <h2 className="text-xl font-black">Payment Due</h2>

              <p className="mt-2 text-sm">
                This order still needs payment.
                {order.payByDate
                  ? ` Please pay by ${order.payByDate.toLocaleDateString()}.`
                  : ""}
              </p>

              <p className="mt-3 text-sm">
                Online payment is coming soon. The business will confirm invoice
                or cash/offline payment instructions after review.
              </p>
            </section>
          )}

          <section className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-black">Customer</h2>

              <div className="mt-4 space-y-2 text-sm text-[#6b5a50]">
                <p>
                  <strong>Name:</strong> {order.customerName}
                </p>

                <p>
                  <strong>Email:</strong> {order.customerEmail}
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

            <div>
              <h2 className="text-2xl font-black">Payment</h2>

              <div className="mt-4 space-y-2 text-sm text-[#6b5a50]">
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
              </div>
            </div>
          </section>
          <section className="mt-8 rounded-lg border border-[#ead8c1] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">
              Contact / Delivery Information
            </h2>

            <div className="mt-5 space-y-2 text-sm text-[#6b5a50]">
              <p>
                <strong>Name:</strong>{" "}
                {order.deliveryName ?? order.customerName ?? "Not provided"}
              </p>

              <p>
                <strong>Phone:</strong> {order.deliveryPhone ?? "Not provided"}
              </p>

              {order.orderType === "DELIVERY" && (
                <>
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
                </>
              )}
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-black">Items</h2>

            <div className="mt-5 space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[#ead8c1] p-4"
                >
                  {item.weeklyMealPlanSelection ? (
                    <div className="mb-3 border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                      <p className="font-semibold">Weekly Meal Plan Snapshot</p>

                      <dl className="mt-2 space-y-1">
                        {getWeeklyMealPlanSelectionDetails(
                          item.weeklyMealPlanSelection,
                        ).map((detail) => (
                          <div key={detail.label}>
                            <dt className="inline font-bold">
                              {detail.label}:{" "}
                            </dt>
                            <dd className="inline">{detail.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}

                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-black">
                        {item.quantity} x {item.name}
                      </h3>

                      <p className="mt-1 text-sm text-[#6b5a50]">
                        ${Number(item.unitPrice).toFixed(2)} each
                      </p>

                      {item.notes && (
                        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-[#fff3cf] p-3 text-sm text-[#6f1f12]">
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
          </section>

          <section className="mt-8 space-y-5">
            <div>
              <h2 className="text-xl font-black">Allergy Notes</h2>

              {order.allergyNotes ? (
                <div className="mt-2 rounded-lg border-2 border-red-500 bg-red-50 p-4 text-sm text-red-900">
                  {order.allergyNotes}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#6b5a50]">None provided.</p>
              )}
            </div>

            {order.allergenAcknowledged && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-5 text-sm text-red-900">
                <h2 className="text-xl font-black">
                  Allergen Warning Acknowledged
                </h2>

                <p className="mt-2 leading-6">
                  You acknowledged that this order may contain allergen tags
                  matching your account preferences before submitting.
                </p>

                {order.allergenAcknowledgedAt && (
                  <p className="mt-2 text-xs">
                    Acknowledged on{" "}
                    {order.allergenAcknowledgedAt.toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div>
              <h2 className="text-xl font-black">Substitution Preference</h2>

              <p className="mt-2 whitespace-pre-wrap text-sm text-[#6b5a50]">
                {order.substitutionPreference ?? "None provided."}
              </p>
            </div>
          </section>

          <section className="mt-8 border-t border-[#ead8c1] pt-6">
            <div className="space-y-3 text-sm">
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

              <div className="border-t pt-3 text-lg font-bold">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span>${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
