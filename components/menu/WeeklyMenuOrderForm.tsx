"use client";

import { useMemo, useState } from "react";
import { AllergenConflictWarning } from "@/components/allergens/AllergenConflictWarning";
import { useCustomerAllergens } from "@/hooks/useCustomerAllergens";
import { formatWeeklyMealPlanOptionType } from "@/lib/format-labels";
import { isBreakfastWeeklyMealSlotLabel } from "@/lib/weekly-package-labels";
import {
  useCartStore,
  type CartItemAllergen,
  type WeeklyMealPlanCartSelection,
} from "@/store/cart-store";
import type { PublicWeeklyMenu, PublicWeeklyOption } from "@/types/weekly-menu";

type Props = {
  weeklyMenu: PublicWeeklyMenu;
};

type MealSlotDefinition = {
  key: string;
  dayNumber: number;
  mealNumber: number;
  mealLabel: string;
};

type SlotOptionSelections = Record<string, Record<string, string>>;

function buildSlotKey(dayNumber: number, mealNumber: number) {
  return `${dayNumber}:${mealNumber}`;
}

function buildMealSlots(
  days: number,
  mealsPerDay: number,
  mealSlotLabels: string[],
) {
  const slots: MealSlotDefinition[] = [];

  for (let dayNumber = 1; dayNumber <= days; dayNumber += 1) {
    for (let mealNumber = 1; mealNumber <= mealsPerDay; mealNumber += 1) {
      slots.push({
        key: buildSlotKey(dayNumber, mealNumber),
        dayNumber,
        mealNumber,
        mealLabel: mealSlotLabels[mealNumber - 1] ?? `Meal ${mealNumber}`,
      });
    }
  }

  return slots;
}

function uniqueAllergens(allergens: CartItemAllergen[]) {
  return Array.from(
    new Map(allergens.map((allergen) => [allergen.id, allergen])).values(),
  );
}

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

function optionTypeRequiresSelection(optionType: string) {
  return optionType === "SPICE_LEVEL";
}

function offeringIsAvailableForSlot(
  offering: PublicWeeklyMenu["offerings"][number],
  slot: MealSlotDefinition,
) {
  return (
    !offering.breakfastOnly || isBreakfastWeeklyMealSlotLabel(slot.mealLabel)
  );
}

