import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Chef Rah's Twisted Kitchen",
  description:
    "Meet Chef Rah, the creative force behind Chef Rah's Twisted Kitchen, and learn about her more than 20 years of culinary experience, South Florida roots, Atlanta career, and growing focus on food and wellness.",
};

const experienceHighlights = [
  "Hotels",
  "Restaurants",
  "Private schools",
  "Senior living",
  "Pastry",
  "Private dining",
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
            I&apos;m Chef Robin—pronounced Rah-bin, though most people know me
            as Chef Rah. I bring more than 20 years of culinary experience,
            creativity, and care to every service offered through Chef
            Rah&apos;s Twisted Kitchen.
          </p>

        </div>
      </section>

      <section className="brand-container py-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="brand-card overflow-hidden">
            <div className="relative aspect-[4/5]">
              <Image
                src="/Placeholder.webp"
                alt="Black-and-white illustration of culinary professionals walking in a line"
                fill
                sizes="(max-width: 1024px) 80vw, 22vw"
                className="object-cover"
              />
            </div>
          </div>

          <div>
            <p className="brand-eyebrow">My Story</p>

            <h2 className="mt-3 text-4xl font-black leading-tight">
              From South Florida roots to Atlanta kitchens.
            </h2>

            <div className="mt-6 space-y-5 text-base leading-8 text-[#6b5a50]">
              <p>
                My love for cooking began when I was nine years old, watching
                and helping my mother in the kitchen. Originally from South
                Florida, I later built my professional culinary career in the
                Atlanta area.
              </p>

              <p>
                That career began in 2005 while I was working at one of the
                busiest hotels in Atlanta and attending Le Cordon Bleu. I
                graduated in 2007 and have spent more than 20 years continuing
                to learn, lead, and develop my own creative style.
              </p>

              <p>
                I&apos;m the chef and creative force behind Chef Rah&apos;s
                Twisted Kitchen LLC, a Georgia-based culinary business offering
                weekly meal plans, catering, and personalized chef experiences.
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
                Professional experience, personal care.
              </h2>

              <p className="mt-5 leading-8 text-[#6b5a50]">
                Throughout my career, I have worked in hotels, restaurants,
                private schools, senior living, high-volume food service,
                pastry, catering, and private dining. My background also
                includes kitchen leadership, menu development, food safety,
                staff training, and customized meal preparation. Those
                experiences taught me that memorable food requires more than
                great flavor. It also takes consistency, quality, presentation,
                preparation, and an understanding of the people you are serving.
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
              I created Chef Rah&apos;s Twisted Kitchen from my love of taking
              familiar flavors and giving them an unexpected twist. Whether
              I&apos;m preparing weekly meal plans, catering a special
              celebration, or creating a personal dining experience, I want
              every menu to feel thoughtful, flavorful, and made with genuine
              care.
            </p>

            <p>
              Chef Rah&apos;s Twisted Kitchen is personal to me. There is real
              care behind every menu, every meal, and every experience.
            </p>
          </div>
        </div>

      </section>

      <section className="border-y border-[#ead8c1] bg-white/70">
        <div className="brand-container py-16">
          <div className="max-w-3xl">
            <p className="brand-eyebrow">
              Food, Wellness, and What Comes Next
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight">
              Flavor with purpose.
            </h2>
            <p className="mt-6 text-base leading-8 text-[#6b5a50]">
              As I continue my education in Health Science, with the long-term
              goal of becoming an occupational therapist, I&apos;m also
              deepening my interest in nutrition, wellness, and healthy living.
              I&apos;m excited to explore how food, movement, and everyday
              routines can work together to support overall well-being—and to
              create flavorful options that help my clients pursue their goals
              without taking the enjoyment out of eating.
            </p>
          </div>

          <blockquote className="mt-10 max-w-3xl border-l-4 border-[#d99426] bg-[#fff8ee] px-6 py-5 text-[#24130f]">
            <p className="font-script text-3xl leading-snug">
              Welcome to my kitchen. I&apos;m glad you&apos;re here.
            </p>
            <footer className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-[#9f2f18]">
              <span aria-hidden="true">— </span>Chef Rah
            </footer>
          </blockquote>
        </div>
      </section>

      <section className="bg-[#24130e] text-white">
        <div className="brand-container grid gap-8 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#f4c46f]">
              Ready to taste the twist?
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight">
              Bring the Twisted Kitchen experience to your table.
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-[#f3dcc4]">
              Explore weekly meal plans, plan a catering event, or request a
              personalized chef experience.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
            <Link
              href="/menu"
              className="brand-button-primary bg-white px-6 py-3 text-sm text-[#24130f] hover:bg-[#f4c46f]"
            >
              View Meal Plans
            </Link>

            <Link
              href="/catering"
              className="brand-button-secondary border-white/20 bg-white/10 px-6 py-3 text-sm text-white hover:bg-white hover:text-[#24130f]"
            >
              Plan a Catering Event
            </Link>

            <Link
              href="/personal-chef"
              className="brand-button-secondary border-white/20 bg-white/10 px-6 py-3 text-sm text-white hover:bg-white hover:text-[#24130f]"
            >
              Request Personal Chef Service
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
