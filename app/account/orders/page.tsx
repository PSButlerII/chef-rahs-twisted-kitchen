import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ReorderButton } from "@/components/account/ReorderButton";
import {
  formatApprovalStatus,
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

function isPaymentDue(paymentStatus: string | null | undefined) {
  return (
    paymentStatus === "PAY_BY_DATE" || paymentStatus === "OFFLINE_PAYMENT_DUE"
  );
}

type AccountOrderItem = {
  id: string;
  menuItemId: string | null;
  name: string;
  quantity: number;
  unitPrice: DecimalLike;
  lineTotal: DecimalLike;
  notes: string | null;
  weeklyMealPlanSelection: WeeklyOrderSelectionDisplay | null;
};

type AccountOrder = {
  id: string;
  orderType: string;
  createdAt: Date;
  requestedDateTime: Date | null;
  paymentStatus: string | null;
  payByDate: Date | null;
  status: string;
  approvalStatus: string;
  approvalNote: string | null;
  total: DecimalLike;
  items: AccountOrderItem[];
};

export default async function AccountOrdersPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    include: {
      orders: {
        orderBy: {
          createdAt: "desc",
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
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const businessSettings = await getBusinessSettings();
  const fixedCheckoutScheduleMessage =
    getFixedCheckoutScheduleDisplayMessage(businessSettings);

  return (
    <main className="brand-page px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="brand-eyebrow">Account</p>

          <h1 className="mt-3 text-5xl font-black">Order History</h1>

          <p className="mt-3 max-w-2xl leading-7 text-[#6b5a50]">
            Review your meal plan orders, a la carte orders, payment status,
            approval status, and order history.
          </p>
        </div>

        <div className="space-y-5">
          {(user.orders as AccountOrder[]).map((order) => {
            const hasWeeklyMealPlan = order.items.some((item) =>
              Boolean(item.weeklyMealPlanSelection),
            );

            return (
              <div key={order.id} className="brand-card p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm font-bold uppercase text-[#9f2f18]">
                      {formatOrderType(order.orderType)}
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      Order from {order.createdAt.toLocaleDateString()}
                    </h2>

                    <p className="mt-2 text-sm text-[#6b5a50]">
                      {getOrderScheduleLabel(hasWeeklyMealPlan)}:{" "}
                      {formatOrderScheduleDateTime(order.requestedDateTime, {
                        hasWeeklyMealPlan,
                        fixedFulfillmentMessage: hasWeeklyMealPlan
                          ? null
                          : fixedCheckoutScheduleMessage,
                      })}
                    </p>

                    <p className="mt-1 text-sm text-[#6b5a50]">
                      Payment:{" "}
                      {formatPaymentStatus(order.paymentStatus) ?? "Not set"}
                    </p>
                  </div>
                {order.payByDate && (
                  <p className="mt-1 text-sm font-bold text-[#9f2f18]">
                    Pay by: {order.payByDate.toLocaleDateString()}
                  </p>
                )}

                <div className="text-left md:text-right">
                  <span className="rounded-full bg-[#f4eadb] px-3 py-1 text-xs font-bold text-[#6f1f12]">
                    {formatOrderStatus(order.status)}
                  </span>
                  <p className="mt-2 text-xs font-medium text-[#6b5a50]">
                    Approval: {formatApprovalStatus(order.approvalStatus)}
                  </p>
                  <p className="mt-3 text-2xl font-black">
                    ${Number(order.total).toFixed(2)}
                  </p>

                  <div className="mt-3 gap-2 md:justify-end">
                    <Link
                      href={`/orders/${order.id}`}
                      className="brand-button-primary px-5 py-2 text-sm"
                    >
                      View Details
                    </Link>
                    {order.approvalStatus === "PENDING" && (
                      <div className="mt-4 rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
                        Waiting for chef approval before this order is
                        confirmed.
                      </div>
                    )}

                    {order.approvalStatus === "DENIED" && (
                      <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                        This order was not approved.
                        {order.approvalNote
                          ? ` Note: ${order.approvalNote}`
                          : ""}
                      </div>
                    )}
                    {isPaymentDue(order.paymentStatus) && (
                      <Link
                        href={`/orders/${order.id}`}
                        className="mt-3 inline-flex rounded-lg border border-[#d99426] bg-[#fff3cf] px-5 py-2 text-sm font-bold text-[#6f1f12]"
                      >
                        Payment Instructions
                      </Link>
                    )}
                  </div>
                  <ReorderButton
                    items={order.items.map((item) => ({
                      id: item.id,
                      menuItemId: item.menuItemId,
                      name: item.name,
                      quantity: item.quantity,
                      unitPrice: Number(item.unitPrice),
                      notes: item.notes,
                      isWeeklyMealPlan: Boolean(item.weeklyMealPlanSelection),
                    }))}
                  />
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--brand-border)] pt-5">
                <h3 className="font-black">Items</h3>

                <div className="mt-3 space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between gap-4 rounded-lg bg-[var(--brand-surface-soft)] p-3 text-sm"
                    >
                      <div>
                        <p className="font-bold">
                          {item.quantity} x {item.name}
                        </p>

                        {item.weeklyMealPlanSelection && (
                          <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
                            <p className="font-black">
                              Weekly Meal Plan Snapshot
                            </p>

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
                        )}

                        {item.notes && (
                          <p className="mt-1 whitespace-pre-wrap text-xs text-[#6b5a50]">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      <p className="font-bold">
                        ${Number(item.lineTotal).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            );
          })}

          {user.orders.length === 0 && (
            <div className="brand-card p-8 text-center">
              <h2 className="text-2xl font-black">No orders yet</h2>

              <p className="mt-2 text-[#6b5a50]">
                Your order history will appear here after you submit an order.
              </p>

              <Link
                href="/menu"
                className="brand-button-primary mt-6 px-5 py-3"
              >
                View Menu
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
