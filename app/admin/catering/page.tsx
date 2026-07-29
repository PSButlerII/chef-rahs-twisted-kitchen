import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth-guards";
import {
  formatApprovalStatus,
  formatServiceRequestStatus,
  formatServiceRequestType,
} from "@/lib/format-labels";
import { parseEnumValue } from "@/lib/enum-values";
import {
  approvalStatuses,
  cateringStatuses,
  serviceRequestTypes,
} from "@/lib/prisma-enums";
import {
  deriveServiceRequestPaymentPhase,
  formatServiceRequestPaymentPhase,
  serviceRequestPaymentPhaseBadgeClass,
  serviceRequestPaymentPhases,
  type ServiceRequestPaymentPhase,
} from "@/lib/service-request-payment-phase";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    approval?: string;
    type?: string;
    payment?: string;
  }>;
};

type AdminServiceRequestRow = {
  id: string;
  name: string;
  email: string;
  requestType: string;
  eventType: string | null;
  eventDate: Date | null;
  guestCount: number | null;
  status: string;
  approvalStatus: string;
  createdAt: Date;
  estimatedTotal: { toString(): string } | number | null;
  depositAmount: { toString(): string } | number | null;
  depositPaidAt: Date | null;
  paymentAttempts: {
    paymentPurpose: string;
    websiteStatus: string;
    paidAt: Date | null;
    expiresAt: Date | null;
  }[];
  paymentPhase: ServiceRequestPaymentPhase;
};

function serviceStatusBadgeClass(status: string) {
  if (status === "COMPLETED" || status === "DEPOSIT_PAID") {
    return "admin-badge admin-badge-success";
  }
  if (status === "CANCELLED") return "admin-badge admin-badge-danger";
  if (status === "QUOTED" || status === "DEPOSIT_DUE") {
    return "admin-badge admin-badge-warning";
  }
  if (status === "REVIEWING" || status === "APPROVED") {
    return "admin-badge admin-badge-info";
  }

  return "admin-badge admin-badge-neutral";
}

function approvalStatusBadgeClass(status: string) {
  if (status === "APPROVED") return "admin-badge admin-badge-success";
  if (status === "DENIED") return "admin-badge admin-badge-danger";
  return "admin-badge admin-badge-warning";
}

