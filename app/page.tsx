import Image from "next/image";
import Link from "next/link";

const serviceCards = [
  {
    title: "Weekly Meal Plans",
    href: "/menu",
    cta: "View Meal Plans",
    image: "/MEAL-PLAN.png",
    alt: "Prepared meal plan containers",
    description:
      "Fixed weekly offerings with simple choices for spice level and allowed protein substitutions.",
  },
  {
    title: "Catering",
    href: "/catering",
    cta: "Request Catering",
    image: "/CATERING.jpg",
    alt: "Prepared catering containers",
    description:
      "Event meals, trays, office lunches, and custom food service requests reviewed by the business.",
  },
  {
    title: "Personal Chef",
    href: "/personal-chef",
    cta: "Request Personal Chef Service",
    image: "/PERSONAL-CHEF.jpg",
    alt: "Private chef plated meal",
    description:
      "Private dining, special occasions, recurring support, and personalized chef service inquiries.",
  },
];

export default function HomePage() {
  return (
    <main className="brand-page">
      <section className="relative isolate flex min-h-[72vh] items-end overflow-hidden">
        <Image
          src="/homepage-splash-3.png"
          alt="Chef-prepared meal from Chef Rah's Twisted Kitchen"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#24130f]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#24130f] via-[#24130f]/5 to-transparent" />

        <div className="brand-container relative z-10 pb-14 pt-28 text-white">
          <p className="text-sm font-bold uppercase text-[#f4c46f]">
            Meal Plans / Catering / Personal Chef
          </p>

          <h1 className="mt-4 max-w-4xl font-script text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
            Chef Rah&apos;s Twisted Kitchen
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#fff1df]">
            Bold, chef-prepared comfort food for busy weeks, special events, and
            private dining. Start with a weekly meal plan, request catering, or
            plan a personal chef experience.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="brand-button-primary px-6 py-3 text-sm"
            >
              Start an Order
            </Link>
            <Link
              href="/catering"
              className="brand-button-secondary px-6 py-3 text-sm"
            >
              Request Catering
            </Link>
          </div>

          <div className="mt-10 grid max-w-3xl gap-3 text-sm text-[#f7dfc3] sm:grid-cols-3">
            <div className="border-l border-[#f4c46f] pl-4">
              <p className="font-bold text-white">Weekly ordering</p>
              <p className="mt-1">Meal plans built for real schedules.</p>
            </div>
            <div className="border-l border-[#f4c46f] pl-4">
              <p className="font-bold text-white">Service requests</p>
              <p className="mt-1">Catering and chef services by quote.</p>
            </div>
            <div className="border-l border-[#f4c46f] pl-4">
              <p className="font-bold text-white">Allergen aware</p>
              <p className="mt-1">Warnings surface before checkout.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="brand-container py-14">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="brand-eyebrow">Choose Your Path</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight">
              Order weekly meals or start a service request.
            </h2>
          </div>

          <Link
            href="/gallery"
            className="brand-button-secondary px-5 py-3 text-sm"
          >
            View Food Gallery
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {serviceCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="brand-card group overflow-hidden transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              </div>

              <div className="p-5">
                <h3 className="text-2xl font-black">{card.title}</h3>
                <p className="mt-3 min-h-20 text-sm leading-6 text-[#6b5a50]">
                  {card.description}
                </p>
                <span className="mt-5 inline-flex text-sm font-bold text-[#9f2f18]">
                  {card.cta}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[#ead8c1] bg-white/70">
        <div className="brand-container grid gap-8 py-14 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <p className="brand-eyebrow">Ordering Notes</p>
            <h2 className="mt-3 text-3xl font-black">
              Clear steps from menu selection to confirmation.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-[#6b5a50]">
              Meal plan orders may be subject to scheduling cutoffs,
              availability, approval, allergen acknowledgement, and late-order
              fees. Pickup, delivery, request details, and payment instructions
              are confirmed during checkout or follow-up.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/menu"
              className="brand-card-soft p-5 transition hover:-translate-y-1 hover:bg-white"
            >
              <p className="text-sm font-bold text-[#9f2f18]">1</p>
              <p className="mt-2 font-bold">Pick a meal path</p>
              <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
                Choose weekly plans or a la carte items.
              </p>
            </Link>
            <Link
              href="/checkout"
              className="brand-card-soft p-5 transition hover:-translate-y-1 hover:bg-white"
            >
              <p className="text-sm font-bold text-[#9f2f18]">2</p>
              <p className="mt-2 font-bold">Review checkout</p>
              <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
                Confirm delivery, schedule, preferences, and payment.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
