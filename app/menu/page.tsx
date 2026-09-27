import { prisma } from "@/lib/prisma";
import { MenuCard } from "@/components/menu/MenuCard";
import { MenuCategoryFilter } from "@/components/menu/MenuCategoryFilter";
import { WeeklyMenuSection } from "@/components/menu/WeeklyMenuSection";
import { getBusinessSettings } from "@/lib/business-settings";
import Image from "next/image";
import Link from "next/link";
import {
  formatWeeklyMenuDisplayDate,
  getWeeklyMenuQueryDateRange,
  weeklyMenuTimeZone,
} from "@/lib/weekly-menu-dates";
import { normalizeWeeklyMealSlotLabels } from "@/lib/weekly-package-labels";
import {
  formatWeeklyScheduleSummary,
  getWeeklyOrderingWindowState,
  resolveWeeklyPeriodSchedule,
} from "@/lib/weekly-ordering-window";
import type { DecimalLike } from "@/types/display";
import type { PublicWeeklyMenu } from "@/types/weekly-menu";

export const dynamic = "force-dynamic";

type PublicMenuCategory = {
  id: string;
  name: string;
  items: {
    id: string;
    name: string;
    type: string;
    description: string;
    price: DecimalLike;
    imageUrl: string | null;
    available: boolean;
    seasonal: boolean;
    requiresApproval: boolean;
    customerInstructionsEnabled: boolean;
    allergens: {
      allergen: {
        id: string;
        name: string;
      };
    }[];
    optionGroups: {
      id: string;
      name: string;
      required: boolean;
      multiple: boolean;
      choices: {
        id: string;
        name: string;
        description: string | null;
        dietaryInfo: string | null;
        imageUrl: string | null;
        requestOnly: boolean;
        priceDelta: DecimalLike;
      }[];
    }[];
  }[];
};

function formatMenuDate(date: Date) {
  return formatWeeklyMenuDisplayDate(date);
}

function toCategoryId(category: string) {
  return category.toLowerCase().replace(/\s+/g, "-");
}

