import Link from "next/link";
import { AdminPageHelpLink } from "@/components/admin/AdminPageHelpLink";
import { AdminHelpPopover } from "@/components/admin/AdminHelpPopover";
import { DeleteWeeklyMealPlanOfferingButton } from "@/components/admin/DeleteWeeklyMealPlanOfferingButton";
import { DeleteWeeklyMealPlanOptionButton } from "@/components/admin/DeleteWeeklyMealPlanOptionButton";
import {
  WeeklyMealPlanOfferingForm,
  type WeeklyMealPlanOfferingFormData,
} from "@/components/admin/WeeklyMealPlanOfferingForm";
import {
  WeeklyMealPlanOptionForm,
  type WeeklyMealPlanAllowedOptionFormData,
} from "@/components/admin/WeeklyMealPlanOptionForm";
import {
  WeeklyMealPlanPackageForm,
  type WeeklyMealPlanPackageFormData,
} from "@/components/admin/WeeklyMealPlanPackageForm";
import {
  WeeklyMenuPeriodForm,
  type WeeklyMenuPeriodFormData,
} from "@/components/admin/WeeklyMenuPeriodForm";
import {
  WeeklyMenuCloneForm,
  type WeeklyMenuCloneSource,
} from "@/components/admin/WeeklyMenuCloneForm";
import { WeeklyOfferingAllergenEditor } from "@/components/admin/WeeklyOfferingAllergenEditor";
import { requireAdminPage } from "@/lib/auth-guards";
import {
  formatApprovalStatus,
  formatOrderStatus,
  formatWeeklyMealPlanOptionType,
  formatWeeklyMenuStatus,
} from "@/lib/format-labels";
import { prisma } from "@/lib/prisma";
import {
  formatWeeklyMenuDateInput,
  formatWeeklyMenuDisplayDate,
} from "@/lib/weekly-menu-dates";
import { normalizeWeeklyMealSlotLabels } from "@/lib/weekly-package-labels";
import { DEFAULT_WEEKLY_FIXED_MESSAGE } from "@/lib/weekly-ordering-window";
import type { Prisma } from "@prisma/client";

type AdminAllergen = {
  id: string;
  name: string;
};

type FulfillmentCountRow = {
  label: string;
  quantity: number;
  orderCount: number;
};

