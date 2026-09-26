import Link from "next/link";

type PageProps = {
  searchParams: Promise<{
    order?: string;
  }>;
};

export default async function CheckoutThankYouPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const orderId = params.order?.trim();

  return (
    <main className="brand-page px-4 py-12 text-[#24130f] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-lg border border-[var(--brand-border)] bg-white/95 p-6 shadow-[0_18px_45px_rgba(76,36,18,0.08)] sm:p-8">
          <p className="brand-eyebrow">Order received</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Thank You For Your Order
          </h1>

          <p className="mt-4 leading-7 text-[#6b5a50]">
            Chef Rah&apos;s Twisted Kitchen has received your order. Please
            check your email for the confirmation and keep it for your records.
          </p>

          {orderId && (
            <div className="mt-6 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface-soft)] p-4">
              <p className="text-sm font-bold text-[#9f2f18]">Order ID</p>
              <p className="mt-2 break-all font-mono text-sm text-[#24130f]">
                {orderId}
              </p>
            </div>
          )}

          <p className="mt-5 text-sm leading-6 text-[#6b5a50]">
            Guest checkout does not create an account or public order detail
            page. If you need help with this order, use the order ID from this
            page or your confirmation email when contacting the business.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/menu" className="brand-button-primary px-5 py-3 text-sm">
              Continue Browsing
            </Link>
            <Link
              href="/login"
              className="brand-button-secondary px-5 py-3 text-sm"
            >
              Sign In
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
