import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import {
  formatServiceRequestType,
  formatServiceRequestStatus,
  formatApprovalStatus,
} from "@/lib/format-labels";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatOptionalCurrency(value: number | null) {
  return value === null ? "Not set" : `$${value.toFixed(2)}`;
}

export default async function AccountCateringDetailsPage({
  params,
}: PageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const { id } = await params;

  const request = await prisma.cateringRequest.findFirst({
    where: {
      id,
      user: {
        email: session.user.email,
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

  return (
    <main className="brand-page px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/account/catering"
          className="text-sm font-bold text-[#9f2f18] underline"
        >
          &larr; Back to Service Requests
        </Link>

        <div className="brand-card mt-8 p-6 sm:p-8">
          <p className="brand-eyebrow">{requestTypeLabel} Request</p>

          <h1 className="mt-3 text-5xl font-black">
            {request.eventType ?? `${requestTypeLabel} Request`}
          </h1>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-[var(--brand-surface-soft)] p-4">
              <p className="text-sm font-bold text-[#9f2f18]">Status</p>
              <p className="mt-2 font-black">
                {formatServiceRequestStatus(request.status)}
              </p>
            </div>

            <div className="rounded-lg bg-[var(--brand-surface-soft)] p-4">
              <p className="text-sm font-bold text-[#9f2f18]">Approval</p>
              <p className="mt-2 font-black">
                {formatApprovalStatus(request.approvalStatus)}
              </p>
            </div>

            <div className="rounded-lg bg-[var(--brand-surface-soft)] p-4">
              <p className="text-sm font-bold text-[#9f2f18]">Guests</p>
              <p className="mt-2 font-black">
                {request.guestCount ?? "Not provided"}
              </p>
            </div>
          </div>

          {request.approvalNote && (
            <div className="mt-6 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-soft)] p-4 text-sm">
              <p className="font-black">Approval Note</p>
              <p className="mt-2 whitespace-pre-wrap text-[#6b5a50]">
                {request.approvalNote}
              </p>
            </div>
          )}

          <section className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-black">Event Details</h2>

              <div className="mt-4 space-y-2 text-sm text-[#6b5a50]">
                <p>
                  <strong>Date:</strong>{" "}
                  {request.eventDate
                    ? request.eventDate.toLocaleString()
                    : "Not provided"}
                </p>

                <p>
                  <strong>Location:</strong>{" "}
                  {request.location ?? "Not provided"}
                </p>

                <p>
                  <strong>Submitted:</strong>{" "}
                  {request.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black">Quote / Deposit</h2>

              <div className="mt-4 space-y-2 text-sm text-[#6b5a50]">
                <p>
                  <strong>Estimated Total:</strong>{" "}
                  {formatOptionalCurrency(estimatedTotal)}
                </p>

                <p>
                  <strong>Deposit:</strong>{" "}
                  {formatOptionalCurrency(depositAmount)}
                </p>

                {depositAmount !== null &&
                  depositAmount > 0 &&
                  !request.depositPaidAt && (
                    <div className="mt-4 rounded-lg border border-[#d99426] bg-[#fff3cf] p-4 text-sm text-[#6f1f12]">
                      <p className="font-black">Deposit Pending</p>

                      <p className="mt-2">
                        A deposit of ${depositAmount.toFixed(2)} is due before
                        this {requestTypeLabel.toLowerCase()} request can be
                        finalized.
                      </p>

                      <p className="mt-2 text-xs">
                        Online deposit payments are coming soon. The business
                        will provide deposit payment instructions after quote
                        review.
                      </p>
                    </div>
                  )}

                {depositAmount === 0 && !request.depositPaidAt && (
                  <div className="mt-4 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-soft)] p-4 text-sm text-[#6b5a50]">
                    <p className="font-black">No Deposit Due</p>

                    <p className="mt-2">
                      No deposit is due for this service request.
                    </p>
                  </div>
                )}

                {request.depositPaidAt && (
                  <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">
                    <p className="font-black">Deposit Paid</p>

                    <p className="mt-2">
                      Deposit received on{" "}
                      {request.depositPaidAt.toLocaleString()}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mt-8 space-y-5">
            <div>
              <h2 className="text-xl font-black">Requested Menu</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#6b5a50]">
                {request.requestedMenu ?? "None provided."}
              </p>
            </div>

            <div>
              <h2 className="text-xl font-black">Allergy Notes</h2>
              {request.allergyNotes ? (
                <div className="mt-2 rounded-lg border-2 border-red-500 bg-red-50 p-4 text-sm text-red-900">
                  {request.allergyNotes}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#6b5a50]">None provided.</p>
              )}
            </div>

            <div>
              <h2 className="text-xl font-black">Special Requests</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#6b5a50]">
                {request.specialRequests ?? "None provided."}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
