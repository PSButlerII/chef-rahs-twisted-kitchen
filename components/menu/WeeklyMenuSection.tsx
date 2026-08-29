import Image from "next/image";
import { WeeklyMenuOrderForm } from "@/components/menu/WeeklyMenuOrderForm";
import { formatWeeklyMealPlanOptionType } from "@/lib/format-labels";
import { DEFAULT_WEEKLY_FIXED_MESSAGE } from "@/lib/weekly-ordering-window";
import type { PublicWeeklyMenu, PublicWeeklyOption } from "@/types/weekly-menu";

type Props = {
  weeklyMenu: PublicWeeklyMenu;
};

function groupOptionsByType(options: PublicWeeklyOption[]) {
  return options.reduce<Record<string, PublicWeeklyOption[]>>(
    (groups, option) => {
      groups[option.optionType] = [
        ...(groups[option.optionType] ?? []),
        option,
      ];

      return groups;
    },
    {},
  );
}

export function WeeklyMenuSection({ weeklyMenu }: Props) {
  const orderSlotsRemaining = Math.max(
    weeklyMenu.capacity - weeklyMenu.ordersPlaced,
    0,
  );

  return (
    <section
      id="weekly-meal-plans"
      className="mb-14 rounded-lg border border-[#ead8c1] bg-[#24130f] p-4 text-white shadow-2xl sm:p-6 lg:p-8"
    >
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-[#f4c46f]">
            Weekly Meal Plans
          </p>

          <h2 className="mt-2 text-4xl font-black leading-tight">
            {weeklyMenu.label}
          </h2>

          <p className="mt-2 text-[#f3dcc4]">{weeklyMenu.dateRange}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-[#f4c46f]/50 bg-white/10 px-4 py-2 font-bold text-[#fff8ee]">
            {orderSlotsRemaining} of {weeklyMenu.capacity} weekly order slots
            available
          </span>

          {weeklyMenu.orderCutoffLabel && (
            <span className="rounded-full border border-[#f4c46f]/50 bg-white/10 px-4 py-2 font-bold text-[#fff8ee]">
              Order by {weeklyMenu.orderCutoffLabel}
            </span>
          )}

          {!weeklyMenu.customerSchedulingEnabled &&
            weeklyMenu.fixedFulfillmentLabel && (
              <span className="rounded-full border border-[#f4c46f]/50 bg-white/10 px-4 py-2 font-bold text-[#fff8ee]">
                Fulfillment {weeklyMenu.fixedFulfillmentLabel}
              </span>
            )}
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-[#f4c46f]/35 bg-white/10 p-5">
        <h3 className="text-xl font-black">Choose In This Order</h3>

        {!weeklyMenu.customerSchedulingEnabled && (
          <div className="mt-4 rounded-lg border border-[#f4c46f]/45 bg-[#fff8ee] p-4 text-sm font-semibold leading-6 text-[#24130f]">
            {weeklyMenu.deliveryWindowLabel ??
              DEFAULT_WEEKLY_FIXED_MESSAGE}{" "}
            Ordering opens {weeklyMenu.orderingOpenLabel} and closes{" "}
            {weeklyMenu.orderingClosesLabel}. Late fees begin{" "}
            {weeklyMenu.lateFeeStartsLabel}.
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-white/10 p-4">
            <p className="text-sm font-black text-[#f4c46f]">1. Package</p>
            <p className="mt-2 text-sm leading-6 text-[#f3dcc4]">
              Choose how many days and meals per day you want.
            </p>
          </div>

          <div className="rounded-lg bg-white/10 p-4">
            <p className="text-sm font-black text-[#f4c46f]">2. Meal Slots</p>
            <p className="mt-2 text-sm leading-6 text-[#f3dcc4]">
              Fill each day and meal slot from this week&apos;s offerings.
            </p>
          </div>

          <div className="rounded-lg bg-white/10 p-4">
            <p className="text-sm font-black text-[#f4c46f]">3. Review</p>
            <p className="mt-2 text-sm leading-6 text-[#f3dcc4]">
              Review your selected meals before adding the plan to cart.
            </p>
          </div>
        </div>
      </div>

      {weeklyMenu.packages.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-xl font-black">Packages</h3>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {weeklyMenu.packages.map((pkg) => (
              <article
                key={pkg.id}
                className="rounded-lg border border-white/15 bg-white/10 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-black">{pkg.name}</h4>

                      {pkg.requiresChefApproval && (
                        <span className="rounded-full bg-[#fff0bd] px-3 py-1 text-xs font-bold text-[#6f1f12]">
                          By request
                        </span>
                      )}

                      {pkg.isSeasonal && (
                        <span className="rounded-full bg-[#f4eadb] px-3 py-1 text-xs font-bold text-[#6f1f12]">
                          Seasonal
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-[#f3dcc4]">
                      {pkg.days} days, {pkg.mealsPerDay} meal
                      {pkg.mealsPerDay === 1 ? "" : "s"} per day
                    </p>

                    <p className="mt-2 text-xs font-semibold text-[#f3dcc4]">
                      {pkg.mealSlotLabels.join(" / ")}
                    </p>
                  </div>

                  <p className="shrink-0 text-xl font-bold">
                    ${pkg.price.toFixed(2)}
                  </p>
                </div>

                {pkg.notes && (
                  <p className="mt-4 text-sm leading-6 text-[#f3dcc4]">
                    {pkg.notes}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="mb-3 text-xl font-black">This Week&apos;s Offerings</h3>

        <div className="grid gap-5 md:grid-cols-2">
          {weeklyMenu.offerings.map((offering) => {
            const groupedOptions = groupOptionsByType(offering.options);

            return (
              <article
                key={offering.id}
                className="rounded-lg border border-white/15 bg-white p-4 text-[#24130f] shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-[#ead8c1] bg-[#f7ead7] sm:h-32 sm:w-32 sm:shrink-0">
                    <Image
                      src={offering.imageUrl || "/placeholder1.png"}
                      alt={offering.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 112px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xl font-black leading-tight">
                        {offering.name}
                      </h4>

                      {offering.dietaryInfo && (
                        <span className="rounded-full bg-[#f4eadb] px-3 py-1 text-xs font-bold text-[#6f1f12]">
                          {offering.dietaryInfo}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
                      {offering.description}
                    </p>
                  </div>
                </div>

                {offering.allergens.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {offering.allergens.map((allergen) => (
                      <span
                        key={allergen.id}
                        className="rounded-full bg-red-50 px-3 py-1 font-bold text-red-800"
                      >
                        {allergen.name}
                      </span>
                    ))}
                  </div>
                )}

                {offering.options.length > 0 && (
                  <div className="mt-5 grid gap-3">
                    {Object.entries(groupedOptions).map(
                      ([optionType, options]) => (
                        <div
                          key={optionType}
                          className="rounded-lg border border-[#ead8c1] bg-[#fff8ee] p-4"
                        >
                          <h5 className="text-sm font-black">
                            {formatWeeklyMealPlanOptionType(optionType)}
                          </h5>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {options.map((option) => (
                              <span
                                key={option.id}
                                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#3b241b]"
                              >
                                {option.name}
                                {option.priceDelta > 0
                                  ? ` +$${option.priceDelta.toFixed(2)}`
                                  : ""}
                                {option.requiresApproval
                                  ? " - approval required"
                                  : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      <WeeklyMenuOrderForm weeklyMenu={weeklyMenu} />
    </section>
  );
}