export function WeeklyMenuOrderForm({ weeklyMenu }: Props) {
  const addWeeklyMealPlan = useCartStore((state) => state.addWeeklyMealPlan);
  const { selectedAllergenIdSet } = useCustomerAllergens();
  const [packageId, setPackageId] = useState(weeklyMenu.packages[0]?.id ?? "");
  const [slotSelections, setSlotSelections] = useState<Record<string, string>>(
    {},
  );
  const [slotOptionSelections, setSlotOptionSelections] =
    useState<SlotOptionSelections>({});
  const [added, setAdded] = useState(false);

  const selectedPackage = weeklyMenu.packages.find(
    (pkg) => pkg.id === packageId,
  );
  const mealSlots = useMemo(
    () =>
      selectedPackage
        ? buildMealSlots(
            selectedPackage.days,
            selectedPackage.mealsPerDay,
            selectedPackage.mealSlotLabels,
          )
        : [],
    [selectedPackage],
  );
  const offeringById = useMemo(
    () =>
      new Map(weeklyMenu.offerings.map((offering) => [offering.id, offering])),
    [weeklyMenu.offerings],
  );
  const selectedSlotOfferings = mealSlots
    .map((slot) => offeringById.get(slotSelections[slot.key]))
    .filter((offering): offering is PublicWeeklyMenu["offerings"][number] =>
      Boolean(offering),
    );
  const selectedSlotCount = selectedSlotOfferings.length;
  const requiredSlotCount = mealSlots.length;
  const missingRequiredSlots =
    Boolean(selectedPackage) && selectedSlotCount < requiredSlotCount;
  const selectedAllergens = uniqueAllergens(
    selectedSlotOfferings.flatMap((offering) => offering.allergens),
  );
  const allergenConflicts = selectedAllergens.filter((allergen) =>
    selectedAllergenIdSet.has(allergen.id),
  );
  const orderSlotsRemaining = Math.max(
    weeklyMenu.capacity - weeklyMenu.ordersPlaced,
    0,
  );
  const unavailable =
    weeklyMenu.orderingStatus === "not_open" ||
    weeklyMenu.orderingClosed ||
    orderSlotsRemaining < 1 ||
    weeklyMenu.packages.length === 0 ||
    weeklyMenu.offerings.length === 0;
  const selectedOptionDelta = mealSlots.reduce((total, slot) => {
    const offering = offeringById.get(slotSelections[slot.key]);

    if (!offering) return total;

    return (
      total +
      getSelectedOptionsForSlot(slot.key, offering).reduce(
        (slotTotal, option) => slotTotal + option.priceDelta,
        0,
      )
    );
  }, 0);
  const displayTotal = selectedPackage
    ? selectedPackage.price + selectedOptionDelta
    : 0;

  function getSelectedOptionsForSlot(
    slotKey: string,
    offering: PublicWeeklyMenu["offerings"][number],
  ) {
    const selectedByType = slotOptionSelections[slotKey] ?? {};

    return Object.entries(groupOptionsByType(offering.options)).flatMap(
      ([optionType, options]) => {
        const selectedOptionId =
          selectedByType[optionType] ??
          (optionTypeRequiresSelection(optionType) ? options[0]?.id : "");

        if (!selectedOptionId) return [];

        const selectedOption = options.find(
          (option) => option.id === selectedOptionId,
        );

        return selectedOption ? [selectedOption] : [];
      },
    );
  }

  function updateSlot(slotKey: string, offeringId: string) {
    setSlotSelections((current) => ({
      ...current,
      [slotKey]: offeringId,
    }));
    setSlotOptionSelections((current) => {
      const next = { ...current };
      delete next[slotKey];

      return next;
    });
    setAdded(false);
  }

  function updateSlotOption(
    slotKey: string,
    optionType: string,
    optionId: string,
  ) {
    setSlotOptionSelections((current) => {
      const nextForSlot = { ...(current[slotKey] ?? {}) };

      if (optionId) {
        nextForSlot[optionType] = optionId;
      } else {
        delete nextForSlot[optionType];
      }

      return {
        ...current,
        [slotKey]: nextForSlot,
      };
    });
    setAdded(false);
  }

  function addSelection() {
    if (!selectedPackage || unavailable) return;

    if (missingRequiredSlots) {
      alert("Please choose a weekly meal offering for every meal slot.");
      return;
    }

    const selectedMealSlots = mealSlots.map((slot) => {
      const offering = offeringById.get(slotSelections[slot.key]);

      if (!offering) {
        return null;
      }

      return {
        dayNumber: slot.dayNumber,
        mealNumber: slot.mealNumber,
        mealLabel: slot.mealLabel,
        weeklyMealPlanOfferingId: offering.id,
        offeringName: offering.name,
        dietaryInfo: offering.dietaryInfo,
        allergens: offering.allergens,
        selectedOptions: getSelectedOptionsForSlot(slot.key, offering).map(
          (option) => ({
            weeklyMealPlanAllowedOptionId: option.id,
            optionType: option.optionType,
            optionName: option.name,
            priceDelta: option.priceDelta,
            requestOnly: option.requestOnly,
            requiresApproval: option.requiresApproval,
          }),
        ),
      };
    });

    if (selectedMealSlots.some((slot) => !slot)) {
      alert("Please choose a weekly meal offering for every meal slot.");
      return;
    }

    const selection: WeeklyMealPlanCartSelection = {
      weeklyMenuPeriodId: weeklyMenu.id,
      weeklyMealPlanPackageId: selectedPackage.id,
      weeklyMealPlanOfferingId: null,
      spiceOptionId: null,
      proteinSubstitutionOptionId: null,
      periodLabel: weeklyMenu.label,
      packageName: selectedPackage.name,
      packageDays: selectedPackage.days,
      packageMealsPerDay: selectedPackage.mealsPerDay,
      packagePrice: selectedPackage.price,
      packageRequiresChefApproval: selectedPackage.requiresChefApproval,
      packageIsSeasonal: selectedPackage.isSeasonal,
      customerSchedulingEnabled: weeklyMenu.customerSchedulingEnabled,
      fixedFulfillmentAt: weeklyMenu.fixedFulfillmentAt,
      fixedFulfillmentLabel: weeklyMenu.fixedFulfillmentLabel,
      deliveryWindowLabel: weeklyMenu.deliveryWindowLabel,
      orderingOpenAt: weeklyMenu.orderingOpenAt,
      lateFeeStartsAt: weeklyMenu.lateFeeStartsAt,
      orderingClosesAt: weeklyMenu.orderingClosesAt,
      orderingOpenLabel: weeklyMenu.orderingOpenLabel,
      lateFeeStartsLabel: weeklyMenu.lateFeeStartsLabel,
      orderingClosesLabel: weeklyMenu.orderingClosesLabel,
      offeringName: "Build Your Weekly Plan",
      mealSlots: selectedMealSlots.filter(
        (slot): slot is NonNullable<(typeof selectedMealSlots)[number]> =>
          Boolean(slot),
      ),
      spiceLevel: null,
      spicePriceDelta: 0,
      proteinSubstitution: null,
      proteinSubstitutionPriceDelta: 0,
      requestOnly:
        selectedPackage.requiresChefApproval ||
        selectedMealSlots.some((slot) =>
          slot?.selectedOptions.some((option) => option.requestOnly),
        ),
      requiresApproval:
        selectedPackage.requiresChefApproval ||
        selectedMealSlots.some((slot) =>
          slot?.selectedOptions.some(
            (option) => option.requestOnly || option.requiresApproval,
          ),
        ),
      priceDelta: selectedOptionDelta,
    };

    addWeeklyMealPlan(selection, selectedAllergens);
    setAdded(true);
  }

  return (
    <div className="mb-8 rounded-lg border border-[#f4c46f]/35 bg-[#fff8ee] p-5 text-[#24130f] shadow-xl sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h3 className="text-2xl font-black">Build Your Weekly Plan</h3>

          <p className="mt-2 text-sm leading-6 text-[#6b5a50]">
            Choose a package size, then fill every day and meal slot with one of
            this week&apos;s published meal offerings.
          </p>
        </div>

        <div className="rounded-lg bg-[#24130f] px-4 py-3 text-white">
          <p className="text-xs font-bold uppercase text-[#f4c46f]">
            Plan total
          </p>
          <p className="text-2xl font-black">${displayTotal.toFixed(2)}</p>
        </div>
      </div>

      {unavailable && (
        <div className="mt-5 rounded-lg border border-[#d99426] bg-[#fff3cf] p-4 text-sm font-medium text-[#6f1f12]">
          {orderSlotsRemaining < 1
            ? "This weekly menu has reached its weekly order limit."
            : weeklyMenu.orderingStatus === "not_open"
              ? "Ordering for this weekly menu has not opened yet."
              : weeklyMenu.orderingClosed
                ? "Ordering for this weekly menu has closed."
                : "This weekly menu is not ready for ordering yet."}
        </div>
      )}

      <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label className="grid min-w-0 gap-2 text-sm font-bold">
          Package
          <select
            value={packageId}
            onChange={(event) => {
              setPackageId(event.target.value);
              setSlotSelections({});
              setAdded(false);
            }}
            className="w-full min-w-0 rounded-lg border border-[#d7bea1] bg-white px-4 py-3 text-sm font-medium text-[#24130f] outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
            disabled={unavailable}
          >
            {weeklyMenu.packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} - ${pkg.price.toFixed(2)}
                {pkg.requiresChefApproval ? " - By request" : ""}
                {pkg.isSeasonal ? " - Seasonal" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-[#ead8c1] bg-white px-4 py-3 text-sm font-bold text-[#6f1f12]">
          {selectedSlotCount}/{requiredSlotCount} meals selected
        </div>
      </div>

      {selectedPackage && (
        <section className="mt-5 rounded-lg border border-[#ead8c1] bg-white p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase text-[#9f2f18]">
                Required meals
              </p>
              <h4 className="mt-1 text-xl font-black">
                {requiredSlotCount} meal selections
              </h4>
            </div>

            <p className="text-sm font-semibold text-[#6b5a50]">
              {selectedPackage.days} days x {selectedPackage.mealsPerDay} meals
              per day
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedPackage.requiresChefApproval && (
              <span className="rounded-full bg-[#fff0bd] px-3 py-1 text-xs font-bold text-[#6f1f12]">
                By request
              </span>
            )}

            {selectedPackage.isSeasonal && (
              <span className="rounded-full bg-[#f4eadb] px-3 py-1 text-xs font-bold text-[#6f1f12]">
                Seasonal
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-4">
            {Array.from({ length: selectedPackage.days }, (_, dayIndex) => {
              const dayNumber = dayIndex + 1;
              const daySlots = mealSlots.filter(
                (slot) => slot.dayNumber === dayNumber,
              );

              return (
                <div
                  key={dayNumber}
                  className="rounded-lg border border-[#ead8c1] bg-[#fff8ee] p-4"
                >
                  <h5 className="text-sm font-black uppercase text-[#6f1f12]">
                    Day {dayNumber}
                  </h5>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {daySlots.map((slot) => {
                      const selectedOffering = offeringById.get(
                        slotSelections[slot.key],
                      );
                      const groupedOptions = selectedOffering
                        ? groupOptionsByType(selectedOffering.options)
                        : {};

                      return (
                        <div key={slot.key} className="grid min-w-0 gap-3">
                          <label className="grid min-w-0 gap-2 text-sm font-bold">
                            <span className="sr-only">
                              Day {dayNumber} meal selection
                            </span>
                            <select
                              value={slotSelections[slot.key] ?? ""}
                              onChange={(event) =>
                                updateSlot(slot.key, event.target.value)
                              }
                              className="w-full min-w-0 rounded-lg border border-[#d7bea1] bg-white px-4 py-3 text-sm font-medium text-[#24130f] outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
                              disabled={unavailable}
                            >
                              <option value="">Choose a weekly offering</option>
                              {weeklyMenu.offerings
                                .filter((offering) =>
                                  offeringIsAvailableForSlot(offering, slot),
                                )
                                .map((offering) => (
                                  <option key={offering.id} value={offering.id}>
                                    {offering.name}
                                    {offering.dietaryInfo
                                      ? ` - ${offering.dietaryInfo}`
                                      : ""}
                                  </option>
                                ))}
                            </select>
                          </label>

                          {selectedOffering &&
                            Object.keys(groupedOptions).length > 0 && (
                              <div className="grid gap-3 rounded-lg border border-[#ead8c1] bg-white p-3">
                                {Object.entries(groupedOptions).map(
                                  ([optionType, options]) => {
                                    const label =
                                      formatWeeklyMealPlanOptionType(
                                        optionType,
                                      );
                                    const required =
                                      optionTypeRequiresSelection(optionType);
                                    const selectedByType =
                                      slotOptionSelections[slot.key] ?? {};
                                    const selectedValue =
                                      selectedByType[optionType] ??
                                      (required ? (options[0]?.id ?? "") : "");

                                    return (
                                      <label
                                        key={optionType}
                                        className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-[#6f1f12]"
                                      >
                                        {label}
                                        <select
                                          value={selectedValue}
                                          onChange={(event) =>
                                            updateSlotOption(
                                              slot.key,
                                              optionType,
                                              event.target.value,
                                            )
                                          }
                                          className="w-full min-w-0 rounded-lg border border-[#d7bea1] bg-white px-3 py-2 text-sm font-medium normal-case text-[#24130f] outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
                                          disabled={unavailable}
                                        >
                                          {!required && (
                                            <option value="">
                                              No {label.toLowerCase()}
                                            </option>
                                          )}

                                          {options.map((option) => (
                                            <option
                                              key={option.id}
                                              value={option.id}
                                            >
                                              {option.name}
                                              {option.priceDelta > 0
                                                ? ` +$${option.priceDelta.toFixed(
                                                    2,
                                                  )}`
                                                : ""}
                                              {option.requiresApproval
                                                ? " - approval required"
                                                : ""}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    );
                                  },
                                )}
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {allergenConflicts.length > 0 && (
        <div className="mt-5">
          <AllergenConflictWarning conflicts={allergenConflicts} />
        </div>
      )}

      <button
        type="button"
        onClick={addSelection}
        disabled={unavailable || missingRequiredSlots}
        className="brand-button-primary mt-5 w-full px-5 py-3 disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:text-neutral-700 disabled:shadow-none"
      >
        {unavailable
          ? "Unavailable"
          : missingRequiredSlots
            ? "Choose Every Meal"
            : "Add Weekly Plan to Order"}
      </button>

      {added && (
        <p className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-800">
          Weekly meal plan added to your order.
        </p>
      )}
    </div>
  );
}
