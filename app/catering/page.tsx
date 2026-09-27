import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getServiceRequestErrorMessage } from "@/lib/service-request-form-errors";
import { ServiceRequestDateTimeFields } from "@/components/service-requests/ServiceRequestDateTimeFields";

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const inputClass =
  "mt-2 w-full rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#9c897d] focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40";
const labelClass = "block text-sm font-bold text-[#24130f]";

export default async function CateringPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;
  const errorMessage = getServiceRequestErrorMessage(params.error);

  const user = session?.user?.email
    ? await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
        select: {
          name: true,
          email: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          deliveryNotes: true,
        },
      })
    : null;

  const defaultLocation = user?.addressLine1
    ? `${user.addressLine1}${user.addressLine2 ? `, ${user.addressLine2}` : ""}, ${[
        user.city,
        user.state,
        user.postalCode,
      ]
        .filter(Boolean)
        .join(", ")}`
    : "";

  return (
    <main className="brand-page">
      <section className="relative isolate overflow-hidden bg-[#24130f]">
        <Image
          src="/catering-splash.avif"
          alt="Chef Rah's Twisted Kitchen catering"
          fill
          sizes="100vw"
          className="object-cover opacity-55"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#24130f] via-[#24130f]/30 to-[#24130f]/10" />

        <div className="brand-container relative z-10 py-16 text-white">
          <p className="text-sm font-bold uppercase text-[#f4c46f]">Catering</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-great-vibes font-black leading-tight">
            Request catering for your next event.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#fff1df]">
            Share event details and Chef Rah&apos;s Twisted Kitchen will review
            your request. Catering may require a 50% deposit after quote
            approval.
          </p>
        </div>
      </section>

      <section className="brand-container py-12">
        <form
          action="/api/catering"
          method="POST"
          className="brand-card mx-auto max-w-3xl p-6 sm:p-8"
        >
          <div>
            <p className="brand-eyebrow">Tell Us About The Event</p>
            <h2 className="mt-2 text-3xl font-black">Catering Request</h2>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-900"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>
              Name
              <input
                name="name"
                defaultValue={user?.name ?? session?.user?.name ?? ""}
                placeholder="Name"
                className={inputClass}
                required
              />
            </label>

            <label className={labelClass}>
              Email
              <input
                name="email"
                type="email"
                defaultValue={user?.email ?? session?.user?.email ?? ""}
                placeholder="Email"
                className={inputClass}
                required
              />
            </label>

            <label className={labelClass}>
              Phone
              <input
                name="phone"
                placeholder="Phone"
                defaultValue={user?.phone ?? ""}
                className={inputClass}
              />
            </label>

            <ServiceRequestDateTimeFields
              dateLabel="Event Date"
              helpId="catering-event-date-help"
              helpText="Choose the event date and time if you already know it."
              inputClassName={inputClass}
              labelClassName={labelClass}
            />

            <label className={labelClass}>
              Event Type
              <input
                name="eventType"
                placeholder="Wedding, party, corporate lunch"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Guest Count
              <input
                name="guestCount"
                type="number"
                min="1"
                aria-describedby="catering-guest-count-help"
                placeholder="Guest count"
                className={inputClass}
              />
              <span
                id="catering-guest-count-help"
                className="mt-2 block text-xs font-medium text-[#6b5a50]"
              >
                Estimates are okay for the first request.
              </span>
            </label>

            <label className={`${labelClass} md:col-span-2`}>
              Event Location
              <input
                name="location"
                aria-describedby="catering-location-help"
                placeholder="Venue, address, or service location"
                defaultValue={defaultLocation}
                className={inputClass}
              />
              <span
                id="catering-location-help"
                className="mt-2 block text-xs font-medium text-[#6b5a50]"
              >
                Add the event address, venue, or delivery/service location.
              </span>
            </label>

            <label className={`${labelClass} md:col-span-2`}>
              Requested Menu
              <textarea
                name="requestedMenu"
                rows={4}
                aria-describedby="catering-requested-menu-help"
                placeholder="Requested menu or meal ideas"
                className={inputClass}
              />
              <span
                id="catering-requested-menu-help"
                className="mt-2 block text-xs font-medium text-[#6b5a50]"
              >
                Share dishes, service style, or menu ideas you have in mind.
              </span>
            </label>

            <label className={`${labelClass} md:col-span-2`}>
              Allergies or Dietary Restrictions
              <textarea
                name="allergyNotes"
                rows={3}
                placeholder="Allergies or dietary restrictions"
                className={inputClass}
              />
            </label>

            <label className={`${labelClass} md:col-span-2`}>
              Special Requests
              <textarea
                name="specialRequests"
                rows={4}
                placeholder="Setup needs, timing, delivery notes, etc."
                className={inputClass}
              />
            </label>
          </div>

          <button className="brand-button-primary mt-8 w-full px-5 py-3">
            Submit Catering Request
          </button>
        </form>
      </section>
    </main>
  );
}
