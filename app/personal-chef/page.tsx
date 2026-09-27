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
const labelClass = "block text-sm font-bold text-[#563027]";

export default async function PersonalChefPage({ searchParams }: PageProps) {
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
      <section className="relative isolate overflow-hidden bg-[#563027]">
        <Image
          src="/personal-chef-splash.png"
          alt="Personal chef plated meal"
          fill
          sizes="50vw"
          className="object-cover opacity-55"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#563027] via-[#563027]/10 to-[#563027]/10" />

        <div className="brand-container relative z-10 py-16 text-white">
          <p className="text-sm font-bold uppercase text-[#f4c46f]">
            Personal Chef 
          </p>
          <h1 className="mt-3 max-w-3xl text-5xl font-great-vibes font-black leading-tight">
            Plan a private chef experience.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#fff1df]">
            Request private meals, events, or custom dining support.
            Chef Rah&apos;s Twisted Kitchen will follow up with availability,
            pricing, and next steps.
          </p>
        </div>
      </section>

      <section className="brand-container py-12">
        <form
          action="/api/personal-chef"
          method="POST"
          className="brand-card mx-auto max-w-3xl p-6 sm:p-8"
        >
          <div>
            <p className="brand-eyebrow">Tell Us What You Need</p>
            <h2 className="mt-2 text-3xl font-black">Personal Chef Request</h2>
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
              dateLabel="Preferred Service Date"
              helpId="personal-chef-event-date-help"
              helpText="Choose the preferred service date and time if you already know it."
              inputClassName={inputClass}
              labelClassName={labelClass}
            />

            <label className={labelClass}>
              Number of Guests / People Served
              <input
                name="guestCount"
                type="number"
                min="1"
                aria-describedby="personal-chef-guest-count-help"
                placeholder="Number of guests / people served"
                className={inputClass}
              />
              <span
                id="personal-chef-guest-count-help"
                className="mt-2 block text-xs font-medium text-[#6b5a50]"
              >
                Estimates are fine for planning the quote.
              </span>
            </label>

            <label className={`${labelClass} md:col-span-2`}>
              Service Location
              <input
                name="location"
                aria-describedby="personal-chef-location-help"
                placeholder="Home, venue, kitchen, or service address"
                defaultValue={defaultLocation}
                className={inputClass}
              />
              <span
                id="personal-chef-location-help"
                className="mt-2 block text-xs font-medium text-[#6b5a50]"
              >
                Add the home, venue, kitchen, or service address.
              </span>
            </label>

            <label className={`${labelClass} md:col-span-2`}>
              Requested Menu or Service Style
              <textarea
                name="requestedMenu"
                rows={4}
                aria-describedby="personal-chef-requested-menu-help"
                placeholder="What type of meal, menu, or service are you looking for?"
                className={inputClass}
              />
              <span
                id="personal-chef-requested-menu-help"
                className="mt-2 block text-xs font-medium text-[#6b5a50]"
              >
                Share the meal, service style, kitchen access, or dining
                experience you want.
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
                placeholder="Timing, setup needs, kitchen access, preferences, etc."
                className={inputClass}
              />
            </label>
          </div>

          <button className="brand-button-primary mt-8 w-full px-5 py-3">
            Submit Personal Chef Request
          </button>
        </form>
      </section>
    </main>
  );
}