export default async function AdminCateringPage({ searchParams }: PageProps) {
  await requireAdminPage();

  const params = await searchParams;
  const statusFilter = params.status;
  const approvalFilter = params.approval;
  const typeFilter = params.type;
  const paymentFilter = serviceRequestPaymentPhases.find(
    (phase) => phase === params.payment,
  );
  const status = parseEnumValue(cateringStatuses, statusFilter);
  const approvalStatus = parseEnumValue(approvalStatuses, approvalFilter);
  const requestType = parseEnumValue(serviceRequestTypes, typeFilter);
  const noActiveFilters =
    !statusFilter && !approvalFilter && !typeFilter && !params.payment;

  function filterIsActive(href: string) {
    const [, query = ""] = href.split("?");
    const filterParams = new URLSearchParams(query);

    if (!query) return noActiveFilters;

    return Array.from(filterParams.entries()).every(([key, value]) => {
      if (key === "status") return statusFilter === value;
      if (key === "approval") return approvalFilter === value;
      if (key === "type") return typeFilter === value;
      if (key === "payment") return params.payment === value;
      return false;
    });
  }

  const where = {
    ...(status ? { status } : {}),
    ...(approvalStatus ? { approvalStatus } : {}),
    ...(requestType ? { requestType } : {}),
  };

  const requestRows = await prisma.cateringRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      paymentAttempts: {
        where: { paymentPurpose: "SERVICE_FINAL_BALANCE" },
        select: {
          paymentPurpose: true,
          websiteStatus: true,
          paidAt: true,
          expiresAt: true,
        },
      },
    },
  });
  const requests = requestRows
    .map((request) => ({
      ...request,
      paymentPhase: deriveServiceRequestPaymentPhase({
        approvalStatus: request.approvalStatus,
        estimatedTotal:
          request.estimatedTotal === null
            ? null
            : Number(request.estimatedTotal),
        depositAmount:
          request.depositAmount === null ? null : Number(request.depositAmount),
        depositPaidAt: request.depositPaidAt,
        paymentAttempts: request.paymentAttempts,
      }),
    }))
    .filter(
      (request) => !paymentFilter || request.paymentPhase === paymentFilter,
    ) as AdminServiceRequestRow[];

  const typeFilters = [
    { label: "All", href: "/admin/catering" },
    { label: "Catering", href: "/admin/catering?type=CATERING" },
    {
      label: "Personal Chef",
      href: "/admin/catering?type=PERSONAL_CHEF",
    },
  ];

  const workflowFilters = [
    { label: "All", href: "/admin/catering" },
    { label: "New", href: "/admin/catering?status=NEW" },
    { label: "Reviewing", href: "/admin/catering?status=REVIEWING" },
    { label: "Quoted", href: "/admin/catering?status=QUOTED" },
    { label: "Approved", href: "/admin/catering?status=APPROVED" },
    { label: "Deposit Due", href: "/admin/catering?status=DEPOSIT_DUE" },
    { label: "Deposit Paid", href: "/admin/catering?status=DEPOSIT_PAID" },
    { label: "Completed", href: "/admin/catering?status=COMPLETED" },
    { label: "Cancelled", href: "/admin/catering?status=CANCELLED" },
    { label: "Approval Pending", href: "/admin/catering?approval=PENDING" },
    { label: "Approval Approved", href: "/admin/catering?approval=APPROVED" },
    { label: "Approval Denied", href: "/admin/catering?approval=DENIED" },
  ];
  const paymentFilters = [
    { label: "All Payment Phases", href: "/admin/catering" },
    {
      label: "Deposit Due",
      href: "/admin/catering?payment=DEPOSIT_DUE",
    },
    {
      label: "Deposit Paid",
      href: "/admin/catering?payment=DEPOSIT_PAID",
    },
    {
      label: "Final Balance Due",
      href: "/admin/catering?payment=FINAL_BALANCE_DUE",
    },
    {
      label: "Final Balance Pending",
      href: "/admin/catering?payment=FINAL_BALANCE_PENDING",
    },
    {
      label: "Paid in Full",
      href: "/admin/catering?payment=PAID_IN_FULL",
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
            Service Requests
          </h1>

          <p className="mt-3 max-w-2xl text-[#6b5a50]">
            Review catering inquiries, personal chef requests, quotes, deposits,
            and event details.
          </p>
        </div>

        <div className="admin-card mb-6 p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-black">Request Type</p>
              <p className="mt-1 text-sm text-[#6b5a50]">
                Separate catering and personal chef work without leaving the
                shared service request queue.
              </p>
            </div>

            <span className="text-sm font-bold text-[#6b5a50]">
              {requests.length} result{requests.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {typeFilters.map((filter) => (
              <Link
                key={filter.href}
                href={filter.href}
                className={`admin-filter-chip ${
                  filterIsActive(filter.href) ? "admin-filter-chip-active" : ""
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="admin-card mb-6 p-5">
          <p className="mb-1 font-black">Payment Filters</p>
          <p className="mb-4 text-sm text-[#6b5a50]">
            Payment phase is derived separately from operational workflow
            status.
          </p>
          <div className="flex flex-wrap gap-3">
            {paymentFilters.map((filter) => (
              <Link
                key={filter.href}
                href={filter.href}
                className={`admin-filter-chip ${
                  filterIsActive(filter.href) ? "admin-filter-chip-active" : ""
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="admin-card mb-6 p-5">
          <p className="mb-1 font-black">Workflow Filters</p>
          <p className="mb-4 text-sm text-[#6b5a50]">
            Focus the queue by request status or approval decision.
          </p>

          <div className="flex flex-wrap gap-3">
            {workflowFilters.map((filter) => (
              <Link
                key={filter.href}
                href={filter.href}
                className={`admin-filter-chip ${
                  filterIsActive(filter.href) ? "admin-filter-chip-active" : ""
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="admin-table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>Event</th>
                <th>Guests</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Approval</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="font-black">{request.name}</div>
                    <div className="mt-1 text-xs text-[#6b5a50]">
                      {request.email}
                    </div>
                  </td>

                  <td>
                    <span className="admin-badge admin-badge-neutral">
                      {formatServiceRequestType(request.requestType)}
                    </span>
                  </td>

                  <td>
                    <div>{request.eventType ?? "Event"}</div>
                    <div className="mt-1 text-xs text-[#6b5a50]">
                      {request.eventDate
                        ? request.eventDate.toLocaleString()
                        : "Date not provided"}
                    </div>
                  </td>

                  <td>{request.guestCount ?? "-"}</td>

                  <td>
                    <span className={serviceStatusBadgeClass(request.status)}>
                      {formatServiceRequestStatus(request.status)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={serviceRequestPaymentPhaseBadgeClass(
                        request.paymentPhase,
                      )}
                    >
                      {formatServiceRequestPaymentPhase(request.paymentPhase)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={approvalStatusBadgeClass(
                        request.approvalStatus,
                      )}
                    >
                      {formatApprovalStatus(request.approvalStatus)}
                    </span>
                  </td>

                  <td className="text-[#6b5a50]">
                    {request.createdAt.toLocaleDateString()}
                  </td>

                  <td>
                    <Link
                      href={`/admin/catering/${request.id}`}
                      className="admin-action-link"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}

              {requests.length === 0 && (
                <tr>
                  <td className="text-center text-[#6b5a50]" colSpan={9}>
                    No service requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
