import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth-guards";
import { getBusinessSettings } from "@/lib/business-settings";
import { formatOrderStatus, formatOrderType } from "@/lib/format-labels";
import type { DecimalLike } from "@/types/display";

type AdminRecentOrder = {
  id: string;
  customerName: string;
  orderType: string;
  status: string;
  total: DecimalLike;
  createdAt: Date;
  items: {
    id: string;
    weeklyMealPlanSelection: {
      id: string;
    } | null;
  }[];
};

export default async function AdminPage() {
  const session = await requireAdminPage();

  const metrics = {
    pendingOrders: prisma.order.count({
      where: { status: "PENDING" },
    }),

    activeOrders: prisma.order.count({
      where: {
        status: {
          in: ["PENDING", "ACCEPTED", "PREPARING", "READY"],
        },
      },
    }),

    completedOrders: prisma.order.count({
      where: { status: "COMPLETED" },
    }),

    unpaidOrders: prisma.order.count({
      where: {
        status: {
          notIn: ["CANCELLED", "REFUNDED"],
        },
        paymentStatus: {
          in: ["PAY_BY_DATE", "OFFLINE_PAYMENT_DUE"],
        },
      },
    }),

    approvalOrders: prisma.order.count({
      where: {
        status: {
          notIn: ["CANCELLED", "REFUNDED"],
        },
        approvalStatus: "PENDING",
      },
    }),

    pendingCateringApprovals: prisma.cateringRequest.count({
      where: {
        approvalStatus: "PENDING",
      },
    }),

    recentOrders: prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          select: {
            id: true,
            weeklyMealPlanSelection: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    }) as Promise<AdminRecentOrder[]>,

    serviceRequests: prisma.cateringRequest.count(),

    cateringRequests: prisma.cateringRequest.count({
      where: {
        requestType: "CATERING",
      },
    }),

    personalChefRequests: prisma.cateringRequest.count({
      where: {
        requestType: "PERSONAL_CHEF",
      },
    }),

    businessSettings: getBusinessSettings(),
  };

  const [
    pendingOrders,
    activeOrders,
    completedOrders,
    unpaidOrders,
    approvalOrders,
    pendingCateringApprovals,
    recentOrders,
    businessSettings,
    serviceRequests,
    cateringRequests,
    personalChefRequests,
  ] = await Promise.all([
    metrics.pendingOrders,
    metrics.activeOrders,
    metrics.completedOrders,
    metrics.unpaidOrders,
    metrics.approvalOrders,
    metrics.pendingCateringApprovals,
    metrics.recentOrders,
    metrics.businessSettings,
    metrics.serviceRequests,
    metrics.cateringRequests,
    metrics.personalChefRequests,
  ]);

  const totalRevenueResult = await prisma.order.aggregate({
    where: {
      status: {
        notIn: ["CANCELLED", "REFUNDED"],
      },
    },
    _sum: {
      total: true,
    },
  });

  const totalRevenue = Number(totalRevenueResult._sum.total ?? 0);
  const recentAdminOrders = recentOrders as AdminRecentOrder[];

  const cards = [
    {
      label: "Pending Orders",
      value: pendingOrders,
      href: "/admin/orders",
    },
    {
      label: "Service Request Approvals",
      value: pendingCateringApprovals,
      href: "/admin/catering?approval=PENDING",
    },
    {
      label: "Active Orders",
      value: activeOrders,
      href: "/admin/kitchen",
    },
    {
      label: "Completed Orders",
      value: completedOrders,
      href: "/admin/orders",
    },
    {
      label: "Payment Due",
      value: unpaidOrders,
      href: "/admin/orders",
    },
    {
      label: "Needs Approval",
      value: approvalOrders,
      href: "/admin/orders",
    },
    {
      label: "Revenue Snapshot",
      value: `$${totalRevenue.toFixed(2)}`,
      href: "/admin/reports",
    },
    {
      label: "Service Requests",
      value: serviceRequests,
      href: "/admin/catering",
    },
    {
      label: "Catering Requests",
      value: cateringRequests,
      href: "/admin/catering?type=CATERING",
    },
    {
      label: "Personal Chef Requests",
      value: personalChefRequests,
      href: "/admin/catering?type=PERSONAL_CHEF",
    },
  ];

  const sections = [
    { label: "Orders", href: "/admin/orders" },
    { label: "Kitchen View", href: "/admin/kitchen" },
    { label: "Menu Manager", href: "/admin/menu" },
    { label: "Gallery Manager", href: "/admin/gallery" },
    { label: "Service Requests", href: "/admin/catering" },
    { label: "Customers", href: "/admin/customers" },
    { label: "Reports", href: "/admin/reports" },
    { label: "Business Settings", href: "/admin/settings" },
    { label: "Payment Settings", href: "/admin/payments" },
    { label: "Notifications", href: "/admin/notifications" },
    { label: "Audit Log", href: "/admin/audit" },
    { label: "Help & Guide", href: "/admin/help" },
    ...(session.user.role === "OWNER"
      ? [{ label: "Role Manager", href: "/admin/role-manager" }]
      : []),
  ];

  return (
    <main className="admin-page">
      <div className="admin-container">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="admin-eyebrow">Admin Dashboard</p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Kitchen Control Center
            </h1>

            <p className="mt-3 max-w-2xl text-[#6b5a50]">
              Monitor orders, payments, menu items, meal plans, and kitchen
              workflow from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/orders"
              className="brand-button-primary px-5 py-3 text-sm"
            >
              Review Orders
            </Link>
            <Link
              href="/admin/kitchen"
              className="brand-button-secondary px-5 py-3 text-sm"
            >
              Kitchen View
            </Link>
            <Link href="/admin/help" className="brand-button-secondary px-5 py-3 text-sm">
              Help &amp; Guide
            </Link>
          </div>
        </div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="admin-card group p-6 transition hover:-translate-y-1 hover:border-[#8a2b18] hover:shadow-xl"
            >
              <p className="text-sm font-bold text-[#6b5a50]">{card.label}</p>

              <p className="mt-3 text-4xl font-black tracking-tight">
                {card.value}
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#8a2b18] opacity-0 transition group-hover:opacity-100">
                Open
              </p>
            </Link>
          ))}
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
          <section className="admin-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black">Recent Orders</h2>

              <Link href="/admin/orders" className="admin-action-link text-sm">
                View all
              </Link>
            </div>

            <div className="space-y-4">
              {recentAdminOrders.map((order) => {
                const weeklyItemCount = order.items.filter(
                  (item) => item.weeklyMealPlanSelection,
                ).length;

                return (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="block rounded-lg border border-[#ead8c1] p-4 transition hover:border-[#d99426] hover:bg-[#fff8ee]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black">{order.customerName}</p>

                        <p className="mt-1 text-sm text-[#6b5a50]">
                          {formatOrderType(order.orderType)} -{" "}
                          {order.items.length} item
                          {order.items.length === 1 ? "" : "s"}
                        </p>

                        {weeklyItemCount > 0 && (
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            {weeklyItemCount} weekly meal plan
                            {weeklyItemCount === 1 ? "" : "s"}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-neutral-500">
                          {order.createdAt.toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="admin-badge admin-badge-neutral">
                          {formatOrderStatus(order.status)}
                        </span>

                        <p className="mt-2 font-bold">
                          ${Number(order.total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {recentAdminOrders.length === 0 && (
                <p className="admin-card-muted p-4 text-[#6b5a50]">
                  No recent orders yet.
                </p>
              )}
            </div>
          </section>

          <aside className="space-y-8">
            <section className="admin-card p-6">
              <h2 className="text-2xl font-black">Operational Alerts</h2>

              <div className="mt-5 space-y-3 text-sm">
                {unpaidOrders > 0 && (
                  <Link
                    href="/admin/orders"
                    className="block rounded-lg border border-amber-300 bg-amber-50 p-4 font-medium text-amber-950 transition hover:border-amber-500"
                  >
                    {unpaidOrders} order{unpaidOrders === 1 ? "" : "s"} with
                    payment still due.
                  </Link>
                )}

                {approvalOrders > 0 && (
                  <Link
                    href="/admin/orders"
                    className="block rounded-lg border border-blue-300 bg-blue-50 p-4 font-medium text-blue-950 transition hover:border-blue-500"
                  >
                    {approvalOrders} order{approvalOrders === 1 ? "" : "s"} may
                    require chef approval.
                  </Link>
                )}

                {pendingOrders > 0 && (
                  <Link
                    href="/admin/orders"
                    className="block rounded-lg border border-[#ead8c1] bg-[#fff8ee] p-4 font-medium transition hover:border-[#d99426]"
                  >
                    {pendingOrders} pending order
                    {pendingOrders === 1 ? "" : "s"} waiting for review.
                  </Link>
                )}

                {pendingCateringApprovals > 0 && (
                  <Link
                    href="/admin/catering?approval=PENDING"
                    className="block rounded-lg border border-blue-300 bg-blue-50 p-4 font-medium text-blue-950 transition hover:border-blue-500"
                  >
                    {pendingCateringApprovals} service request
                    {pendingCateringApprovals === 1 ? "" : "s"} waiting for
                    approval.
                  </Link>
                )}

                {unpaidOrders === 0 &&
                  approvalOrders === 0 &&
                  pendingCateringApprovals === 0 &&
                  pendingOrders === 0 && (
                    <p className="rounded-lg bg-[#f1ede7] p-4 text-[#6b5a50]">
                      No urgent alerts.
                    </p>
                  )}
              </div>
            </section>
            {businessSettings && (
              <section className="admin-card p-6">
                <h2 className="text-2xl font-black">Active Business Rules</h2>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-[#ead8c1] pb-3">
                    <span className="text-[#6b5a50]">Delivery Fee</span>
                    <span className="font-bold">
                      ${Number(businessSettings.deliveryFee).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-[#ead8c1] pb-3">
                    <span className="text-[#6b5a50]">Late Fee</span>
                    <span className="font-bold">
                      ${Number(businessSettings.lateFee).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-[#ead8c1] pb-3">
                    <span className="text-[#6b5a50]">
                      Service Request Deposit
                    </span>
                    <span className="font-bold">
                      {businessSettings.cateringDepositPercent}%
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-[#6b5a50]">Weekend Orders</span>
                    <span className="font-bold">
                      {businessSettings.noWeekendOrdering
                        ? "Disabled"
                        : "Allowed"}
                    </span>
                  </div>
                </div>
              </section>
            )}
            <section className="admin-card p-6">
              <h2 className="text-2xl font-black">Quick Links</h2>

              <div className="mt-5 grid gap-3">
                {sections.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-lg border border-[#ead8c1] px-4 py-3 text-sm font-bold transition hover:border-[#8a2b18] hover:bg-[#fff8ee]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
