import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth-guards";
import { getEmailDeliveryMode } from "@/lib/email";
import Link from "next/link";
import { AdminPageHelpLink } from "@/components/admin/AdminPageHelpLink";

export default async function AdminNotificationsPage() {
  await requireAdminPage();

  const emailDeliveryMode = getEmailDeliveryMode();
  const emailStatus =
    emailDeliveryMode === "live"
      ? "Live Sending"
      : emailDeliveryMode === "preview"
        ? "Preview Files"
        : emailDeliveryMode === "dry-run"
          ? "Dry Run"
          : "Disabled";
  const emailDescription =
    emailDeliveryMode === "live"
      ? "Customer notification emails are sent through the configured email provider."
      : emailDeliveryMode === "preview"
        ? "Customer notification emails are not sent; preview files are saved locally for QA."
        : emailDeliveryMode === "dry-run"
          ? "Customer notification emails are logged only because EMAIL_DRY_RUN is enabled."
          : "Customer notification emails are skipped because RESEND_API_KEY is not configured.";

  const [pendingOrders, unpaidOrders, serviceRequests] = await Promise.all([
    prisma.order.count({
      where: { status: "PENDING" },
    }),

    prisma.order.count({
      where: {
        paymentStatus: {
          in: ["PAY_BY_DATE", "OFFLINE_PAYMENT_DUE"],
        },
      },
    }),

    prisma.cateringRequest.count({
      where: {
        status: {
          in: ["NEW", "REVIEWING", "QUOTED", "DEPOSIT_DUE"],
        },
      },
    }),
  ]);

  const notificationGroups = [
    {
      title: "Order Confirmations",
      status: "Active",
      description: "Customers receive an email after an order is submitted.",
    },
    {
      title: "Order Approval Updates",
      status: "Active",
      description:
        "Customers receive an email when an approval-required order is approved or denied.",
    },
    {
      title: "Payment Received Notices",
      status: "Active",
      description:
        "Customers receive an email when manual/offline payment is marked as paid.",
    },
    {
      title: "Service Request Confirmations",
      status: "Active",
      description:
        "Customers receive an email after submitting a catering or personal chef request.",
    },
    {
      title: "Service Request Approval / Quote Updates",
      status: "Active",
      description:
        "Customers receive an email when service request approval or quote details are updated.",
    },
    {
      title: "Service Request Deposit Received",
      status: "Active",
      description:
        "Customers receive an email when a service request deposit is marked as paid.",
    },
    {
      title: "Kitchen Status Updates",
      status: "Planned",
      description:
        "Notify customers when an order is preparing, ready, or completed.",
    },
    {
      title: "Payment Reminders",
      status: "Planned",
      description:
        "Send reminders for manual invoices, offline payments, and pay-by-date orders.",
    },
  ];

  return (
    <main className="admin-page">
      <div className="admin-container">
        <div className="mb-8">
          <Link className="admin-back-link" href="/admin">
            &larr; Back to Dashboard
          </Link>
          <p className="admin-eyebrow mt-5">Admin</p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Notifications
          </h1>
          <div className="mt-4"><AdminPageHelpLink section="reports-notifications" /></div>

          <p className="mt-3 max-w-2xl text-[#6b5a50]">
            Track notification needs for customer orders, payment reminders,
            kitchen status updates, and service request follow-ups.
          </p>
        </div>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="admin-card p-6">
            <p className="text-sm font-bold text-[#6b5a50]">
              Pending Order Notices
            </p>
            <p className="mt-3 text-4xl font-black tracking-tight">
              {pendingOrders}
            </p>
          </div>

          <div className="admin-card p-6">
            <p className="text-sm font-bold text-[#6b5a50]">
              Payment Reminders
            </p>
            <p className="mt-3 text-4xl font-black tracking-tight">
              {unpaidOrders}
            </p>
          </div>

          <div className="admin-card p-6">
            <p className="text-sm font-bold text-[#6b5a50]">
              Service Request Follow-ups
            </p>
            <p className="mt-3 text-4xl font-black tracking-tight">
              {serviceRequests}
            </p>
          </div>
        </section>

        <section className="admin-card mt-10 p-6">
          <h2 className="text-2xl font-black">Notification Roadmap</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {notificationGroups.map((group) => (
              <div key={group.title} className="admin-row-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black">{group.title}</h3>
                    <p className="mt-2 text-sm text-[#6b5a50]">
                      {group.description}
                    </p>
                  </div>

                  <span
                    className={
                      group.status === "Active"
                        ? "admin-badge admin-badge-success"
                        : "admin-badge admin-badge-neutral"
                    }
                  >
                    {group.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card mt-8 p-6">
          <h2 className="text-2xl font-black">Email System</h2>

          <div className="admin-card-muted mt-5 p-5">
            <p className="text-sm font-bold text-[#6b5a50]">
              Resend Configuration
            </p>

            <p className="mt-2 text-lg font-black">{emailStatus}</p>

            <p className="mt-2 text-sm text-[#6b5a50]">{emailDescription}</p>
          </div>
        </section>

        <section className="admin-card mt-8 p-6">
          <h2 className="text-2xl font-black">Recommended Providers</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="admin-card-muted p-5">
              <p className="font-black">Email</p>
              <p className="mt-2 text-sm text-[#6b5a50]">
                Use Resend, SendGrid, or Postmark for order confirmations and
                payment reminders.
              </p>
            </div>

            <div className="admin-card-muted p-5">
              <p className="font-black">SMS</p>
              <p className="mt-2 text-sm text-[#6b5a50]">
                Use Twilio later for delivery alerts, pickup reminders, and
                kitchen status updates.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
