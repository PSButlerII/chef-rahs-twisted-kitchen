import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getMissingProfileFields } from "@/lib/profile-completeness";
import { AccountProfileModal } from "@/components/account/AccountProfileModal";
import {
  formatOrderStatus,
  formatOrderType,
  formatPaymentStatus,
} from "@/lib/format-labels";
import {
  formatOrderScheduleDateTime,
  getOrderScheduleLabel,
} from "@/lib/order-schedule-display";
import { getBusinessSettings } from "@/lib/business-settings";
import { getFixedCheckoutScheduleDisplayMessage } from "@/lib/checkout-fulfillment";
import type { DecimalLike } from "@/types/display";
import { AccountAllergenPreferencesForm } from "@/components/account/AccountAllergenPreferencesForm";

type DashboardOrderItem = {
  id: string;
  name: string;
  weeklyMealPlanSelection: {
    id: string;
  } | null;
};

type DashboardOrder = {
  id: string;
  orderType: string;
  status: string;
  paymentStatus: string | null;
  requestedDateTime: Date | null;
  createdAt: Date;
  total: DecimalLike;
  items: DashboardOrderItem[];
};

type DashboardServiceRequest = {
  id: string;
};

export default async function AccountPage() {
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
        take: 3,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          items: {
            include: {
              weeklyMealPlanSelection: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
      cateringRequests: {
        take: 3,
        orderBy: {
          createdAt: "desc",
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
  const orders = user.orders as DashboardOrder[];
  const cateringRequests = user.cateringRequests as DashboardServiceRequest[];

  const activeOrders = orders.filter((order) =>
    ["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(
      order.status,
    ),
  );

  const unpaidOrders = orders.filter((order) =>
    ["PAY_BY_DATE", "OFFLINE_PAYMENT_DUE"].includes(order.paymentStatus ?? ""),
  );

  const missingProfileFields = getMissingProfileFields(user);

  return (
    <main className="brand-page px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="brand-eyebrow">Account Dashboard</p>

          {missingProfileFields.length > 0 && (
            <div className="mb-8 rounded-lg border border-[#d99426] bg-[#fff3cf] p-5 text-[#6f1f12]">
              <h2 className="text-xl font-black">
                Complete Your Account Information
              </h2>

              <p className="mt-2 text-sm leading-6">
                Add your {missingProfileFields.join(", ")} to make checkout and
                service requests easier.
              </p>

              <div className="mt-4">
                <AccountProfileModal
                  label="Complete Account Information"
                  user={{
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    addressLine1: user.addressLine1,
                    addressLine2: user.addressLine2,
                    city: user.city,
                    state: user.state,
                    postalCode: user.postalCode,
                    deliveryNotes: user.deliveryNotes,
                  }}
                />
              </div>
            </div>
          )}

          <h1 className="mt-3 text-5xl font-black">
            Welcome, {user.name ?? "Customer"}
          </h1>

          <AccountProfileModal
            user={{
              name: user.name,
              email: user.email,
              phone: user.phone,
              addressLine1: user.addressLine1,
              addressLine2: user.addressLine2,
              city: user.city,
              state: user.state,
              postalCode: user.postalCode,
              deliveryNotes: user.deliveryNotes,
            }}
          />

          <p className="mt-3 max-w-2xl leading-7 text-[#6b5a50]">
            Track active orders, review payment status, and access your full
            order history.
          </p>
        </div>

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/account/orders"
            className="brand-card p-6 transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <p className="text-sm font-bold text-[#9f2f18]">
              Recent Orders Shown
            </p>
            <p className="mt-3 text-4xl font-black">{orders.length}</p>
          </Link>

          <Link
            href="/account/orders"
            className="brand-card p-6 transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <p className="text-sm font-bold text-[#9f2f18]">Active Orders</p>
            <p className="mt-3 text-4xl font-black">{activeOrders.length}</p>
          </Link>

          <Link
            href="/account/orders"
            className="brand-card p-6 transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <p className="text-sm font-bold text-[#9f2f18]">Payments Due</p>
            <p className="mt-3 text-4xl font-black">{unpaidOrders.length}</p>
          </Link>

          <Link
            href="/account/catering"
            className="brand-card p-6 transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <p className="text-sm font-bold text-[#9f2f18]">Service Requests</p>
            <p className="mt-3 text-4xl font-black">
              {cateringRequests.length}
            </p>
          </Link>
        </section>

        <section className="mt-8">
          <AccountAllergenPreferencesForm />
        </section>

        {unpaidOrders.length > 0 && (
          <section className="mt-8 rounded-lg border border-[#d99426] bg-[#fff3cf] p-6 text-[#6f1f12] shadow-sm">
            <h2 className="text-2xl font-black">Payment Reminder</h2>

            <p className="mt-2">
              You have {unpaidOrders.length} order
              {unpaidOrders.length === 1 ? "" : "s"} with payment still due.
            </p>

            <Link
              href="/account/orders"
              className="brand-button-primary mt-5 px-5 py-3 text-sm"
            >
              View Payment Details
            </Link>
          </section>
        )}

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <Link
            href="/account/orders"
            className="brand-card p-6 transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <h2 className="text-xl font-black">Full Order History</h2>
            <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
              View all previous orders, payment status, and reorder meals.
            </p>
          </Link>

          <Link
            href="/menu"
            className="brand-card p-6 transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <h2 className="text-xl font-black">Browse Meal Plans</h2>
            <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
              Start a new order from the seasonal meal plans.
            </p>
          </Link>

          <Link
            href="/account/catering"
            className="brand-card p-6 transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <h2 className="text-xl font-black">Service Requests</h2>
            <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
              Track catering and personal chef inquiries, quotes, approvals, and
              deposits.
            </p>
          </Link>
        </section>

        <section className="brand-card mt-10 p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Recent Activity</h2>
              <p className="mt-1 text-sm text-[#6b5a50]">
                Showing your latest 3 orders.
              </p>
            </div>

            <Link
              href="/account/orders"
              className="text-sm font-bold text-[#9f2f18] underline"
            >
              View Full Order History
            </Link>
          </div>

          <div className="space-y-4">
            {orders.map((order) => {
              const weeklyItemCount = order.items.filter(
                (item) => item.weeklyMealPlanSelection,
              ).length;

              return (
                <div
                  key={order.id}
                  className="rounded-lg border border-[var(--brand-border)] p-4 transition hover:bg-[var(--brand-surface-soft)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {formatOrderType(order.orderType)} Order
                      </p>

                      <p className="mt-1 text-sm text-[#6b5a50]">
                        {order.items.length} item
                        {order.items.length === 1 ? "" : "s"} -{" "}
                        {order.createdAt.toLocaleDateString()}
                      </p>

                      {weeklyItemCount > 0 && (
                        <p className="mt-1 text-xs font-medium text-emerald-700">
                          {weeklyItemCount} weekly meal plan
                          {weeklyItemCount === 1 ? "" : "s"}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-neutral-500">
                        {getOrderScheduleLabel(weeklyItemCount > 0)}:{" "}
                        {formatOrderScheduleDateTime(order.requestedDateTime, {
                          hasWeeklyMealPlan: weeklyItemCount > 0,
                          fixedFulfillmentMessage:
                            weeklyItemCount > 0
                              ? null
                              : fixedCheckoutScheduleMessage,
                        })}
                      </p>

                      {order.paymentStatus && (
                        <p className="mt-2 text-xs font-bold text-[#9f2f18]">
                          Payment: {formatPaymentStatus(order.paymentStatus)}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
                        {formatOrderStatus(order.status)}
                      </span>

                      <p className="mt-2 font-bold">
                        ${Number(order.total).toFixed(2)}
                      </p>

                      <Link
                        href={`/orders/${order.id}`}
                        className="brand-button-secondary mt-3 px-4 py-2 text-xs"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {orders.length === 0 && (
              <div className="rounded-lg bg-[var(--brand-surface-soft)] p-6 text-center">
                <p className="font-bold">No recent activity yet.</p>

                <Link
                  href="/menu"
                  className="brand-button-primary mt-4 px-5 py-3 text-sm"
                >
                  View Menu
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
