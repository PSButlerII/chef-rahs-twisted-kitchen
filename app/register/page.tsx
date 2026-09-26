import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="brand-page px-6 py-12">
      <div className="brand-card mx-auto max-w-2xl p-8">
        <p className="brand-eyebrow">Join The Kitchen</p>
        <h1 className="mt-2 text-3xl font-black">Create Account</h1>

        <form action="/api/register" method="POST" className="mt-8 space-y-5">
          <input
            name="name"
            placeholder="Name"
            className="w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
            required
          />

          <div className="border-t border-[var(--brand-border)] pt-5">
            <h2 className="font-black">Optional delivery information</h2>
            <p className="mt-1 text-sm text-[#6b5a50]">
              You can add this now or update it later from your account page.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="phone"
              placeholder="Phone number optional"
              className="rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
            />

            <input
              name="postalCode"
              placeholder="ZIP / Postal code optional"
              className="rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
            />
          </div>

          <input
            name="addressLine1"
            placeholder="Delivery address optional"
            className="w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />

          <input
            name="addressLine2"
            placeholder="Apartment, suite, unit optional"
            className="w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="city"
              placeholder="City optional"
              className="rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
            />

            <input
              name="state"
              placeholder="State optional"
              className="rounded-lg border border-[var(--brand-border)] px-4 py-3 outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
            />
          </div>

          <button className="brand-button-primary w-full px-5 py-3">
            Create Account
          </button>
        </form>

        <p className="mt-5 text-sm text-[#6b5a50]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#9f2f18]">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