const weeklyMenuPeriodQuery = {
  orderBy: [
    {
      startDate: "desc",
    },
    {
      createdAt: "desc",
    },
  ],
  include: {
    packages: {
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
    _count: {
      select: {
        orderSelections: true,
      },
    },
    orderSelections: {
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        packageName: true,
        offeringName: true,
        spiceLevel: true,
        proteinSubstitution: true,
        requestOnly: true,
        requiresApproval: true,
        orderItem: {
          select: {
            quantity: true,
            allergenAcknowledged: true,
            allergenConflictSnapshot: true,
            order: {
              select: {
                id: true,
                customerName: true,
                status: true,
                approvalStatus: true,
                requestedDateTime: true,
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.WeeklyMenuPeriodFindManyArgs;

type AdminWeeklyMenuPeriod = Prisma.WeeklyMenuPeriodGetPayload<
  typeof weeklyMenuPeriodQuery
>;

type AdminWeeklyMenuPackage = AdminWeeklyMenuPeriod["packages"][number];
type AdminWeeklyMenuOffering = AdminWeeklyMenuPeriod["offerings"][number];
type AdminWeeklyMenuOption = AdminWeeklyMenuOffering["options"][number];
type WeeklyFulfillmentSelection =
  AdminWeeklyMenuPeriod["orderSelections"][number];

function formatDateInput(date: Date) {
  return formatWeeklyMenuDateInput(date);
}

function formatDateTimeInput(date: Date | null) {
  if (!date) {
    return null;
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

function formatDisplayDate(date: Date) {
  return formatWeeklyMenuDisplayDate(date);
}

function formatDisplayDateTime(date: Date | null) {
  if (!date) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function toPeriodFormData(
  period: AdminWeeklyMenuPeriod,
): WeeklyMenuPeriodFormData {
  return {
    id: period.id,
    label: period.label,
    startDate: formatDateInput(period.startDate),
    endDate: formatDateInput(period.endDate),
    orderCutoffAt: formatDateTimeInput(period.orderCutoffAt),
    orderingOpenAt: formatDateTimeInput(period.orderingOpenAt),
    lateFeeStartsAt: formatDateTimeInput(period.lateFeeStartsAt),
    orderingClosesAt: formatDateTimeInput(period.orderingClosesAt),
    fixedFulfillmentAt: formatDateTimeInput(period.fixedFulfillmentAt),
    customerSchedulingEnabled: period.customerSchedulingEnabled,
    deliveryWindowLabel: period.deliveryWindowLabel,
    fulfillmentNotes: period.fulfillmentNotes,
    status: period.status,
    capacity: period.capacity,
  };
}

function toCloneSource(period: AdminWeeklyMenuPeriod): WeeklyMenuCloneSource {
  return {
    id: period.id,
    label: period.label,
    suggestedLabel: `Copy of ${period.label}`,
    suggestedStartDate: formatDateInput(addDays(period.startDate, 7)),
    suggestedEndDate: formatDateInput(addDays(period.endDate, 7)),
    suggestedOrderCutoffAt: formatDateTimeInput(
      period.orderCutoffAt ? addDays(period.orderCutoffAt, 7) : null,
    ),
    suggestedOrderingOpenAt: formatDateTimeInput(
      period.orderingOpenAt ? addDays(period.orderingOpenAt, 7) : null,
    ),
    suggestedLateFeeStartsAt: formatDateTimeInput(
      period.lateFeeStartsAt ? addDays(period.lateFeeStartsAt, 7) : null,
    ),
    suggestedOrderingClosesAt: formatDateTimeInput(
      period.orderingClosesAt ? addDays(period.orderingClosesAt, 7) : null,
    ),
    suggestedFixedFulfillmentAt: formatDateTimeInput(
      period.fixedFulfillmentAt ? addDays(period.fixedFulfillmentAt, 7) : null,
    ),
    customerSchedulingEnabled: period.customerSchedulingEnabled,
    deliveryWindowLabel: period.deliveryWindowLabel,
    fulfillmentNotes: period.fulfillmentNotes,
    capacity: period.capacity,
    packageCount: period.packages.length,
    offeringCount: period.offerings.length,
  };
}

function toPackageFormData(
  pkg: AdminWeeklyMenuPackage,
): WeeklyMealPlanPackageFormData {
  return {
    id: pkg.id,
    name: pkg.name,
    days: pkg.days,
    mealsPerDay: pkg.mealsPerDay,
    price: Number(pkg.price),
    available: pkg.available,
    requiresChefApproval: pkg.requiresChefApproval,
    isSeasonal: pkg.isSeasonal,
    mealSlotLabels: normalizeWeeklyMealSlotLabels(
      pkg.mealSlotLabels,
      pkg.mealsPerDay,
    ),
    displayOrder: pkg.displayOrder,
    notes: pkg.notes,
  };
}

function toOfferingFormData(
  offering: AdminWeeklyMenuOffering,
): WeeklyMealPlanOfferingFormData {
  return {
    id: offering.id,
    name: offering.name,
    description: offering.description,
    imageUrl: offering.imageUrl,
    dietaryInfo: offering.dietaryInfo,
    available: offering.available,
    breakfastOnly: offering.breakfastOnly,
    displayOrder: offering.displayOrder,
  };
}

function toOptionFormData(
  option: AdminWeeklyMenuOption,
): WeeklyMealPlanAllowedOptionFormData {
  return {
    id: option.id,
    optionType: option.optionType,
    name: option.name,
    description: option.description,
    dietaryInfo: option.dietaryInfo,
    priceDelta: Number(option.priceDelta),
    requestOnly: option.requestOnly,
    requiresApproval: option.requiresApproval,
    available: option.available,
    displayOrder: option.displayOrder,
  };
}

function isActiveFulfillmentSelection(selection: WeeklyFulfillmentSelection) {
  const order = selection.orderItem.order;

  return (
    order.approvalStatus !== "DENIED" &&
    order.status !== "CANCELLED" &&
    order.status !== "REFUNDED"
  );
}

function sumSelectionQuantity(selections: WeeklyFulfillmentSelection[]) {
  return selections.reduce(
    (total, selection) => total + selection.orderItem.quantity,
    0,
  );
}

function countFlaggedQuantity(
  selections: WeeklyFulfillmentSelection[],
  predicate: (selection: WeeklyFulfillmentSelection) => boolean,
) {
  return selections.reduce(
    (total, selection) =>
      predicate(selection) ? total + selection.orderItem.quantity : total,
    0,
  );
}

function getAllergenConflictNames(snapshot: unknown) {
  if (!Array.isArray(snapshot)) {
    return [];
  }

  return snapshot
    .map((entry) => {
      if (!entry || typeof entry !== "object" || !("name" in entry)) {
        return null;
      }

      const name = (entry as { name?: unknown }).name;

      return typeof name === "string" ? name : null;
    })
    .filter((name): name is string => Boolean(name));
}

function buildFulfillmentCountRows(
  selections: WeeklyFulfillmentSelection[],
  getLabel: (selection: WeeklyFulfillmentSelection) => string,
) {
  const rowsByLabel = new Map<
    string,
    {
      quantity: number;
      orderIds: Set<string>;
    }
  >();

  for (const selection of selections) {
    const label = getLabel(selection);
    const current = rowsByLabel.get(label) ?? {
      quantity: 0,
      orderIds: new Set<string>(),
    };

    current.quantity += selection.orderItem.quantity;
    current.orderIds.add(selection.orderItem.order.id);
    rowsByLabel.set(label, current);
  }

  return Array.from(rowsByLabel.entries())
    .map(
      ([label, row]): FulfillmentCountRow => ({
        label,
        quantity: row.quantity,
        orderCount: row.orderIds.size,
      }),
    )
    .sort((a, b) => a.label.localeCompare(b.label));
}

function FulfillmentCountList({ rows }: { rows: FulfillmentCountRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg bg-white/70 p-3 text-sm text-[#6b5a50]">
        No active weekly selections.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-3 rounded-lg bg-white/80 p-3 text-sm"
        >
          <div>
            <p className="font-medium text-neutral-900">{row.label}</p>
            <p className="mt-1 text-xs text-[#6b5a50]">
              {row.orderCount} order{row.orderCount === 1 ? "" : "s"}
            </p>
          </div>

          <p className="font-black">{row.quantity}</p>
        </div>
      ))}
    </div>
  );
}

export default async function AdminWeeklyMenuPage() {
  await requireAdminPage();

  const [periods, allergens]: [AdminWeeklyMenuPeriod[], AdminAllergen[]] =
    await Promise.all([
      prisma.weeklyMenuPeriod.findMany(weeklyMenuPeriodQuery),
      prisma.allergen.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);
  const allergenOptions = allergens;

  return (
    <main className="admin-page">
      <div className="admin-container">
        <div className="mb-8">
          <Link className="admin-back-link" href="/admin/menu">
            &larr; Back to Menu Manager
          </Link>

          <p className="admin-eyebrow mt-5">Admin</p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Weekly Menu Manager
          </h1>
          <div className="mt-4 flex items-center gap-3"><AdminPageHelpLink section="weekly-menu" /><span className="text-sm font-bold">Weekly capacity <AdminHelpPopover title="Weekly Capacity" summary="This is the maximum number of weekly orders accepted for the period, not the number of individual meals." section="weekly-menu" /></span></div>
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 font-bold">Before publishing, confirm prices, capacity, offerings, allergens, options, and customer-facing dates.</p>

          <p className="mt-3 max-w-3xl text-[#6b5a50]">
            Draft and maintain weekly meal plan periods and fixed-price 1- or
            2-meal packages for the public weekly menu and fulfillment prep.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
          <aside className="xl:sticky xl:top-24 xl:self-start">
            <WeeklyMenuPeriodForm />
          </aside>

          <section className="space-y-5">
            {periods.map((period) => {
              const periodFormData = toPeriodFormData(period);
              const cloneSource = toCloneSource(period);
              const dateRange = `${formatDisplayDate(
                period.startDate,
              )} - ${formatDisplayDate(period.endDate)}`;
              const orderSlotsRemaining = Math.max(
                period.capacity - period.ordersPlaced,
                0,
              );
              const fulfillmentSelections = period.orderSelections;
              const activeFulfillmentSelections = fulfillmentSelections.filter(
                isActiveFulfillmentSelection,
              );
              const inactiveSelectionCount =
                fulfillmentSelections.length -
                activeFulfillmentSelections.length;
              const activeFulfillmentQuantity = sumSelectionQuantity(
                activeFulfillmentSelections,
              );
              const activeFulfillmentOrderCount = new Set(
                activeFulfillmentSelections.map(
                  (selection) => selection.orderItem.order.id,
                ),
              ).size;
              const packageRows = buildFulfillmentCountRows(
                activeFulfillmentSelections,
                (selection) => selection.packageName,
              );
              const offeringRows = buildFulfillmentCountRows(
                activeFulfillmentSelections,
                (selection) => selection.offeringName,
              );
              const spiceRows = buildFulfillmentCountRows(
                activeFulfillmentSelections,
                (selection) => selection.spiceLevel ?? "No spice selected",
              );
              const proteinRows = buildFulfillmentCountRows(
                activeFulfillmentSelections,
                (selection) =>
                  selection.proteinSubstitution ?? "No protein substitution",
              );
              const requestOnlyQuantity = countFlaggedQuantity(
                activeFulfillmentSelections,
                (selection) => selection.requestOnly,
              );
              const approvalRequiredQuantity = countFlaggedQuantity(
                activeFulfillmentSelections,
                (selection) => selection.requiresApproval,
              );
              const allergenFlagQuantity = countFlaggedQuantity(
                activeFulfillmentSelections,
                (selection) =>
                  getAllergenConflictNames(
                    selection.orderItem.allergenConflictSnapshot,
                  ).length > 0,
              );
              const allergenConflictNames = Array.from(
                new Set(
                  activeFulfillmentSelections.flatMap((selection) =>
                    getAllergenConflictNames(
                      selection.orderItem.allergenConflictSnapshot,
                    ),
                  ),
                ),
              ).sort((a, b) => a.localeCompare(b));

              return (
                <details
                  key={period.id}
                  className="admin-card group overflow-hidden"
                >
                  <summary className="cursor-pointer list-none p-5 transition hover:bg-[#fff8ee]">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-black">
                            {period.label}
                          </h2>

                          <span className="admin-badge admin-badge-neutral">
                            {formatWeeklyMenuStatus(period.status)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-[#6b5a50]">
                          {dateRange}
                        </p>

                        <div className="mt-3 grid gap-1 text-xs text-[#6b5a50] sm:grid-cols-2">
                          <span>
                            Opens:{" "}
                            {period.orderingOpenAt
                              ? formatDisplayDateTime(period.orderingOpenAt)
                              : "Uses defaults"}
                          </span>
                          <span>
                            Late fee:{" "}
                            {period.lateFeeStartsAt
                              ? formatDisplayDateTime(period.lateFeeStartsAt)
                              : "Uses defaults"}
                          </span>
                          <span>
                            Closes:{" "}
                            {period.orderingClosesAt
                              ? formatDisplayDateTime(period.orderingClosesAt)
                              : "Uses defaults"}
                          </span>
                          <span>
                            Fulfillment:{" "}
                            {period.deliveryWindowLabel ?? "Uses defaults"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#6b5a50]">
                          <span>
                            Weekly orders: {period.ordersPlaced}/
                            {period.capacity}
                            {" - "}
                            {orderSlotsRemaining === 0
                              ? "order limit reached"
                              : `${orderSlotsRemaining} order slot${
                                  orderSlotsRemaining === 1 ? "" : "s"
                                } left`}
                          </span>

                          <span>Packages: {period.packages.length}</span>

                          <span>Offerings: {period.offerings.length}</span>
                        </div>
                      </div>

                      <div className="text-sm font-bold text-[#6b5a50] group-open:hidden">
                        Open details &gt;
                      </div>

                      <div className="hidden text-sm font-bold text-[#6b5a50] group-open:block">
                        Close details ^
                      </div>
                    </div>
                  </summary>

                  <div className="border-t p-5">
                    <div className="grid gap-6 3xl:grid-cols-[minmax(0,1fr)_380px]">
                      <section className="space-y-5">
                        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                            <div>
                              <h3 className="text-lg font-black">
                                Weekly Fulfillment Prep
                              </h3>

                              <p className="mt-1 text-sm text-emerald-950">
                                {activeFulfillmentQuantity} weekly meal plan
                                item
                                {activeFulfillmentQuantity === 1
                                  ? ""
                                  : "s"}{" "}
                                across {activeFulfillmentOrderCount} active
                                order
                                {activeFulfillmentOrderCount === 1 ? "" : "s"}.
                              </p>
                            </div>

                            <Link
                              href="/admin/kitchen"
                              className="admin-button-secondary border-emerald-300 text-emerald-950"
                            >
                              Open Kitchen Board
                            </Link>
                          </div>

                          {period.fulfillmentNotes && (
                            <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-emerald-950">
                              <p className="font-black">Fulfillment Notes</p>
                              <p className="mt-2 whitespace-pre-wrap">
                                {period.fulfillmentNotes}
                              </p>
                            </div>
                          )}

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-xl bg-white p-4">
                              <p className="text-xs font-bold uppercase text-[#6b5a50]">
                                Order Capacity
                              </p>
                              <p className="mt-2 text-2xl font-bold">
                                {period.ordersPlaced}/{period.capacity}
                              </p>
                              <p className="mt-1 text-xs text-[#6b5a50]">
                                {orderSlotsRemaining} weekly order slot
                                {orderSlotsRemaining === 1 ? "" : "s"} remaining
                              </p>
                            </div>

                            <div className="rounded-xl bg-white p-4">
                              <p className="text-xs font-bold uppercase text-[#6b5a50]">
                                Active Orders
                              </p>
                              <p className="mt-2 text-2xl font-bold">
                                {activeFulfillmentOrderCount}
                              </p>
                            </div>

                            <div className="rounded-xl bg-white p-4">
                              <p className="text-xs font-bold uppercase text-[#6b5a50]">
                                Request Only
                              </p>
                              <p className="mt-2 text-2xl font-bold">
                                {requestOnlyQuantity}
                              </p>
                            </div>

                            <div className="rounded-xl bg-white p-4">
                              <p className="text-xs font-bold uppercase text-[#6b5a50]">
                                Approval Required
                              </p>
                              <p className="mt-2 text-2xl font-bold">
                                {approvalRequiredQuantity}
                              </p>
                            </div>

                            <div className="rounded-xl bg-white p-4">
                              <p className="text-xs font-bold uppercase text-[#6b5a50]">
                                Allergen Flags
                              </p>
                              <p className="mt-2 text-2xl font-bold">
                                {allergenFlagQuantity}
                              </p>
                            </div>
                          </div>

                          {inactiveSelectionCount > 0 && (
                            <p className="mt-3 text-xs text-[#6b5a50]">
                              {inactiveSelectionCount} selection
                              {inactiveSelectionCount === 1 ? "" : "s"} from
                              denied, cancelled, or refunded orders excluded
                              from prep counts.
                            </p>
                          )}

                          {allergenConflictNames.length > 0 && (
                            <p className="mt-3 text-sm font-medium text-red-800">
                              Allergen conflicts:{" "}
                              {allergenConflictNames.join(", ")}
                            </p>
                          )}

                          <div className="mt-5 grid gap-4 xl:grid-cols-4">
                            <div>
                              <h4 className="mb-2 text-sm font-black">
                                By Offering
                              </h4>
                              <FulfillmentCountList rows={offeringRows} />
                            </div>

                            <div>
                              <h4 className="mb-2 text-sm font-black">
                                By Package
                              </h4>
                              <FulfillmentCountList rows={packageRows} />
                            </div>

                            <div>
                              <h4 className="mb-2 text-sm font-black">
                                By Spice Level
                              </h4>
                              <FulfillmentCountList rows={spiceRows} />
                            </div>

                            <div>
                              <h4 className="mb-2 text-sm font-black">
                                By Protein
                              </h4>
                              <FulfillmentCountList rows={proteinRows} />
                            </div>
                          </div>

                          <div className="mt-5">
                            <h4 className="mb-2 text-sm font-black">
                              Active Weekly Orders
                            </h4>

                            {activeFulfillmentSelections.length > 0 ? (
                              <div className="space-y-2">
                                {activeFulfillmentSelections.map(
                                  (selection) => {
                                    const order = selection.orderItem.order;

                                    return (
                                      <Link
                                        key={selection.id}
                                        href={`/admin/orders/${order.id}`}
                                        className="block rounded-lg bg-white/80 p-3 text-sm transition hover:bg-white hover:shadow-sm"
                                      >
                                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                          <div>
                                            <p className="font-black">
                                              {order.customerName}
                                            </p>

                                            <p className="mt-1 text-[#6b5a50]">
                                              {selection.orderItem.quantity} x{" "}
                                              {selection.packageName} -{" "}
                                              {selection.offeringName}
                                            </p>

                                            <p className="mt-1 text-xs text-[#6b5a50]">
                                              Spice:{" "}
                                              {selection.spiceLevel ??
                                                "Not selected"}{" "}
                                              | Protein:{" "}
                                              {selection.proteinSubstitution ??
                                                "No substitution"}
                                            </p>

                                            <p className="mt-1 text-xs text-[#6b5a50]">
                                              Weekly fulfillment:{" "}
                                              {period.deliveryWindowLabel ??
                                                DEFAULT_WEEKLY_FIXED_MESSAGE}
                                            </p>
                                          </div>

                                          <div className="flex flex-wrap gap-2 lg:justify-end">
                                            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                                              {formatOrderStatus(order.status)}
                                            </span>

                                            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                                              {formatApprovalStatus(
                                                order.approvalStatus,
                                              )}
                                            </span>

                                            {selection.requestOnly && (
                                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                                                Request Only
                                              </span>
                                            )}

                                            {getAllergenConflictNames(
                                              selection.orderItem
                                                .allergenConflictSnapshot,
                                            ).length > 0 && (
                                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                                                Allergen Flag
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </Link>
                                    );
                                  },
                                )}
                              </div>
                            ) : (
                              <p className="rounded-lg bg-white/70 p-3 text-sm text-[#6b5a50]">
                                No active weekly orders for this period yet.
                              </p>
                            )}
                          </div>
                        </section>

                        <div>
                          <h3 className="text-lg font-black">
                            Weekly Packages
                          </h3>

                          <p className="mt-1 text-sm text-[#6b5a50]">
                            Packages are fixed price. Set approval flags,
                            seasonal badges, and customer-facing meal slot
                            labels for each package.
                          </p>
                        </div>

                        <WeeklyMealPlanPackageForm
                          periodId={period.id}
                          offerings={period.offerings.map((offering) => ({
                            id: offering.id,
                            name: offering.name,
                            breakfastOnly: offering.breakfastOnly,
                            available: offering.available,
                          }))}
                        />

                        {period.packages.length > 0 ? (
                          <div className="space-y-3">
                            {period.packages.map((pkg) => {
                              const packageFormData = toPackageFormData(pkg);

                              return (
                                <details
                                  key={pkg.id}
                                  className="group rounded-lg border border-[#ead8c1] bg-[#fff8ee]"
                                >
                                  <summary className="cursor-pointer list-none p-4 transition hover:bg-white">
                                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-black">
                                            {pkg.name}
                                          </p>

                                          <span
                                            className={
                                              pkg.available
                                                ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
                                                : "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800"
                                            }
                                          >
                                            {pkg.available
                                              ? "Available"
                                              : "Unavailable"}
                                          </span>

                                          {pkg.requiresChefApproval && (
                                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                                              Requires chef approval
                                            </span>
                                          )}

                                          {pkg.isSeasonal && (
                                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                                              Seasonal
                                            </span>
                                          )}
                                        </div>

                                        <p className="mt-1 text-sm text-[#6b5a50]">
                                          {pkg.days} days, {pkg.mealsPerDay}{" "}
                                          meal
                                          {pkg.mealsPerDay === 1 ? "" : "s"} per
                                          day - ${Number(pkg.price).toFixed(2)}
                                        </p>

                                        <p className="mt-1 text-xs text-[#6b5a50]">
                                          Slots:{" "}
                                          {normalizeWeeklyMealSlotLabels(
                                            pkg.mealSlotLabels,
                                            pkg.mealsPerDay,
                                          ).join(", ")}
                                        </p>
                                      </div>

                                      <div className="text-xs font-bold text-[#6b5a50] group-open:hidden">
                                        Edit &gt;
                                      </div>

                                      <div className="hidden text-xs font-bold text-[#6b5a50] group-open:block">
                                        Close ^
                                      </div>
                                    </div>
                                  </summary>

                                  <div className="border-t p-4">
                                    <WeeklyMealPlanPackageForm
                                      periodId={period.id}
                                      pkg={packageFormData}
                                      offerings={period.offerings.map(
                                        (offering) => ({
                                          id: offering.id,
                                          name: offering.name,
                                          breakfastOnly:
                                            offering.breakfastOnly,
                                          available: offering.available,
                                        }),
                                      )}
                                    />
                                  </div>
                                </details>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="admin-card-muted p-5 text-sm text-[#6b5a50]">
                            No packages have been added for this weekly menu
                            yet.
                          </div>
                        )}

                        <section className="border-t pt-5">
                          <div>
                            <h3 className="text-lg font-black">
                              Weekly Offerings
                            </h3>

                            <p className="mt-1 text-sm text-[#6b5a50]">
                              Offerings are the fixed meals customers will see
                              for this weekly menu. Add allergen tags and the
                              allowed spice or protein choices to each offering.
                            </p>
                          </div>

                          <div className="mt-5">
                            <WeeklyMealPlanOfferingForm periodId={period.id} />
                          </div>

                          {period.offerings.length > 0 ? (
                            <div className="mt-5 space-y-3">
                              {period.offerings.map((offering) => {
                                const offeringFormData =
                                  toOfferingFormData(offering);
                                const selectedAllergenIds =
                                  offering.allergens.map(
                                    (entry) => entry.allergen.id,
                                  );
                                const selectedAllergenNames =
                                  offering.allergens.map(
                                    (entry) => entry.allergen.name,
                                  );

                                return (
                                  <details
                                    key={offering.id}
                                    className="group rounded-lg border border-[#ead8c1] bg-[#fff8ee]"
                                  >
                                    <summary className="cursor-pointer list-none p-4 transition hover:bg-white">
                                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-black">
                                              {offering.name}
                                            </p>

                                            <span
                                              className={
                                                offering.available
                                                  ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
                                                  : "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800"
                                              }
                                            >
                                              {offering.available
                                                ? "Available"
                                                : "Unavailable"}
                                            </span>

                                            {offering.breakfastOnly && (
                                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                                                Breakfast-only
                                              </span>
                                            )}
                                          </div>

                                          <p className="mt-1 line-clamp-2 text-sm text-[#6b5a50]">
                                            {offering.description}
                                          </p>

                                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#6b5a50]">
                                            <span>
                                              Allergens:{" "}
                                              {selectedAllergenNames.length > 0
                                                ? selectedAllergenNames.join(
                                                    ", ",
                                                  )
                                                : "None"}
                                            </span>

                                            <span>
                                              Options: {offering.options.length}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-xs font-bold text-[#6b5a50] group-open:hidden">
                                          Manage &gt;
                                        </div>

                                        <div className="hidden text-xs font-bold text-[#6b5a50] group-open:block">
                                          Close ^
                                        </div>
                                      </div>
                                    </summary>

                                    <div className="space-y-5 border-t p-4">
                                      <div className="grid gap-5">
                                        <WeeklyMealPlanOfferingForm
                                          periodId={period.id}
                                          offering={offeringFormData}
                                        />

                                        <div className="space-y-3">
                                          {offering.imageUrl && (
                                            <div className="rounded-lg border border-[#ead8c1] bg-white p-4 text-sm text-[#6b5a50]">
                                              <p className="font-black text-[#24130f]">
                                                Image URL
                                              </p>
                                              <p className="mt-2 break-all">
                                                {offering.imageUrl}
                                              </p>
                                            </div>
                                          )}

                                          <DeleteWeeklyMealPlanOfferingButton
                                            offeringId={offering.id}
                                            offeringName={offering.name}
                                          />
                                        </div>
                                      </div>

                                      <WeeklyOfferingAllergenEditor
                                        offeringId={offering.id}
                                        allergens={allergenOptions}
                                        selectedAllergenIds={
                                          selectedAllergenIds
                                        }
                                      />

                                      <section className="space-y-4 rounded-lg border border-[#ead8c1] bg-white p-4">
                                        <div>
                                          <h4 className="font-black">
                                            Spice and Protein Options
                                          </h4>

                                          <p className="mt-1 text-sm text-[#6b5a50]">
                                            Customers can choose spice level and
                                            approved protein substitutions only.
                                          </p>
                                        </div>

                                        <WeeklyMealPlanOptionForm
                                          offeringId={offering.id}
                                        />

                                        {offering.options.length > 0 ? (
                                          <div className="space-y-3">
                                            {offering.options.map((option) => {
                                              const optionFormData =
                                                toOptionFormData(option);

                                              return (
                                                <details
                                                  key={option.id}
                                                  className="group rounded-lg border border-[#ead8c1] bg-[#fff8ee]"
                                                >
                                                  <summary className="cursor-pointer list-none p-4 transition hover:bg-white">
                                                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                                                      <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                          <p className="font-black">
                                                            {option.name}
                                                          </p>

                                                          <span className="admin-badge admin-badge-neutral">
                                                            {formatWeeklyMealPlanOptionType(
                                                              option.optionType,
                                                            )}
                                                          </span>

                                                          {option.requiresApproval && (
                                                            <span className="admin-badge admin-badge-info">
                                                              Approval Required
                                                            </span>
                                                          )}

                                                          {!option.available && (
                                                            <span className="admin-badge admin-badge-danger">
                                                              Unavailable
                                                            </span>
                                                          )}
                                                        </div>

                                                        <p className="mt-1 text-sm text-[#6b5a50]">
                                                          +$
                                                          {Number(
                                                            option.priceDelta,
                                                          ).toFixed(2)}
                                                        </p>
                                                      </div>

                                                      <div className="text-xs font-bold text-[#6b5a50] group-open:hidden">
                                                        Edit &gt;
                                                      </div>

                                                      <div className="hidden text-xs font-bold text-[#6b5a50] group-open:block">
                                                        Close ^
                                                      </div>
                                                    </div>
                                                  </summary>

                                                  <div className="space-y-3 border-t p-4">
                                                    <WeeklyMealPlanOptionForm
                                                      offeringId={offering.id}
                                                      option={optionFormData}
                                                    />

                                                    <DeleteWeeklyMealPlanOptionButton
                                                      optionId={option.id}
                                                      optionName={option.name}
                                                    />
                                                  </div>
                                                </details>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="admin-card-muted p-4 text-sm text-[#6b5a50]">
                                            No spice or protein options have
                                            been added for this offering yet.
                                          </div>
                                        )}
                                      </section>
                                    </div>
                                  </details>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="admin-card-muted mt-5 p-5 text-sm text-[#6b5a50]">
                              No offerings have been added for this weekly menu
                              yet.
                            </div>
                          )}
                        </section>
                      </section>

                      <aside className="space-y-5">
                        <WeeklyMenuPeriodForm period={periodFormData} />
                        <WeeklyMenuCloneForm source={cloneSource} />
                      </aside>
                    </div>
                  </div>
                </details>
              );
            })}

            {periods.length === 0 && (
              <div className="admin-card p-8 text-center">
                <p className="font-bold">No weekly menus yet.</p>

                <p className="mt-2 text-sm text-[#6b5a50]">
                  Create the first weekly menu period, then add 1- and 2-meal
                  packages to it.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