function toPublicWeeklyMenu(weeklyMenu: {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  orderCutoffAt: Date | null;
  orderingOpenAt: Date | null;
  lateFeeStartsAt: Date | null;
  orderingClosesAt: Date | null;
  fixedFulfillmentAt: Date | null;
  customerSchedulingEnabled: boolean | null;
  deliveryWindowLabel: string | null;
  capacity: number;
  ordersPlaced: number;
  packages: {
    id: string;
    name: string;
    days: number;
    mealsPerDay: number;
    price: DecimalLike;
    requiresChefApproval: boolean;
    isSeasonal: boolean;
    mealSlotLabels: unknown;
    notes: string | null;
  }[];
  offerings: {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    dietaryInfo: string | null;
    breakfastOnly: boolean;
    allergens: {
      allergen: {
        id: string;
        name: string;
      };
    }[];
    options: {
      id: string;
      optionType: string;
      name: string;
      description: string | null;
      dietaryInfo: string | null;
      priceDelta: DecimalLike;
      requestOnly: boolean;
      requiresApproval: boolean;
    }[];
  }[];
}, settings: Awaited<ReturnType<typeof getBusinessSettings>>): PublicWeeklyMenu {
  const schedule = resolveWeeklyPeriodSchedule({
    period: weeklyMenu,
    settings,
    timeZone: weeklyMenuTimeZone,
  });
  const scheduleSummary = formatWeeklyScheduleSummary(
    schedule,
    weeklyMenuTimeZone,
  );
  const orderingWindowState = getWeeklyOrderingWindowState({
    schedule,
    lateFee: settings.lateFee,
  });

  return {
    id: weeklyMenu.id,
    label: weeklyMenu.label,
    dateRange: `${formatMenuDate(weeklyMenu.startDate)} - ${formatMenuDate(
      weeklyMenu.endDate,
    )}`,
    orderCutoffLabel: scheduleSummary.orderingClosesLabel,
    orderingOpenAt: schedule.orderingOpenAt.toISOString(),
    lateFeeStartsAt: schedule.lateFeeStartsAt.toISOString(),
    orderingClosesAt: schedule.orderingClosesAt.toISOString(),
    orderingOpenLabel: scheduleSummary.orderingOpenLabel,
    lateFeeStartsLabel: scheduleSummary.lateFeeStartsLabel,
    orderingClosesLabel: scheduleSummary.orderingClosesLabel,
    fixedFulfillmentAt: schedule.fixedFulfillmentAt.toISOString(),
    fixedFulfillmentLabel: scheduleSummary.fixedFulfillmentLabel,
    deliveryWindowLabel: scheduleSummary.deliveryWindowLabel,
    customerSchedulingEnabled: schedule.customerSchedulingEnabled,
    orderingStatus: orderingWindowState.state,
    orderingClosed: orderingWindowState.state === "closed",
    capacity: weeklyMenu.capacity,
    ordersPlaced: weeklyMenu.ordersPlaced,
    packages: weeklyMenu.packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      days: pkg.days,
      mealsPerDay: pkg.mealsPerDay,
      price: Number(pkg.price),
      requiresChefApproval: pkg.requiresChefApproval,
      isSeasonal: pkg.isSeasonal,
      mealSlotLabels: normalizeWeeklyMealSlotLabels(
        pkg.mealSlotLabels,
        pkg.mealsPerDay,
      ),
      notes: pkg.notes,
    })),
    offerings: weeklyMenu.offerings.map((offering) => ({
      id: offering.id,
      name: offering.name,
      description: offering.description,
      imageUrl: offering.imageUrl,
      dietaryInfo: offering.dietaryInfo,
      breakfastOnly: offering.breakfastOnly,
      allergens: offering.allergens.map((entry) => ({
        id: entry.allergen.id,
        name: entry.allergen.name,
      })),
      options: offering.options.map((option) => ({
        id: option.id,
        optionType: option.optionType,
        name: option.name,
        description: option.description,
        dietaryInfo: option.dietaryInfo,
        priceDelta: Number(option.priceDelta),
        requestOnly: option.requestOnly,
        requiresApproval: option.requiresApproval,
      })),
    })),
  };
}

