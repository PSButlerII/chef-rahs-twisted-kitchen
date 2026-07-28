import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth-guards";
import { UpdateCateringStatusForm } from "@/components/admin/UpdateCateringStatusForm";
import { CateringApprovalForm } from "@/components/admin/CateringApprovalForm";
import Link from "next/link";
import { CateringQuoteForm } from "@/components/admin/CateringQuoteForm";
import { MarkDepositPaidButton } from "@/components/admin/MarkDepositPaidButton";
import { SendDepositPaymentRequestButton } from "@/components/admin/SendDepositPaymentRequestButton";
import { SendFinalBalancePaymentRequestButton } from "@/components/admin/SendFinalBalancePaymentRequestButton";
import {
  formatServiceRequestStatus,
  formatServiceRequestType,
} from "@/lib/format-labels";
import {
  canEditServiceRequestQuote,
  canMarkServiceRequestDepositPaid,
  isTerminalServiceRequestStatus,
} from "@/lib/service-request-workflow";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatOptionalCurrency(value: number | null) {
  return value === null ? "Not set" : `$${value.toFixed(2)}`;
}

export default async function AdminCateringDetailsPage({ params }: PageProps) {
  await requireAdminPage();

  const { id } = await params;

  const request = await prisma.cateringRequest.findUnique({
    where: { id },
    include: {
      paymentAttempts: {
        where: {
          paymentPurpose: {
            in: ["SERVICE_DEPOSIT", "SERVICE_FINAL_BALANCE"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!request) {
    notFound();
  }

  const requestTypeLabel = formatServiceRequestType(request.requestType);
  const estimatedTotal =
    request.estimatedTotal === null ? null : Number(request.estimatedTotal);
  const depositAmount =
    request.depositAmount === null ? null : Number(request.depositAmount);
  const depositPaid = request.depositPaidAt !== null;
  const terminalStatus = isTerminalServiceRequestStatus(request.status);
  const quoteLockedReason = canEditServiceRequestQuote({
    approvalStatus: request.approvalStatus,
    depositPaid,
    status: request.status,
  })
    ? null
    : depositPaid
      ? "Quote editing is locked after the deposit is marked paid."
      : request.approvalStatus === "DENIED"
        ? "Quote editing is locked because this service request was denied."
        : terminalStatus
          ? "Quote editing is locked because this service request is final."
          : "Quote editing is not available for this request.";
  const canMarkDepositPaid = canMarkServiceRequestDepositPaid({
    approvalStatus: request.approvalStatus,
    depositAmount,
    depositPaid,
    status: request.status,
  });
  const depositAttempts = request.paymentAttempts.filter(
    (attempt) => attempt.paymentPurpose === "SERVICE_DEPOSIT",
  );
  const finalBalanceAttempts = request.paymentAttempts.filter(
    (attempt) => attempt.paymentPurpose === "SERVICE_FINAL_BALANCE",
  );
  const latestDepositAttempt = depositAttempts[0] ?? null;
  const latestFinalBalanceAttempt = finalBalanceAttempts[0] ?? null;
  const activeDepositAttempt = depositAttempts.find(
    (attempt) =>
      ["CREATED", "PENDING", "REQUIRES_ACTION"].includes(
        attempt.websiteStatus,
      ) &&
      !attempt.paidAt &&
      Boolean(attempt.expiresAt && attempt.expiresAt > new Date()),
  );
  const activeFinalBalanceAttempt = finalBalanceAttempts.find(
    (attempt) =>
      ["CREATED", "PENDING", "REQUIRES_ACTION"].includes(
        attempt.websiteStatus,
      ) &&
      !attempt.paidAt &&
      Boolean(attempt.expiresAt && attempt.expiresAt > new Date()),
  );
  const finalBalancePaidAttempt = finalBalanceAttempts.find(
    (attempt) => attempt.websiteStatus === "PAID" && Boolean(attempt.paidAt),
  );
  const attemptMetadata =
    latestDepositAttempt?.metadata &&
    typeof latestDepositAttempt.metadata === "object" &&
    !Array.isArray(latestDepositAttempt.metadata)
      ? latestDepositAttempt.metadata
      : {};
  const paymentLink =
    typeof attemptMetadata.squarePaymentLinkUrl === "string"
      ? attemptMetadata.squarePaymentLinkUrl
      : null;
  const finalBalanceMetadata =
    latestFinalBalanceAttempt?.metadata &&
    typeof latestFinalBalanceAttempt.metadata === "object" &&
    !Array.isArray(latestFinalBalanceAttempt.metadata)
      ? latestFinalBalanceAttempt.metadata
      : {};
  const finalBalancePaymentLink =
    typeof finalBalanceMetadata.squarePaymentLinkUrl === "string"
      ? finalBalanceMetadata.squarePaymentLinkUrl
      : null;
  const quoteTotalCents =
    estimatedTotal === null ? null : Math.round(estimatedTotal * 100);
  const depositCents =
    depositAmount === null ? 0 : Math.round(depositAmount * 100);
  const finalBalanceCents =
    quoteTotalCents === null ? null : quoteTotalCents - depositCents;
  const depositRequestDisabledReason =
    request.approvalStatus !== "APPROVED"
      ? "Approve the service request before requesting its deposit."
      : depositPaid
        ? "The deposit has already been paid."
        : !depositAmount || depositAmount <= 0
          ? "Set a positive deposit amount first."
          : terminalStatus
            ? "Final service requests cannot accept a deposit."
            : activeDepositAttempt
              ? "An active unpaid deposit request already exists."
              : null;
  const finalBalanceDisabledReason =
    request.approvalStatus !== "APPROVED"
      ? "Approve the service request before requesting final payment."
      : !depositPaid
        ? "The deposit must be paid before requesting final payment."
        : quoteTotalCents === null
          ? "Set a quoted total first."
          : finalBalanceCents === null || finalBalanceCents <= 0
            ? "There is no positive remaining balance."
            : terminalStatus
              ? "Final service requests cannot accept another payment."
              : finalBalancePaidAttempt
                ? "The final balance has already been paid."
                : activeFinalBalanceAttempt
                  ? "An active unpaid final-balance request already exists."
                  : null;

  return (
    <main className="admin-page">
      <div className="admin-container max-w-6xl">
        <div className="mb-8">
          <Link className="admin-back-link" href="/admin/catering">
            &larr; Back to Service Requests
          </Link>
          <p className="admin-eyebrow mt-5">Admin</p>
          <p className="admin-eyebrow mt-1">{requestTypeLabel} Request</p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            {request.name}
          </h1>

          <p className="mt-3 break-all text-sm text-[#6b5a50]">{request.id}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Customer</h2>

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <strong>Name:</strong> {request.name}
                </p>
                <p>
                  <strong>Email:</strong> {request.email}
                </p>
                <p>
                  <strong>Phone:</strong> {request.phone ?? "Not provided"}
                </p>
              </div>
            </div>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Event Details</h2>

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <strong>Event Type:</strong>{" "}
                  {request.eventType ?? "Not provided"}
                </p>
                <p>
                  <strong>Event Date:</strong>{" "}
                  {request.eventDate
                    ? request.eventDate.toLocaleString()
                    : "Not provided"}
                </p>
                <p>
                  <strong>Guest Count:</strong>{" "}
                  {request.guestCount ?? "Not provided"}
                </p>
                <p>
                  <strong>Location:</strong>{" "}
                  {request.location ?? "Not provided"}
                </p>
              </div>
            </div>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Request Notes</h2>

              <div className="mt-4 space-y-5 text-sm">
                <div>
                  <p className="font-medium">Requested Menu</p>
                  <p className="mt-1 whitespace-pre-wrap text-neutral-700">
                    {request.requestedMenu ?? "None provided."}
                  </p>
                </div>

                <div>
                  <p className="font-medium">Allergy Notes</p>
                  {request.allergyNotes ? (
                    <div className="mt-2 rounded-lg border-2 border-red-500 bg-red-50 p-4 text-red-900">
                      <p className="text-xs font-bold uppercase text-red-700">
                        Allergy Alert
                      </p>
                      <p className="mt-2 whitespace-pre-wrap">
                        {request.allergyNotes}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-neutral-700">None provided.</p>
                  )}
                </div>

                <div>
                  <p className="font-medium">Special Requests</p>
                  <p className="mt-1 whitespace-pre-wrap text-neutral-700">
                    {request.specialRequests ?? "None provided."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Approval</h2>

              <div className="mt-6">
                <CateringApprovalForm
                  requestId={request.id}
                  currentApprovalStatus={request.approvalStatus}
                />
              </div>

              {request.approvalNote && (
                <p className="mt-4 text-sm text-neutral-600">
                  <strong>Note:</strong> {request.approvalNote}
                </p>
              )}
            </div>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Status</h2>

              <p className="admin-badge admin-badge-neutral mt-3 justify-center px-3 py-2">
                {formatServiceRequestStatus(request.status)}
              </p>

              <div className="mt-6">
                <UpdateCateringStatusForm
                  requestId={request.id}
                  currentStatus={request.status}
                  currentApprovalStatus={request.approvalStatus}
                  depositPaid={depositPaid}
                  hasDepositDue={depositAmount !== null && depositAmount > 0}
                />
              </div>
            </div>

            <div className="admin-card p-6">
              <h2 className="text-2xl font-black">Quote / Deposit</h2>

              <div className="mt-5 space-y-3 text-sm">
                <p>
                  <strong>Estimated Total:</strong>{" "}
                  {formatOptionalCurrency(estimatedTotal)}
                </p>

                <p>
                  <strong>Deposit Amount:</strong>{" "}
                  {formatOptionalCurrency(depositAmount)}
                </p>

                <p>
                  <strong>Deposit Paid:</strong>{" "}
                  {request.depositPaidAt
                    ? request.depositPaidAt.toLocaleString()
                    : "Not paid"}
                </p>

                <div className="mt-6 border-t pt-5">
                  <CateringQuoteForm
                    requestId={request.id}
                    currentEstimatedTotal={estimatedTotal}
                    currentDepositAmount={depositAmount}
                    lockedReason={quoteLockedReason}
                  />
                  {canMarkDepositPaid && (
                    <div className="mt-5">
                      <MarkDepositPaidButton requestId={request.id} />
                    </div>
                  )}
                  {depositAmount === 0 && !depositPaid ? (
                    <p className="mt-4 rounded-lg border border-[#ead8c1] bg-[#fff8ee] p-4 text-sm text-[#6b5a50]">
                      No deposit is due for this service request.
                    </p>
                  ) : null}
                  {depositAmount !== null &&
                  depositAmount > 0 &&
                  depositPaid ? (
                    <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                      Deposit has already been marked paid.
                    </p>
                  ) : null}

                  <div className="mt-5 space-y-3 border-t border-[#ead8c1] pt-5">
                    <p className="text-sm font-bold">Square Payment Requests</p>
                    <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">
                      Sandbox/test only
                    </p>
                    <SendDepositPaymentRequestButton
                      requestId={request.id}
                      disabledReason={depositRequestDisabledReason}
                    />
                    <SendFinalBalancePaymentRequestButton
                      requestId={request.id}
                      disabledReason={finalBalanceDisabledReason}
                    />
                  </div>
                  {latestDepositAttempt ? (
                    <div className="mt-5 space-y-2 rounded-lg border border-[#ead8c1] p-4 text-xs">
                      <p className="font-bold">
                        Latest deposit: {latestDepositAttempt.websiteStatus}
                      </p>
                      <p>
                        Amount: $
                        {(latestDepositAttempt.amountCents / 100).toFixed(2)}
                      </p>
                      <p>
                        Expires:{" "}
                        {latestDepositAttempt.expiresAt?.toLocaleString() ??
                          "Not set"}
                      </p>
                      <p>
                        Paid:{" "}
                        {latestDepositAttempt.paidAt?.toLocaleString() ??
                          "Not paid"}
                      </p>
                      {paymentLink &&
                      latestDepositAttempt.websiteStatus !== "PAID" ? (
                        <a
                          className="admin-action-link"
                          href={paymentLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Square payment link
                        </a>
                      ) : null}
                      {latestDepositAttempt.providerReceiptUrl ? (
                        <a
                          className="admin-action-link block"
                          href={latestDepositAttempt.providerReceiptUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Square receipt
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-5 rounded-lg border border-[#ead8c1] p-4 text-xs">
                    <p className="font-bold">Final balance</p>
                    <p className="mt-2">
                      Amount:{" "}
                      {finalBalanceCents === null
                        ? "Not available"
                        : `$${(finalBalanceCents / 100).toFixed(2)}`}
                    </p>
                    <p>
                      Status:{" "}
                      {latestFinalBalanceAttempt?.websiteStatus ??
                        "Not requested"}
                    </p>
                    <p>
                      Expires:{" "}
                      {latestFinalBalanceAttempt?.expiresAt?.toLocaleString() ??
                        "Not set"}
                    </p>
                    <p>
                      Paid:{" "}
                      {latestFinalBalanceAttempt?.paidAt?.toLocaleString() ??
                        "Not paid"}
                    </p>
                    {finalBalancePaymentLink &&
                    latestFinalBalanceAttempt?.websiteStatus !== "PAID" ? (
                      <a
                        className="admin-action-link mt-2 block"
                        href={finalBalancePaymentLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Square final-balance link
                      </a>
                    ) : null}
                    {latestFinalBalanceAttempt?.providerReceiptUrl ? (
                      <a
                        className="admin-action-link mt-2 block"
                        href={latestFinalBalanceAttempt.providerReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Square final-balance receipt
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
