import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth-guards";
import Link from "next/link";
import { BusinessInsightsSection } from "@/components/admin/reports/BusinessInsightsSection";
import { AdminPageHelpLink } from "@/components/admin/AdminPageHelpLink";
import { getBusinessInsightsMetrics } from "@/lib/admin-report-metrics";

type TopOrderedItem = {
  name: string;
  _sum: {
    quantity: number | null;
  };
};

type PageProps = {
  searchParams: Promise<{
    period?: string;
  }>;
};

export default async function AdminReportsPage({ searchParams }: PageProps) {
  await requireAdminPage();

  const params = await searchParams;
  const now = new Date();

  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);

  const monthAgo = new Date();
  monthAgo.setMonth(now.getMonth() - 1);

  const metricQueries = {
    totalRevenueResult: prisma.order.aggregate({
      where: {
        status: {
          notIn: ["CANCELLED", "REFUNDED"],
        },
      },
      _sum: {
        total: true,
      },
    }),

    weeklyOrders: prisma.order.count({
      where: {
        createdAt: {
          gte: weekAgo,
        },
      },
    }),

    monthlyOrders: prisma.order.count({
      where: {
        createdAt: {
          gte: monthAgo,
        },
      },
    }),

    pendingPayments: prisma.order.count({
      where: {
        paymentStatus: {
          in: ["PAY_BY_DATE", "OFFLINE_PAYMENT_DUE"],
        },
      },
    }),

    completedOrders: prisma.order.count({
      where: {
        status: "COMPLETED",
      },
    }),

    cancelledOrders: prisma.order.count({
      where: {
        status: "CANCELLED",
      },
    }),

    topItems: prisma.orderItem.groupBy({
      by: ["name"],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    }),

    pendingOrderApprovals: prisma.order.count({
      where: {
        approvalStatus: "PENDING",
      },
    }),

    pendingCateringApprovals: prisma.cateringRequest.count({
      where: {
        approvalStatus: "PENDING",
      },
    }),

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

    businessInsights: getBusinessInsightsMetrics(params.period),
  };

  const [
    totalRevenueResult,
    weeklyOrders,
    monthlyOrders,
    pendingPayments,
    serviceRequests,
    cateringRequests,
    personalChefRequests,
    completedOrders,
    cancelledOrders,
    topItems,
    pendingOrderApprovals,
    pendingCateringApprovals,
    businessInsights,
  ] = await Promise.all([
    metricQueries.totalRevenueResult,
    metricQueries.weeklyOrders,
    metricQueries.monthlyOrders,
    metricQueries.pendingPayments,
    metricQueries.serviceRequests,
    metricQueries.cateringRequests,
    metricQueries.personalChefRequests,
    metricQueries.completedOrders,
    metricQueries.cancelledOrders,
    metricQueries.topItems,
    metricQueries.pendingOrderApprovals,
    metricQueries.pendingCateringApprovals,
    metricQueries.businessInsights,
  ]);

  const totalRevenue = Number(totalRevenueResult._sum.total ?? 0);
  const topOrderedItems = topItems as TopOrderedItem[];

  const averageOrderValue =
    monthlyOrders > 0 ? totalRevenue / monthlyOrders : 0;

  const cards = [
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
    },
    {
      label: "Orders This Week",
      value: weeklyOrders,
    },
    {
      label: "Orders This Month",
      value: monthlyOrders,
    },
    {
      label: "Average Order Value",
      value: `$${averageOrderValue.toFixed(2)}`,
    },
    {
      label: "Pending Payments",
      value: pendingPayments,
    },
    {
      label: "Service Requests",
      value: serviceRequests,
    },
    {
      label: "Catering Requests",
      value: cateringRequests,
    },
    {
      label: "Personal Chef Requests",
      value: personalChefRequests,
    },
    {
      label: "Order Approvals",
      value: pendingOrderApprovals,
    },
    {
      label: "Service Request Approvals",
      value: pendingCateringApprovals,
    },
  ];

  return (
    <main className="admin-page">
      <div className="admin-container">
        <div className="mb-8">
          <Link className="admin-back-link" href="/admin">
            &larr; Back to Dashboard
          </Link>
          <p className="admin-eyebrow mt-5">Reporting & Analytics</p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Business Insights
          </h1>
          <div className="mt-4"><AdminPageHelpLink section="reports-notifications" /></div>

          <p className="mt-3 max-w-2xl text-[#6b5a50]">
            Monitor revenue, customer activity, kitchen operations, service
            requests, and payment tracking.
          </p>
        </div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div key={card.label} className="admin-card p-6">
              <p className="text-sm font-bold text-[#6b5a50]">{card.label}</p>

              <p className="mt-3 text-4xl font-black tracking-tight">
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_420px]">
          <section className="space-y-8">
            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Order Status Breakdown</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="admin-card-muted p-5">
                  <p className="text-sm font-bold text-[#6b5a50]">
                    Completed Orders
                  </p>

                  <p className="mt-3 text-3xl font-black">{completedOrders}</p>
                </div>

                <div className="admin-card-muted p-5">
                  <p className="text-sm font-bold text-[#6b5a50]">
                    Cancelled Orders
                  </p>

                  <p className="mt-3 text-3xl font-black">{cancelledOrders}</p>
                </div>
              </div>
            </div>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Most Ordered Items</h2>

              <div className="mt-6 space-y-3">
                {topOrderedItems.map((item, index) => (
                  <div
                    key={item.name}
                    className="admin-row-card flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-black">
                        #{index + 1} {item.name}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-black">
                        {item._sum.quantity ?? 0}
                      </p>

                      <p className="text-xs text-[#6b5a50]">ordered</p>
                    </div>
                  </div>
                ))}

                {topOrderedItems.length === 0 && (
                  <p className="admin-card-muted p-4 text-[#6b5a50]">
                    No order data yet.
                  </p>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <section className="admin-card p-6">
              <h2 className="text-2xl font-black">Operational Alerts</h2>

              <div className="mt-5 space-y-3 text-sm">
                {pendingPayments > 0 ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-medium text-amber-950">
                    {pendingPayments} payment
                    {pendingPayments === 1 ? "" : "s"} still pending.
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#f1ede7] p-4 text-[#6b5a50]">
                    No pending payments.
                  </div>
                )}

                {serviceRequests > 0 && (
                  <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 font-medium text-blue-950">
                    {serviceRequests} service request
                    {serviceRequests === 1 ? "" : "s"} submitted.
                  </div>
                )}

                {personalChefRequests > 0 && (
                  <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 font-medium text-blue-950">
                    {personalChefRequests} personal chef request
                    {personalChefRequests === 1 ? "" : "s"} submitted.
                  </div>
                )}
                {pendingOrderApprovals > 0 && (
                  <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 font-medium text-blue-950">
                    {pendingOrderApprovals} order
                    {pendingOrderApprovals === 1 ? "" : "s"} waiting for
                    approval.
                  </div>
                )}

                {pendingCateringApprovals > 0 && (
                  <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 font-medium text-blue-950">
                    {pendingCateringApprovals} service request
                    {pendingCateringApprovals === 1 ? "" : "s"} waiting for
                    approval.
                  </div>
                )}
              </div>
            </section>

            <section className="admin-card p-6">
              <h2 className="text-2xl font-black">Revenue Snapshot</h2>

              <div className="mt-5 space-y-4">
                <div className="admin-card-muted p-5">
                  <p className="text-sm font-bold text-[#6b5a50]">
                    Gross Revenue
                  </p>

                  <p className="mt-3 text-3xl font-black">
                    ${totalRevenue.toFixed(2)}
                  </p>
                </div>

                <div className="admin-card-muted p-5">
                  <p className="text-sm font-bold text-[#6b5a50]">
                    Average Order
                  </p>

                  <p className="mt-3 text-3xl font-black">
                    ${averageOrderValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <BusinessInsightsSection metrics={businessInsights} />
      </div>
    </main>
  );
}
