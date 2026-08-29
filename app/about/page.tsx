import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Chef Rah's Twisted Kitchen",
  description:
    "Learn about Chef Robin, also known as Chef Rah, and the story behind Chef Rah's Twisted Kitchen.",
};

const experienceHighlights = [
  "Hotels",
  "Restaurants",
  "Private schools",
  "Senior living",
  "Pastry",
  "Private dining",
];

const services = [
  {
    title: "Meal Plans",
    description:
      "Chef-prepared weekly meals designed to bring bold flavor into busy schedules.",
    href: "/menu",
    cta: "View Meal Plans",
    imageSrc: "/MEAL-PLAN.png",
  },
  {
    title: "Catering",
    description:
      "Food for events, gatherings, office meals, and special occasions with a creative twist.",
    href: "/catering",
    cta: "Request Catering",
    imageSrc: "/CATERING.jpg",
  },
  {
    title: "Private Chef",
    description:
      "Custom dining support for private meals, events, meal plans, and personal food experiences.",
    href: "/personal-chef",
    cta: "Plan an Experience",
    imageSrc: "/PERSONAL-CHEF.jpg",
  },
];

export default function AboutPage() {
  return (
    <main className="brand-page">
      <section className="relative isolate overflow-hidden border-b border-[#ead8c1] bg-[#24130f]">
        <Image
          src="/kitchen-view.png"
          alt="Chef-prepared food from Chef Rah's Twisted Kitchen"
          fill
          sizes="100vw"
          className="object-cover opacity-45"
          priority
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#24130f] via-[#24130f]/20 to-[#24130f]/5" />

        <div className="brand-container relative z-10 py-24 text-white sm:py-28">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#f4c46f]">
            Meet Chef Rah
          </p>

          <h1 className="mt-5 max-w-4xl text-5xl font-script font-black leading-[0.95] sm:text-6xl lg:text-7xl">
            Familiar foods with an unexpected twist.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#fff1df]">
            Chef Robin, also known as Chef Rah, brings more than 15 years of
            culinary experience, creativity, and passion to every service
            offered through Chef Rah&apos;s Twisted Kitchen.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/menu" className="brand-button-primary px-6 py-3 text-sm">
              View Meal Plans
            </Link>

            <Link
              href="/catering"
              className="brand-button-secondary px-6 py-3 text-sm"
            >
              Request Catering
            </Link>
          </div>
        </div>
      </section>

      <section className="brand-container py-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="brand-card overflow-hidden">
            <div className="relative aspect-[4/5]">
              <Image
                src="/Placeholder.webp"
                alt="Chef Rah's Twisted Kitchen food presentation"
                fill
                sizes="(max-width: 1024px) 80vw, 22vw"
                className="object-cover"
              />
            </div>
          </div>

          <div>
            <p className="brand-eyebrow">Her Story</p>

            <h2 className="mt-3 text-4xl font-black leading-tight">
              From South Florida roots to Atlanta kitchens.
            </h2>

            <div className="mt-6 space-y-5 text-base leading-8 text-[#6b5a50]">
              <p>
                Chef Robin, pronounced Rah-bin, is a South Florida native who
                has been living in the Atlanta area for the last 15 years. She
                began her culinary career in 2005 while working at one of the
                busiest hotels in Atlanta and attending Le Cordon Bleu, where
                she later graduated in 2007.
              </p>

              <p>
                Throughout her 15+ year career, Chef Rah has worked in a wide
                range of culinary settings, including hotels, restaurants,
                private schools, senior living facilities, and more.
              </p>

              <p>
                She began cooking at the age of 9 while watching and helping her
                mother in the kitchen. As a naturally creative person, that
                creativity spills over into her passion for food.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#ead8c1] bg-white/70">
        <div className="brand-container py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <p className="brand-eyebrow">Experience</p>

              <h2 className="mt-3 text-4xl font-black leading-tight">
                A well-rounded chef with a creative palate.
              </h2>

              <p className="mt-5 leading-8 text-[#6b5a50]">
                Chef Rah has a diverse knowledge of different cuisines, helping
                her expand the flavors and ideas behind the food she creates. In
                addition to being a well-rounded chef, she is also a skilled
                pastry chef.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {experienceHighlights.map((item) => (
                <div
                  key={item}
                  className="brand-card-soft rounded-2xl border border-[#ead8c1] p-4"
                >
                  <p className="font-bold text-[#24130f]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="brand-container py-16">
        <div className="max-w-3xl">
          <p className="brand-eyebrow">The Twisted Kitchen</p>

          <h2 className="mt-3 text-4xl font-black leading-tight">
            The twist is the experience.
          </h2>

          <div className="mt-6 space-y-5 text-base leading-8 text-[#6b5a50]">
            <p>
              The idea behind Chef Rah&apos;s Twisted Kitchen was born from her
              creative talent for giving familiar foods an unexpected twist that
              leaves you wanting more.
            </p>

            <p>
              You can taste the passion and love in each bite. Her mission is to
              provide the best experience with every service while opening your
              mind and expanding your palate to something different.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="brand-card group p-6 transition hover:-translate-y-1 hover:shadow-2xl"

            >
                <div className="relative aspect-square mb-5 overflow-hidden rounded-3xl">
                <Image
                  src={service.imageSrc}
                  alt={service.title}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </div>
              {/* <h3 className="text-2xl font-black">{service.title}</h3> */}

              <p className="mt-1 min-h-24 text-sm leading-6 text-[#6b5a50]">
                {service.description}
              </p>

              <span className="mt-1 inline-flex text-sm font-bold text-[#9f2f18] transition group-hover:text-[#6f1f12]">
                {service.cta}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[#24130e] text-white">
        <div className="brand-container grid gap-8 py-16 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#f4c46f]">
              Ready to taste the twist?
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight">
              Start with meal plans, catering, or a private chef request.
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-[#f3dcc4]">
              Chef Rah&apos;s Twisted Kitchen offers meal plans, catering,
              private chef service, food consultation, and more.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="/menu"
              className="brand-button-primary bg-white px-6 py-3 text-sm text-[#bfebf4] hover:bg-[#f4c46f]"
            >
              Start an Order
            </Link>

            <Link
              href="/personal-chef"
              className="brand-button-secondary border-white/20 bg-white/10 px-6 py-3 text-sm text-white hover:bg-white hover:text-[#bfebf4]"
            >
              Plan Private Chef Service
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}