export default async function MenuPage() {
  const today = new Date();
  const { dayStart } = getWeeklyMenuQueryDateRange(today);

  const [categories, weeklyMenu, settings] = await Promise.all([
    prisma.menuCategory.findMany({
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        items: {
          where: {
            archived: false,
            NOT: [{ type: "CATERING" }, { type: "MEAL_PLAN" }],
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            allergens: {
              include: {
                allergen: true,
              },
            },
            optionGroups: {
              include: {
                choices: true,
              },
            },
          },
        },
      },
    }) as Promise<PublicMenuCategory[]>,
    prisma.weeklyMenuPeriod.findFirst({
      where: {
        status: "PUBLISHED",
        endDate: {
          gte: dayStart,
        },
      },
      orderBy: {
        startDate: "asc",
      },
      include: {
        packages: {
          where: {
            available: true,
          },
          orderBy: [
            {
              displayOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        },
        offerings: {
          where: {
            available: true,
          },
          orderBy: [
            {
              displayOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
          include: {
            allergens: {
              include: {
                allergen: true,
              },
            },
            options: {
              where: {
                available: true,
              },
              orderBy: [
                {
                  optionType: "asc",
                },
                {
                  displayOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
            },
          },
        },
      },
    }),
    getBusinessSettings(),
  ]);

  const visibleCategories = categories.filter(
    (category) => category.items.length > 0,
  );
  const publicWeeklyMenu = weeklyMenu
    ? toPublicWeeklyMenu(weeklyMenu, settings)
    : null;
  const filterCategories = [
    ...(publicWeeklyMenu ? ["Weekly Meal Plans"] : []),
    ...visibleCategories.map((category) => category.name),
  ];

  return (
    <main className="brand-page">
      <section className="relative isolate overflow-hidden bg-[#24130f]">
        <Image
          src="/menu-splash.avif"
          alt="Chef-prepared weekly meal plan"
          fill
          sizes="100vw"
          className="object-cover opacity-55"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#24130f] via-[#24130f]/40 to-[#24130f]/30" />

        <div className="brand-container relative z-10 py-16 text-white md:py-20">
          <p className="text-sm font-bold uppercase text-[#f4c46f]">
            Meal Plans & A La Carte
          </p>

          <h1 className="mt-3 max-w-4xl text-5xl font-optima-inspired font-bold font-black leading-tight md:text-6xl">
            Weekly meals and chef-prepared favorites.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#fff1df]">
            Choose a weekly meal package, pick the meal offering you want for
            that week, or add chef-prepared favorites to your order.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#weekly-meal-plans"
              className="brand-button-primary px-6 py-3 text-sm"
            >
              View Meal Plans
            </Link>
            <Link
              href="#a-la-carte"
              className="brand-button-secondary px-6 py-3 text-sm"
            >
              Browse A La Carte
            </Link>
          </div>
        </div>
      </section>

      <div className="brand-container py-12">
        <div className="brand-card-soft p-5 text-[#6f1f12]">
          <h2 className="text-xl font-optima-inspired font-bold">How Weekly Meal Plans Work</h2>

          <p className="mt-2 text-sm leading-6">
            Pick a package for the number of days and meals, then choose one of
            this week&apos;s meal offerings. Each offering shows the actual meal
            style, allergens, spice choices, and allowed protein substitutions.
          </p>
        </div>

        {filterCategories.length > 0 && (
          <MenuCategoryFilter categories={filterCategories} />
        )}

        <div className="space-y-12">
          {publicWeeklyMenu && (
            <WeeklyMenuSection weeklyMenu={publicWeeklyMenu} />
          )}

          {visibleCategories.map((category) => (
            <section key={category.id} id={toCategoryId(category.name)}>
              <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                <div>
                  <p className="brand-eyebrow">Chef-Prepared</p>
                  <h2 className="mt-2 text-3xl font-optima-inspired font-bold">{category.name}</h2>
                </div>

                <p className="text-sm font-medium text-[#6b5a50]">
                  {category.items.length} offering
                  {category.items.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {category.items.map((item) => {
                  return (
                    <MenuCard
                      key={item.id}
                      item={{
                        id: item.id,
                        name: item.name,
                        type: item.type,
                        description: item.description,
                        price: Number(item.price),
                        category: category.name,
                        imageUrl: item.imageUrl ?? undefined,
                        available: item.available,
                        seasonal: item.seasonal,
                        allergens: item.allergens.map((entry) => ({
                          id: entry.allergen.id,
                          name: entry.allergen.name,
                        })),
                        requiresApproval: item.requiresApproval,
                        customerInstructionsEnabled:
                          item.customerInstructionsEnabled,
                        optionGroups: item.optionGroups.map((group) => ({
                          id: group.id,
                          name: group.name,
                          required: group.required,
                          multiple: group.multiple,
                          choices: group.choices.map((choice) => ({
                            id: choice.id,
                            name: choice.name,
                            description: choice.description,
                            dietaryInfo: choice.dietaryInfo,
                            imageUrl: choice.imageUrl,
                            requestOnly: choice.requestOnly,
                            priceDelta: Number(choice.priceDelta),
                          })),
                        })),
                      }}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {visibleCategories.length === 0 && !publicWeeklyMenu && (
            <div className="brand-card p-8 text-center">
              <h2 className="text-2xl font-optima-inspired">Menu coming soon</h2>
              <p className="mt-2 text-[#6b5a50]">
                No meal plan or menu items are available yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
