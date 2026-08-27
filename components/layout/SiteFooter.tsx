import { getBusinessSettings } from "@/lib/business-settings";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatCutoff(day: number, hour: number, minute: number) {
  const dayName = dayNames[day] ?? "the configured cutoff day";
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, "0");
  const period = hour >= 12 ? "PM" : "AM";

  return `${dayName} at ${displayHour}:${displayMinute} ${period}`;
}

export async function SiteFooter() {
  const settings = await getBusinessSettings();
  const cutoff = formatCutoff(
    settings.orderCutoffDay,
    settings.orderCutoffHour,
    settings.orderCutoffMinute,
  );

  return (
    <footer className="border-t border-[#ead8c1] bg-[#24130f] text-[#fff8ee]">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 text-sm md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-lg font-bold">Chef Rah&apos;s Twisted Kitchen</p>

          <p className="mt-3 max-w-md leading-6 text-[#f3dcc4]">
            Chef-prepared weekly meals, catering, and personal chef service with
            bold flavor and practical ordering support.
          </p>
        </div>

        <div>
          <p className="font-semibold text-white">Order Notes</p>
          <div className="mt-3 space-y-2 leading-6 text-[#f3dcc4]">
            <p>Orders are due by {cutoff}.</p>
            <p>
              {settings.lateFee > 0
                ? `Orders after the cutoff may include a ${formatCurrency(settings.lateFee)} late fee.`
                : "Late fees are currently not being charged."}
            </p>
            <p>
              {settings.deliveryFee > 0
                ? `Delivery fee: ${formatCurrency(settings.deliveryFee)}.`
                : "Delivery fees are currently not being charged."}
            </p>
            {settings.noWeekendOrdering && (
              <p>Weekend ordering is currently unavailable.</p>
            )}
            <p className="text-xs">
              Final applicable fees are calculated during checkout.
            </p>
          </div>
        </div>

        <div>
          <p className="font-semibold text-white">Connect</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href="#" className="transition hover:text-[#f4c46f]">
              Instagram
            </a>
            <a href="#" className="transition hover:text-[#f4c46f]">
              Facebook
            </a>
            <a href="#" className="transition hover:text-[#f4c46f]">
              TikTok
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
