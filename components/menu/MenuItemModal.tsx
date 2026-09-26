"use client";

import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { MenuItem } from "@/types/menu";
import type { SelectedCartOption } from "@/store/cart-store";
import { useCartStore } from "@/store/cart-store";
import { useCustomerAllergens } from "@/hooks/useCustomerAllergens";
import { AllergenConflictWarning } from "@/components/allergens/AllergenConflictWarning";

type Props = {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
};

export function MenuItemModal({ item, open, onClose }: Props) {
  const addItem = useCartStore((state) => state.addItem);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [customerInstructions, setCustomerInstructions] = useState("");
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const { selectedAllergenIdSet } = useCustomerAllergens();

  const allergenConflicts =
    item.allergens?.filter((allergen) =>
      selectedAllergenIdSet.has(allergen.id),
    ) ?? [];

  if (!open || typeof document === "undefined") return null;

  function toggleChoice(groupId: string, choiceId: string, multiple: boolean) {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];

      const nextSelected = !multiple
        ? {
            ...prev,
            [groupId]: [choiceId],
          }
        : {
            ...prev,
            [groupId]: current.includes(choiceId)
              ? current.filter((id) => id !== choiceId)
              : [...current, choiceId],
          };

      const stillMissingRequired = item.optionGroups?.some(
        (group) => group.required && !(nextSelected[group.id]?.length > 0),
      );

      if (!stillMissingRequired) {
        setShowRequiredErrors(false);
      }

      return nextSelected;
    });
  }

  function handleAddToCart() {
    const requiredMissing = item.optionGroups?.some(
      (group) => group.required && !(selected[group.id]?.length > 0),
    );

    if (requiredMissing) {
      setShowRequiredErrors(true);
      alert("Please choose all required options.");
      return;
    }

    const selectedOptions: SelectedCartOption[] = [];

    for (const group of item.optionGroups ?? []) {
      const selectedChoiceIds = selected[group.id] ?? [];

      for (const choice of group.choices) {
        if (selectedChoiceIds.includes(choice.id)) {
          selectedOptions.push({
            groupName: group.name,
            choiceName: choice.requestOnly
              ? `${choice.name} (Request Only)`
              : choice.name,
            priceDelta: choice.priceDelta,
            requestOnly: choice.requestOnly,
          });
        }
      }
    }

    addItem(item, selectedOptions, customerInstructions);
    setSelected({});
    setCustomerInstructions("");
    setShowRequiredErrors(false);
    onClose();
  }

  const selectedOptionsTotal =
    item.optionGroups?.reduce((total, group) => {
      const selectedChoiceIds = selected[group.id] ?? [];

      return (
        total +
        group.choices
          .filter((choice) => selectedChoiceIds.includes(choice.id))
          .reduce((sum, choice) => sum + choice.priceDelta, 0)
      );
    }, 0) ?? 0;

  const displayTotal = item.price + selectedOptionsTotal;

  const selectedSummary =
    item.optionGroups?.flatMap((group) => {
      const selectedChoiceIds = selected[group.id] ?? [];

      return group.choices
        .filter((choice) => selectedChoiceIds.includes(choice.id))
        .map((choice) => ({
          groupName: group.name,
          choiceName: choice.requestOnly
            ? `${choice.name} (Request Only)`
            : choice.name,
          priceDelta: choice.priceDelta,
          requestOnly: choice.requestOnly,
        }));
    }) ?? [];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24130f]/70 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-[var(--brand-surface-soft)] p-5 shadow-2xl sm:p-6">
        {item.imageUrl && (
          <div className="relative mb-6 aspect-[16/7] overflow-hidden rounded-lg bg-[#f7ead7]">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, 896px"
              className="object-cover"
              unoptimized
            />

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#24130f]/80 to-transparent p-5 text-white">
              <p className="text-sm font-black uppercase tracking-wide">
                {item.category}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="brand-eyebrow">Menu Details</p>

            <h2 className="mt-2 text-3xl font-black leading-tight">
              {item.name}
            </h2>

            <p className="mt-2 leading-7 text-[#6b5a50]">{item.description}</p>

            {item.type === "MEAL_PLAN" && (
              <div className="mt-5 rounded-lg border border-[#d99426] bg-[#fff3cf] p-4 text-sm font-medium text-[#6f1f12]">
                Meal plans are fixed offerings. Choose spice level and allowed
                protein substitutions only. Pork and beef are available by
                request only and pricing may vary.
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[var(--brand-border)] bg-white px-3 py-1 text-sm font-bold text-[#24130f] transition hover:border-[#9f2f18]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--brand-border)] bg-white p-4">
            <p className="text-xs font-black uppercase text-[#9f2f18]">
              Starting At
            </p>
            <p className="mt-1 text-2xl font-black">
              ${item.price.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--brand-border)] bg-white p-4">
            <p className="text-xs font-black uppercase text-[#9f2f18]">
              Options
            </p>
            <p className="mt-1 font-bold">
              {item.optionGroups?.length
                ? `${item.optionGroups.length} group${
                    item.optionGroups.length === 1 ? "" : "s"
                  }`
                : "Ready as listed"}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--brand-border)] bg-white p-4">
            <p className="text-xs font-black uppercase text-[#9f2f18]">
              Allergens
            </p>
            <p className="mt-1 font-bold">
              {item.allergens?.length
                ? item.allergens.map((a) => a.name).join(", ")
                : "Ask if needed"}
            </p>
          </div>
        </div>

        {allergenConflicts.length > 0 && (
          <div className="mt-4">
            <AllergenConflictWarning conflicts={allergenConflicts} />
          </div>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {item.optionGroups?.map((group) => {
            const missingRequired =
              showRequiredErrors &&
              group.required &&
              !(selected[group.id]?.length > 0);

            return (
              <section
                key={group.id}
                className={`rounded-lg border p-5 ${
                  missingRequired
                    ? "border-red-400 bg-red-50"
                    : group.required && selected[group.id]?.length > 0
                      ? "border-green-300 bg-green-50"
                      : "border-[var(--brand-border)] bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black">{group.name}</h3>

                  {group.required && (
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                      Required
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-neutral-500">
                  {group.multiple ? "Choose one or more" : "Choose one"}
                </p>

                {missingRequired && (
                  <p className="mt-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">
                    Please make a selection for this required option.
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  {group.choices.map((choice) => {
                    const checked =
                      selected[group.id]?.includes(choice.id) ?? false;

                    return (
                      <label
                        key={choice.id}
                        className={`flex cursor-pointer gap-4 rounded-lg border p-4 transition ${
                          checked
                            ? "border-[#9f2f18] bg-[#fff3cf]"
                            : "border-[var(--brand-border)] hover:bg-[var(--brand-surface-soft)]"
                        }`}
                      >
                        <input
                          type={group.multiple ? "checkbox" : "radio"}
                          name={group.id}
                          checked={checked}
                          onChange={() =>
                            toggleChoice(group.id, choice.id, group.multiple)
                          }
                          className="mt-1"
                        />

                        {choice.imageUrl && (
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                            <Image
                              src={choice.imageUrl}
                              alt={choice.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold">{choice.name}</p>

                            <div className="flex items-center gap-2">
                              {choice.requestOnly && (
                                <span className="rounded-full bg-[#fff0bd] px-2 py-1 text-xs font-bold text-[#8a5a00]">
                                  Request Only
                                </span>
                              )}

                              {choice.priceDelta > 0 && (
                                <span className="text-sm font-medium">
                                  +${choice.priceDelta.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          {choice.description && (
                            <p className="mt-2 text-sm text-neutral-600">
                              {choice.description}
                            </p>
                          )}

                          {choice.dietaryInfo && (
                            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                              {choice.dietaryInfo}
                            </p>
                          )}

                          {choice.requestOnly && (
                            <p className="mt-2 text-xs font-medium text-[#9f2f18]">
                              This option may require chef approval and pricing
                              may vary.
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {!item.optionGroups?.length && (
            <p className="text-sm text-neutral-600">
              No customization options for this item.
            </p>
          )}
        </div>

        {item.customerInstructionsEnabled && (
          <section className="mt-6 rounded-lg border border-[var(--brand-border)] bg-white p-5">
            <label className="block font-bold">Special Instructions</label>

            <textarea
              rows={4}
              value={customerInstructions}
              onChange={(e) => setCustomerInstructions(e.target.value)}
              className="mt-3 w-full rounded-lg border border-[var(--brand-border)] px-4 py-3 text-sm outline-none transition focus:border-[#9f2f18] focus:ring-2 focus:ring-[#f4c46f]/40"
              placeholder="Share relevant preferences or notes for this item."
            />
          </section>
        )}
        {selectedSummary.length > 0 && (
          <section className="mt-6 rounded-lg border border-[var(--brand-border)] bg-white p-5">
            <h3 className="font-black">Your Selections</h3>

            <div className="mt-3 space-y-2 text-sm">
              {selectedSummary.map((selection, index) => (
                <div
                  key={`${selection.groupName}-${selection.choiceName}-${index}`}
                  className="flex flex-wrap justify-between gap-2 rounded-lg bg-[var(--brand-surface-soft)] p-3"
                >
                  <div>
                    <span className="font-medium">{selection.groupName}:</span>{" "}
                    {selection.choiceName}
                    {selection.requestOnly && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Request Only
                      </span>
                    )}
                  </div>

                  {selection.priceDelta > 0 && (
                    <span className="font-medium">
                      +${selection.priceDelta.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="mt-8 flex flex-col gap-4 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#9f2f18]">Item total</p>
            <p className="text-3xl font-black">${displayTotal.toFixed(2)}</p>
          </div>

          <button
            onClick={handleAddToCart}
            className="brand-button-primary px-6 py-3"
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
