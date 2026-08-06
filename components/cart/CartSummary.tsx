"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cart-store";
import { useCustomerAllergens } from "@/hooks/useCustomerAllergens";
import { AllergenConflictWarning } from "@/components/allergens/AllergenConflictWarning";
import { getWeeklyMealPlanSelectionDetails } from "@/lib/weekly-order-display";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

export function CartSummary() {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);
  const itemCount = useCartStore((state) => state.itemCount);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const { selectedAllergenIdSet } = useCustomerAllergens();
  const settings = useBusinessSettings();

  const deliveryFee = settings.deliveryFee;
  const lateFee = 0;
  const total = subtotal() + deliveryFee + lateFee;

  const cartAllergenConflicts = items.flatMap((item) =>
    (item.allergens ?? []).filter((allergen) =>
      selectedAllergenIdSet.has(allergen.id),
    ),
  );

  const uniqueCartAllergenConflicts = Array.from(
    new Map(
      cartAllergenConflicts.map((allergen) => [allergen.id, allergen]),
    ).values(),
  );

  if (items.length === 0) {
    return (
      <div className="brand-card p-10 text-center">
        <h2 className="text-3xl font-black">Your order is empty</h2>
        <p className="mt-3 text-[#6b5a50]">
          Add menu items to begin your order.
        </p>

        <Link href="/menu" className="brand-button-primary mt-6 px-6 py-3">
          View Meal Plans
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        {uniqueCartAllergenConflicts.length > 0 && (
          <AllergenConflictWarning conflicts={uniqueCartAllergenConflicts} />
        )}

        {items.map((item) => {
          const itemAllergenConflicts = (item.allergens ?? []).filter(
            (allergen) => selectedAllergenIdSet.has(allergen.id),
          );
          const weeklyDetails = item.weeklyMealPlanSelection
            ? getWeeklyMealPlanSelectionDetails(item.weeklyMealPlanSelection)
            : [];

          return (
            <div
              key={item.cartId}
              className="brand-card p-5 transition hover:shadow-2xl"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black leading-tight">
                    {item.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[#9f2f18]">
                    {item.category}
                  </p>
                  <p className="mt-3 font-bold text-[#24130f]">
                    ${item.price.toFixed(2)} each
                  </p>

                  {itemAllergenConflicts.length > 0 && (
                    <div className="mt-3">
                      <AllergenConflictWarning
                        conflicts={itemAllergenConflicts}
                        compact
                      />
                    </div>
                  )}

                  {weeklyDetails.length > 0 && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                      <p className="font-black">Weekly Plan Selections</p>

                      <dl className="mt-2 space-y-1">
                        {weeklyDetails.map((detail) => (
                          <div key={detail.label}>
                            <dt className="inline font-bold">
                              {detail.label}:{" "}
                            </dt>
                            <dd className="inline">{detail.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {!item.weeklyMealPlanSelection &&
                  item.selectedOptions?.length ? (
                    <ul className="mt-3 space-y-2 text-sm text-[#6b5a50]">
                      {item.selectedOptions.map((option, index) => (
                        <li
                          key={`${option.groupName}-${option.choiceName}-${index}`}
                          className="flex flex-wrap gap-2"
                        >
                          <span>
                            <span className="font-bold">
                              {option.groupName}:
                            </span>{" "}
                            {option.choiceName}
                            {option.priceDelta > 0
                              ? ` (+$${option.priceDelta.toFixed(2)})`
                              : ""}
                          </span>

                          {option.requestOnly && (
                            <span className="rounded-full bg-[#fff0bd] px-2 py-0.5 text-xs font-bold text-[#8a5a00]">
                              Request Only
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {item.requiresApproval && (
                    <div className="mt-3 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
                      This item requires chef approval before the order is
                      confirmed.
                    </div>
                  )}

                  {item.customerInstructions && (
                    <div className="mt-3 rounded-lg bg-[#fff8ee] p-3 text-sm text-[#6b5a50]">
                      <p className="font-bold">Special Instructions</p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {item.customerInstructions}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removeItem(item.cartId)}
                  className="self-start rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                >
                  Remove
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#ead8c1] pt-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => decreaseQuantity(item.cartId)}
                    aria-label={`Decrease quantity for ${item.name}`}
                    className="h-10 w-10 rounded-full border border-[#d7bea1] bg-white text-lg font-bold transition hover:border-[#9f2f18]"
                  >
                    -
                  </button>

                  <span className="w-8 text-center font-black">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => increaseQuantity(item.cartId)}
                    aria-label={`Increase quantity for ${item.name}`}
                    className="h-10 w-10 rounded-full border border-[#d7bea1] bg-white text-lg font-bold transition hover:border-[#9f2f18]"
                  >
                    +
                  </button>
                </div>

                <p className="text-lg font-black">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          );
        })}

        <button
          onClick={clearCart}
          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
        >
          Clear order
        </button>
      </section>

      <aside className="brand-card h-fit p-6 lg:sticky lg:top-28">
        <p className="brand-eyebrow">Review</p>
        <h2 className="mt-2 text-3xl font-black">Order Summary</h2>

        <div className="mt-5 space-y-3 text-sm text-[#6b5a50]">
          <div className="flex justify-between">
            <span>Items</span>
            <span className="font-bold text-[#24130f]">{itemCount()}</span>
          </div>

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-bold text-[#24130f]">
              ${subtotal().toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span className="font-bold text-[#24130f]">
              ${deliveryFee.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Late Fee</span>
            <span className="font-bold text-[#24130f]">
              ${lateFee.toFixed(2)}
            </span>
          </div>

          <div className="border-t border-[#ead8c1] pt-3 text-base font-black text-[#24130f]">
            <div className="flex justify-between">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {uniqueCartAllergenConflicts.length > 0 && (
          <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-950">
            Please review the allergen warning before continuing to checkout.
          </div>
        )}

        <Link
          href="/checkout"
          className="brand-button-primary mt-6 w-full px-5 py-3 text-center"
        >
          Continue to Checkout
        </Link>
      </aside>
    </div>
  );
}
