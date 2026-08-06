import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calculateTip } from "@/lib/order-calculations";
import { validateServerRequestedDateTime } from "@/lib/server-business-rules";
import { filterMealPlanCustomerOptionGroups } from "@/lib/meal-plan-options";
import { sendAppEmail, appUrl } from "@/lib/email";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";
import {
  getWeeklyMenuQueryDateRange,
  weeklyMenuTimeZone,
} from "@/lib/weekly-menu-dates";
import {
  isBreakfastWeeklyMealSlotLabel,
  normalizeWeeklyMealSlotLabels,
} from "@/lib/weekly-package-labels";
import { getBusinessSettings } from "@/lib/business-settings";
import { calculateLateFeeFromSettings } from "@/lib/business-rules";
import {
  formatOrderScheduleDateTime,
  getOrderScheduleLabel,
} from "@/lib/order-schedule-display";
import {
  getWeeklyOrderingWindowState,
  resolveWeeklyPeriodSchedule,
  type ResolvedWeeklyPeriodSchedule,
} from "@/lib/weekly-ordering-window";
import { resolveCheckoutFixedFulfillment } from "@/lib/checkout-fulfillment";
import type { CartItem } from "@/store/cart-store";
import type { CheckoutDetails } from "@/types/order";
import type { DecimalLike } from "@/types/display";
import type { Prisma, WeeklyMealPlanOptionType } from "@prisma/client";
import { rateLimitRequest, rateLimits } from "@/lib/rate-limit";
import {
  isManualPaymentCheckoutAllowed,
  PENDING_PAYMENT_EXPIRATION_MS,
  PAYMENT_METHOD_AWAITING_APPROVAL,
  PAYMENT_STATUS_AWAITING_APPROVAL,
  TIP_PRESET_PERCENTAGES,
} from "@/lib/payment-config";
import { createSquareClient, getSquareServerConfig } from "@/lib/square";
import {
  getSquareReadiness,
  SQUARE_CUSTOMER_UNAVAILABLE_MESSAGE,
} from "@/lib/square-readiness";

type CreateOrderRequest = {
  items?: CartItem[];
  checkout?: CheckoutDetails;
  squarePayment?: {
    sourceId?: string;
    idempotencyKey?: string;
  };
};

type CreatedOrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        weeklyMealPlanSelection: {
          include: {
            mealSlots: {
              orderBy: [
                {
                  dayNumber: "asc";
                },
                {
                  mealNumber: "asc";
                },
              ];
              include: {
                selectedOptions: {
                  orderBy: [
                    {
                      optionType: "asc";
                    },
                    {
                      createdAt: "asc";
                    },
                  ];
                };
              };
            };
          };
        };
      };
    };
  };
}>;

type CreatedOrderItem = CreatedOrderWithItems["items"][number];

type ServerMenuItem = {
  id: string;
  name: string;
  price: DecimalLike;
  type: string;
  available: boolean;
  archived: boolean;
  requiresApproval: boolean;
  customerInstructionsEnabled: boolean;
  optionGroups: {
    name: string;
    required: boolean;
    multiple: boolean;
    choices: {
      name: string;
      priceDelta: DecimalLike;
      requestOnly: boolean;
    }[];
  }[];
};

type ValidatedOrderItem = {
  menuItemId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  requiresApproval: boolean;
  notes: string | null;
  allergens: {
    id: string;
    name: string;
  }[];
  allergenConflicts: {
    id: string;
    name: string;
  }[];
  weeklySelection?: {
    weeklyMenuPeriodId: string;
    weeklyMealPlanPackageId: string;
    weeklyMealPlanOfferingId: string | null;
    periodLabel: string;
    packageName: string;
    packageDays: number;
    packageMealsPerDay: number;
    packagePrice: number;
    packageRequiresChefApproval: boolean;
    packageIsSeasonal: boolean;
    offeringName: string;
    spiceLevel: string | null;
    proteinSubstitution: string | null;
    requestOnly: boolean;
    requiresApproval: boolean;
    priceDelta: number;
    mealSlots: {
      dayNumber: number;
      mealNumber: number;
      mealLabel: string;
      weeklyMealPlanOfferingId: string;
      offeringName: string;
      offeringDescription: string | null;
      dietaryInfo: string | null;
      selectedOptions: {
        weeklyMealPlanAllowedOptionId: string;
        optionType: WeeklyMealPlanOptionType;
        optionName: string;
        optionDescription: string | null;
        dietaryInfo: string | null;
        priceDelta: number;
        requestOnly: boolean;
        requiresApproval: boolean;
      }[];
    }[];
  };
};

type ServerRecoveredOrderItem = {
  id: string;
  menuItemId: string | null;
  name: string;
  unitPrice: DecimalLike;
  notes: string | null;
  weeklyMealPlanSelection: {
    id: string;
  } | null;
  menuItem: {
    type: string;
    available: boolean;
    archived: boolean;
    requiresApproval: boolean;
  } | null;
};

function normalizeSubmittedChoiceName(choiceName: string) {
  const normalizedChoiceName = choiceName.trim();
  const requestOnlySuffix = "(Request Only)";
  const suffixStart = normalizedChoiceName.length - requestOnlySuffix.length;

  if (
    suffixStart <= 0 ||
    normalizedChoiceName.slice(suffixStart).toLowerCase() !==
      requestOnlySuffix.toLowerCase()
  ) {
    return normalizedChoiceName;
  }

  const precedingCharacter = normalizedChoiceName[suffixStart - 1];

  if (precedingCharacter.trim() !== "") return normalizedChoiceName;

  return normalizedChoiceName.slice(0, suffixStart).trimEnd();
}

function hasRequestedDateAndTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  const email = value.trim();

  if (!email || email.length > 254) return false;

  for (const character of email) {
    if (character.trim() === "") return false;
  }

  const atIndex = email.indexOf("@");

  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) return false;

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  if (!domain || localPart.length > 64 || domain.length > 253) return false;

  return (
    domain.includes(".") &&
    !domain.startsWith(".") &&
    !domain.endsWith(".") &&
    !domain.includes("..")
  );
}

class OrderSubmissionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "OrderSubmissionError";
    this.status = status;
  }
}

const allowedTipTypes = new Set([
  "none",
  ...TIP_PRESET_PERCENTAGES.map(String),
  "custom",
]);
const allowedPaymentMethods = new Set([
  "manual",
  "cash",
  "square",
  PAYMENT_METHOD_AWAITING_APPROVAL,
]);

function isSquareIdempotencyKey(value: string) {
  return /^[a-f0-9-]{36}$/i.test(value);
}

function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimitRequest(request, rateLimits.orderCreate);

  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  try {
    const session = await auth();
    const { items, checkout, squarePayment } =
      (await request.json()) as CreateOrderRequest;
    const authenticatedEmail = session?.user?.email?.trim() ?? "";
    const authenticatedUserName = session?.user?.name?.trim() ?? "";
    const isAuthenticated = Boolean(authenticatedEmail);

    const submittedSquareIdempotencyKey = String(
      squarePayment?.idempotencyKey ?? "",
    ).trim();
    const submittedSquareSourceId = String(
      squarePayment?.sourceId ?? "",
    ).trim();

    if (submittedSquareIdempotencyKey) {
      if (!isSquareIdempotencyKey(submittedSquareIdempotencyKey)) {
        return NextResponse.json(
          { error: "Invalid Square payment request identifier." },
          { status: 400 },
        );
      }

      const existingAttempt = await prisma.paymentAttempt.findUnique({
        where: { idempotencyKey: submittedSquareIdempotencyKey },
        include: { order: true },
      });

      if (existingAttempt) {
        if (existingAttempt.websiteStatus === "PAID" && existingAttempt.order) {
          return NextResponse.json({
            ...existingAttempt.order,
            guestCheckout: !isAuthenticated,
            orderUrl: isAuthenticated
              ? `/orders/${existingAttempt.order.id}`
              : null,
          });
        }

        return NextResponse.json(
          {
            error:
              "This payment request is already being processed. No second charge was attempted.",
          },
          { status: 409 },
        );
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order must include at least one item." },
        { status: 400 },
      );
    }

    if (!checkout) {
      return NextResponse.json(
        { error: "Checkout details are required." },
        { status: 400 },
      );
    }

    const allowedOrderTypes = ["delivery", "pickup"];

    if (!allowedOrderTypes.includes(checkout.orderType)) {
      return NextResponse.json(
        { error: "Invalid order type." },
        { status: 400 },
      );
    }

    const contact = {
      name: String(checkout.name ?? "").trim(),
      phone: String(checkout.phone ?? "").trim(),
      addressLine1: String(checkout.addressLine1 ?? "").trim(),
      addressLine2: String(checkout.addressLine2 ?? "").trim(),
      city: String(checkout.city ?? "").trim(),
      state: String(checkout.state ?? "").trim(),
      postalCode: String(checkout.postalCode ?? "").trim(),
      deliveryNotes: String(checkout.deliveryNotes ?? "").trim(),
    };
    const guestEmail = normalizeEmail(String(checkout.email ?? ""));
    const customerEmail = isAuthenticated ? authenticatedEmail : guestEmail;

    if (!isAuthenticated) {
      if (!guestEmail) {
        return NextResponse.json(
          { error: "Guest checkout requires an email address." },
          { status: 400 },
        );
      }

      if (!isValidEmail(guestEmail)) {
        return NextResponse.json(
          { error: "Please enter a valid email address." },
          { status: 400 },
        );
      }
    }

    const businessSettings = await getBusinessSettings();
    const orderSubmissionTime = new Date();
    const hasWeeklyMealPlanItems = items.some((item) =>
      Boolean(item.weeklyMealPlanSelection),
    );
    const hasNonWeeklyItems = items.some(
      (item) => !item.weeklyMealPlanSelection,
    );
    let requestedDate: Date | null = null;
    let weeklySchedule: ResolvedWeeklyPeriodSchedule | null = null;

    if (checkout.orderType === "delivery") {
      if (
        !contact.name ||
        !contact.phone ||
        !contact.addressLine1 ||
        !contact.city ||
        !contact.state ||
        !contact.postalCode
      ) {
        return NextResponse.json(
          {
            error:
              "Delivery orders require name, phone number, address, city, state, and postal code.",
          },
          { status: 400 },
        );
      }
    }

    if (checkout.orderType === "pickup" && (!contact.name || !contact.phone)) {
      return NextResponse.json(
        { error: "Pickup orders require your name and phone number." },
        { status: 400 },
      );
    }

    if (!allowedTipTypes.has(checkout.tipType)) {
      return NextResponse.json(
        { error: "Invalid tip selection." },
        { status: 400 },
      );
    }

    const customTipAmount =
      checkout.tipType === "custom" ? Number(checkout.customTipAmount ?? 0) : 0;

    if (!Number.isFinite(customTipAmount) || customTipAmount < 0) {
      return NextResponse.json(
        { error: "Custom tip amount must be zero or greater." },
        { status: 400 },
      );
    }

    if (!allowedPaymentMethods.has(checkout.paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid or unavailable payment method." },
        { status: 400 },
      );
    }

    if (
      checkout.paymentMethod !== PAYMENT_METHOD_AWAITING_APPROVAL &&
      checkout.paymentMethod !== "square" &&
      !isManualPaymentCheckoutAllowed()
    ) {
      return NextResponse.json(
        {
          error:
            "Manual and offline checkout are available only in explicitly enabled development or test environments.",
        },
        { status: 400 },
      );
    }

    let payByDate: Date | null = null;

    if (checkout.paymentMethod === "manual") {
      if (!checkout.payByDate) {
        return NextResponse.json(
          { error: "Manual payment orders require a pay-by date." },
          { status: 400 },
        );
      }

      payByDate = new Date(checkout.payByDate);

      if (Number.isNaN(payByDate.getTime())) {
        return NextResponse.json(
          { error: "Manual payment orders require a valid pay-by date." },
          { status: 400 },
        );
      }
    }

    const liveMenuItemIds = Array.from(
      new Set(
        items
          .filter((item) => item.category !== "Reorder")
          .map((item) => item.menuItemId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const liveMenuItems = (await prisma.menuItem.findMany({
      where: {
        id: {
          in: liveMenuItemIds,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        type: true,
        available: true,
        archived: true,
        requiresApproval: true,
        customerInstructionsEnabled: true,
        optionGroups: {
          select: {
            name: true,
            required: true,
            multiple: true,
            choices: {
              select: {
                name: true,
                priceDelta: true,
                requestOnly: true,
              },
            },
          },
        },
      },
    })) as ServerMenuItem[];

    const liveMenuItemById = new Map(
      liveMenuItems.map((item) => [item.id, item]),
    );

    const recoveredOrderItemIds = Array.from(
      new Set(
        items
          .filter((item) => item.category === "Reorder")
          .map((item) => item.recoveredOrderItemId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const recoveredOrderItems = isAuthenticated
      ? ((await prisma.orderItem.findMany({
          where: {
            id: {
              in: recoveredOrderItemIds,
            },
            order: {
              user: {
                email: customerEmail,
              },
            },
          },
          select: {
            id: true,
            menuItemId: true,
            name: true,
            unitPrice: true,
            notes: true,
            weeklyMealPlanSelection: {
              select: {
                id: true,
              },
            },
            menuItem: {
              select: {
                type: true,
                available: true,
                archived: true,
                requiresApproval: true,
              },
            },
          },
        })) as ServerRecoveredOrderItem[])
      : [];

    const recoveredOrderItemById = new Map(
      recoveredOrderItems.map((item) => [item.id, item]),
    );

    const validatedItems: ValidatedOrderItem[] = [];

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json(
          {
            error:
              "Order item quantities must be whole numbers greater than zero.",
          },
          { status: 400 },
        );
      }

      if (item.weeklyMealPlanSelection) {
        const selection = item.weeklyMealPlanSelection;
        const { dayStart: todayStart } =
          getWeeklyMenuQueryDateRange(orderSubmissionTime);

        if (
          !selection.weeklyMenuPeriodId ||
          !selection.weeklyMealPlanPackageId ||
          !Array.isArray(selection.mealSlots)
        ) {
          return NextResponse.json(
            { error: "Weekly meal plan selections are incomplete." },
            { status: 400 },
          );
        }

        const submittedSlots = selection.mealSlots;
        const submittedSlotOfferingIds = Array.from(
          new Set(
            submittedSlots
              .map((slot) => String(slot.weeklyMealPlanOfferingId ?? "").trim())
              .filter(Boolean),
          ),
        );

        const weeklyPeriod = await prisma.weeklyMenuPeriod.findUnique({
          where: {
            id: selection.weeklyMenuPeriodId,
          },
          include: {
            packages: {
              where: {
                id: selection.weeklyMealPlanPackageId,
                available: true,
              },
            },
            offerings: {
              where: {
                id: {
                  in: submittedSlotOfferingIds,
                },
                available: true,
              },
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
        });

        if (!weeklyPeriod || weeklyPeriod.status !== "PUBLISHED") {
          return NextResponse.json(
            { error: "This weekly meal plan is no longer available." },
            { status: 400 },
          );
        }

        if (weeklyPeriod.endDate < todayStart) {
          return NextResponse.json(
            { error: "This weekly meal plan is no longer available." },
            { status: 400 },
          );
        }

        const resolvedSchedule = resolveWeeklyPeriodSchedule({
          period: weeklyPeriod,
          settings: businessSettings,
          timeZone: weeklyMenuTimeZone,
        });
        const windowState = getWeeklyOrderingWindowState({
          now: orderSubmissionTime,
          schedule: resolvedSchedule,
          lateFee: businessSettings.lateFee,
        });

        if (!windowState.allowed) {
          return NextResponse.json(
            { error: windowState.message },
            { status: 400 },
          );
        }

        if (
          hasNonWeeklyItems &&
          (!resolvedSchedule.customerSchedulingEnabled ||
            !businessSettings.checkoutCustomerSchedulingEnabled)
        ) {
          return NextResponse.json(
            {
              error:
                "Weekly meal plan items must be checked out separately from regular menu items during fixed Sunday fulfillment.",
            },
            { status: 400 },
          );
        }

        weeklySchedule = resolvedSchedule;

        const selectedPackage = weeklyPeriod.packages[0];

        if (!selectedPackage) {
          return NextResponse.json(
            {
              error:
                "One or more weekly meal plan selections are no longer available.",
            },
            { status: 400 },
          );
        }

        const requiredSlotCount =
          selectedPackage.days * selectedPackage.mealsPerDay;
        const trustedMealSlotLabels = normalizeWeeklyMealSlotLabels(
          selectedPackage.mealSlotLabels,
          selectedPackage.mealsPerDay,
        );

        if (submittedSlots.length !== requiredSlotCount) {
          return NextResponse.json(
            {
              error: `Please choose all ${requiredSlotCount} weekly meal selections.`,
            },
            { status: 400 },
          );
        }

        const offeringById = new Map(
          weeklyPeriod.offerings.map((offering) => [offering.id, offering]),
        );
        const seenSlotKeys = new Set<string>();
        const validatedMealSlots: NonNullable<
          ValidatedOrderItem["weeklySelection"]
        >["mealSlots"] = [];
        const slotAllergensById = new Map<
          string,
          { id: string; name: string }
        >();
        let optionPriceDelta = 0;
        let hasRequestOnlyOption = false;
        let hasApprovalRequiredOption = false;

        for (const slot of submittedSlots) {
          const dayNumber = Number(slot.dayNumber);
          const mealNumber = Number(slot.mealNumber);
          const weeklyMealPlanOfferingId = String(
            slot.weeklyMealPlanOfferingId ?? "",
          ).trim();
          const selectedSlotOptions = Array.isArray(slot.selectedOptions)
            ? slot.selectedOptions
            : [];
          const slotKey = `${dayNumber}:${mealNumber}`;

          if (
            !Number.isInteger(dayNumber) ||
            !Number.isInteger(mealNumber) ||
            dayNumber < 1 ||
            dayNumber > selectedPackage.days ||
            mealNumber < 1 ||
            mealNumber > selectedPackage.mealsPerDay
          ) {
            return NextResponse.json(
              { error: "One or more weekly meal slots are invalid." },
              { status: 400 },
            );
          }

          if (seenSlotKeys.has(slotKey)) {
            return NextResponse.json(
              { error: "Duplicate weekly meal slots are not allowed." },
              { status: 400 },
            );
          }

          seenSlotKeys.add(slotKey);

          const selectedOffering = offeringById.get(weeklyMealPlanOfferingId);

          if (!selectedOffering) {
            return NextResponse.json(
              {
                error:
                  "One or more selected weekly meals are no longer available.",
              },
              { status: 400 },
            );
          }

          selectedOffering.allergens.forEach((entry) => {
            slotAllergensById.set(entry.allergen.id, {
              id: entry.allergen.id,
              name: entry.allergen.name,
            });
          });

          const trustedMealLabel =
            trustedMealSlotLabels[mealNumber - 1] ?? `Meal ${mealNumber}`;

          if (
            selectedOffering.breakfastOnly &&
            !isBreakfastWeeklyMealSlotLabel(trustedMealLabel)
          ) {
            return NextResponse.json(
              {
                error:
                  "One or more selected weekly meals are not available for that meal slot.",
              },
              { status: 400 },
            );
          }

          const optionsById = new Map(
            selectedOffering.options.map((option) => [option.id, option]),
          );
          const optionsByType = selectedOffering.options.reduce<
            Record<string, typeof selectedOffering.options>
          >((groups, option) => {
            groups[option.optionType] = [
              ...(groups[option.optionType] ?? []),
              option,
            ];

            return groups;
          }, {});
          const seenOptionTypes = new Set<string>();
          const validatedSlotOptions: NonNullable<
            ValidatedOrderItem["weeklySelection"]
          >["mealSlots"][number]["selectedOptions"] = [];

          if (
            optionsByType.SPICE_LEVEL?.length &&
            !selectedSlotOptions.some((option) => {
              const optionId = String(
                option.weeklyMealPlanAllowedOptionId ?? "",
              ).trim();

              return optionsById.get(optionId)?.optionType === "SPICE_LEVEL";
            })
          ) {
            return NextResponse.json(
              {
                error:
                  "Please choose a spice level for every weekly meal slot.",
              },
              { status: 400 },
            );
          }

          for (const selectedSlotOption of selectedSlotOptions) {
            const weeklyMealPlanAllowedOptionId = String(
              selectedSlotOption.weeklyMealPlanAllowedOptionId ?? "",
            ).trim();
            const selectedOption = optionsById.get(
              weeklyMealPlanAllowedOptionId,
            );

            if (!selectedOption) {
              return NextResponse.json(
                {
                  error:
                    "One or more selected weekly meal options are no longer available.",
                },
                { status: 400 },
              );
            }

            if (seenOptionTypes.has(selectedOption.optionType)) {
              return NextResponse.json(
                {
                  error:
                    "Only one weekly meal option can be selected for each option type.",
                },
                { status: 400 },
              );
            }

            seenOptionTypes.add(selectedOption.optionType);
            optionPriceDelta += Number(selectedOption.priceDelta);
            hasRequestOnlyOption =
              hasRequestOnlyOption || selectedOption.requestOnly;
            hasApprovalRequiredOption =
              hasApprovalRequiredOption ||
              selectedOption.requestOnly ||
              selectedOption.requiresApproval;

            validatedSlotOptions.push({
              weeklyMealPlanAllowedOptionId: selectedOption.id,
              optionType: selectedOption.optionType,
              optionName: selectedOption.name,
              optionDescription: selectedOption.description,
              dietaryInfo: selectedOption.dietaryInfo,
              priceDelta: Number(selectedOption.priceDelta),
              requestOnly: selectedOption.requestOnly,
              requiresApproval: selectedOption.requiresApproval,
            });
          }

          validatedMealSlots.push({
            dayNumber,
            mealNumber,
            mealLabel: trustedMealLabel,
            weeklyMealPlanOfferingId: selectedOffering.id,
            offeringName: selectedOffering.name,
            offeringDescription: selectedOffering.description,
            dietaryInfo: selectedOffering.dietaryInfo,
            selectedOptions: validatedSlotOptions,
          });
        }

        if (seenSlotKeys.size !== requiredSlotCount) {
          return NextResponse.json(
            {
              error: `Please choose all ${requiredSlotCount} weekly meal selections.`,
            },
            { status: 400 },
          );
        }

        const priceDelta = optionPriceDelta;
        const unitPrice = Number(selectedPackage.price) + priceDelta;

        if (Math.abs(Number(item.price) - unitPrice) > 0.01) {
          return NextResponse.json(
            {
              error:
                "Your weekly meal plan price has changed. Please refresh your cart and try again.",
            },
            { status: 400 },
          );
        }

        const requiresApproval =
          selectedPackage.requiresChefApproval || hasApprovalRequiredOption;
        const requestOnly =
          selectedPackage.requiresChefApproval || hasRequestOnlyOption;
        const weeklySelectionNote = `${requiredSlotCount} weekly meal selections saved.`;

        validatedItems.push({
          menuItemId: null,
          name: `${selectedPackage.name} - Build Your Weekly Plan`,
          quantity,
          unitPrice,
          lineTotal: unitPrice * quantity,
          requiresApproval,
          notes: weeklySelectionNote,
          allergens: Array.from(slotAllergensById.values()),
          allergenConflicts: [],
          weeklySelection: {
            weeklyMenuPeriodId: weeklyPeriod.id,
            weeklyMealPlanPackageId: selectedPackage.id,
            weeklyMealPlanOfferingId: null,
            periodLabel: weeklyPeriod.label,
            packageName: selectedPackage.name,
            packageDays: selectedPackage.days,
            packageMealsPerDay: selectedPackage.mealsPerDay,
            packagePrice: Number(selectedPackage.price),
            packageRequiresChefApproval: selectedPackage.requiresChefApproval,
            packageIsSeasonal: selectedPackage.isSeasonal,
            offeringName: "Build Your Weekly Plan",
            spiceLevel: null,
            proteinSubstitution: null,
            requestOnly,
            requiresApproval,
            priceDelta,
            mealSlots: validatedMealSlots,
          },
        });

        continue;
      }

      if (item.category === "Reorder") {
        if (!isAuthenticated) {
          return NextResponse.json(
            { error: "Please sign in to reorder previous items." },
            { status: 401 },
          );
        }

        if (!item.recoveredOrderItemId) {
          return NextResponse.json(
            {
              error: "Reorder items must include a valid previous order item.",
            },
            { status: 400 },
          );
        }

        const recoveredItem = recoveredOrderItemById.get(
          item.recoveredOrderItemId,
        );

        if (!recoveredItem) {
          return NextResponse.json(
            { error: "One or more reorder items could not be verified." },
            { status: 400 },
          );
        }

        if (recoveredItem.weeklyMealPlanSelection) {
          return NextResponse.json(
            {
              error:
                "Weekly meal plan items must be ordered from the current weekly menu.",
            },
            { status: 400 },
          );
        }

        const unitPrice = Number(recoveredItem.unitPrice);
        const name = recoveredItem.name.trim();

        if (!name || !Number.isFinite(unitPrice) || unitPrice < 0) {
          return NextResponse.json(
            {
              error: "Reorder items must include a valid saved name and price.",
            },
            { status: 400 },
          );
        }

        if (recoveredItem.menuItem?.type === "CATERING") {
          return NextResponse.json(
            { error: "Catering items must be submitted as service requests." },
            { status: 400 },
          );
        }

        if (
          recoveredItem.menuItem &&
          (!recoveredItem.menuItem.available || recoveredItem.menuItem.archived)
        ) {
          return NextResponse.json(
            { error: `${name} is no longer available for reorder.` },
            { status: 400 },
          );
        }

        validatedItems.push({
          menuItemId: recoveredItem.menuItemId,
          name,
          quantity,
          unitPrice,
          lineTotal: unitPrice * quantity,
          requiresApproval:
            Boolean(recoveredItem.menuItem?.requiresApproval) ||
            (recoveredItem.notes?.includes("(Request Only)") ?? false),
          notes:
            [
              recoveredItem.notes,
              item.customerInstructions
                ? `Special Instructions: ${item.customerInstructions}`
                : null,
            ]
              .filter(Boolean)
              .join("\n") || null,
          allergens: [],
          allergenConflicts: [],
        });

        continue;
      }

      if (!item.menuItemId) {
        return NextResponse.json(
          { error: "Cart items must include a valid menu item." },
          { status: 400 },
        );
      }

      const menuItem = liveMenuItemById.get(item.menuItemId);

      if (!menuItem) {
        return NextResponse.json(
          { error: "One or more cart items are no longer available." },
          { status: 400 },
        );
      }

      if (menuItem.type === "CATERING") {
        return NextResponse.json(
          { error: "Catering items must be submitted as service requests." },
          { status: 400 },
        );
      }

      if (!menuItem.available || menuItem.archived) {
        return NextResponse.json(
          { error: `${menuItem.name} is no longer available.` },
          { status: 400 },
        );
      }

      const selectedOptions = item.selectedOptions ?? [];
      const customerOptionGroups = filterMealPlanCustomerOptionGroups(
        menuItem.type,
        menuItem.optionGroups,
      );
      const selectedByGroup = new Map<string, string[]>();
      const seenSelections = new Set<string>();
      let unitPrice = Number(menuItem.price);
      let itemRequiresApproval = menuItem.requiresApproval;
      const optionNotes: string[] = [];

      for (const option of selectedOptions) {
        const groupName = String(option.groupName ?? "").trim();
        const choiceName = normalizeSubmittedChoiceName(
          String(option.choiceName ?? ""),
        );

        const group = customerOptionGroups.find(
          (entry) => entry.name === groupName,
        );

        const choice = group?.choices.find(
          (entry) => entry.name === choiceName,
        );

        if (!group || !choice) {
          return NextResponse.json(
            { error: "One or more selected options are no longer available." },
            { status: 400 },
          );
        }

        const selectionKey = `${group.name}:${choice.name}`;

        if (seenSelections.has(selectionKey)) {
          return NextResponse.json(
            { error: "Duplicate option selections are not allowed." },
            { status: 400 },
          );
        }

        seenSelections.add(selectionKey);
        selectedByGroup.set(group.name, [
          ...(selectedByGroup.get(group.name) ?? []),
          choice.name,
        ]);

        const priceDelta = Number(choice.priceDelta);

        unitPrice += priceDelta;
        itemRequiresApproval = itemRequiresApproval || choice.requestOnly;
        optionNotes.push(
          `${group.name}: ${
            choice.requestOnly ? `${choice.name} (Request Only)` : choice.name
          }${priceDelta > 0 ? ` (+$${priceDelta.toFixed(2)})` : ""}`,
        );
      }

      for (const group of customerOptionGroups) {
        const selectedChoices = selectedByGroup.get(group.name) ?? [];

        if (group.required && selectedChoices.length === 0) {
          return NextResponse.json(
            { error: `Please select an option for ${group.name}.` },
            { status: 400 },
          );
        }

        if (!group.multiple && selectedChoices.length > 1) {
          return NextResponse.json(
            { error: `${group.name} allows only one selection.` },
            { status: 400 },
          );
        }
      }

      if (Math.abs(Number(item.price) - unitPrice) > 0.01) {
        return NextResponse.json(
          {
            error:
              "Your cart prices have changed. Please refresh your cart and try again.",
          },
          { status: 400 },
        );
      }

      validatedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
        requiresApproval: itemRequiresApproval,
        notes:
          [
            ...optionNotes,
            menuItem.customerInstructionsEnabled && item.customerInstructions
              ? `Special Instructions: ${item.customerInstructions}`
              : null,
          ]
            .filter(Boolean)
            .join("\n") || null,
        allergens: [],
        allergenConflicts: [],
      });
    }

    const fixedWeeklySchedule =
      hasWeeklyMealPlanItems &&
      weeklySchedule &&
      (!weeklySchedule.customerSchedulingEnabled ||
        !businessSettings.checkoutCustomerSchedulingEnabled)
        ? weeklySchedule
        : null;
    const fixedCheckoutFulfillment =
      !businessSettings.checkoutCustomerSchedulingEnabled
        ? resolveCheckoutFixedFulfillment({
            settings: businessSettings,
            now: orderSubmissionTime,
            timeZone: weeklyMenuTimeZone,
          })
        : null;

    if (fixedWeeklySchedule) {
      requestedDate = fixedWeeklySchedule.fixedFulfillmentAt;
    } else if (fixedCheckoutFulfillment) {
      requestedDate = fixedCheckoutFulfillment.fixedFulfillmentAt;
    } else {
      if (!hasRequestedDateAndTime(checkout.requestedDateTime ?? "")) {
        return NextResponse.json(
          { error: "Please choose a requested date and time." },
          { status: 400 },
        );
      }

      requestedDate = new Date(checkout.requestedDateTime);

      if (Number.isNaN(requestedDate.getTime())) {
        return NextResponse.json(
          { error: "Please choose a valid requested date and time." },
          { status: 400 },
        );
      }

      const requestedDateValidation = await validateServerRequestedDateTime(
        checkout.requestedDateTime,
      );

      if (!requestedDateValidation.valid) {
        return NextResponse.json(
          { error: requestedDateValidation.error },
          { status: 400 },
        );
      }
    }

    if (!requestedDate) {
      return NextResponse.json(
        { error: "Unable to determine order fulfillment date." },
        { status: 400 },
      );
    }

    const userAllergens = isAuthenticated
      ? await prisma.userAllergen.findMany({
          where: {
            user: {
              email: customerEmail,
            },
          },
          select: {
            allergenId: true,
          },
        })
      : [];

    const userAllergenIds = new Set(
      userAllergens.map((entry) => entry.allergenId),
    );

    const submittedMenuItemIds = validatedItems
      .map((item) => item.menuItemId)
      .filter((id): id is string => Boolean(id));

    const submittedMenuItemAllergens =
      submittedMenuItemIds.length > 0
        ? await prisma.menuItemAllergen.findMany({
            where: {
              menuItemId: {
                in: submittedMenuItemIds,
              },
            },
            select: {
              menuItemId: true,
              allergen: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })
        : [];

    const menuAllergensByItemId = new Map<
      string,
      { id: string; name: string }[]
    >();

    for (const entry of submittedMenuItemAllergens) {
      menuAllergensByItemId.set(entry.menuItemId, [
        ...(menuAllergensByItemId.get(entry.menuItemId) ?? []),
        entry.allergen,
      ]);
    }

    for (const item of validatedItems) {
      const menuAllergens = item.menuItemId
        ? (menuAllergensByItemId.get(item.menuItemId) ?? [])
        : [];
      const itemAllergens = [...item.allergens, ...menuAllergens];

      item.allergens = itemAllergens;
      item.allergenConflicts = itemAllergens.filter((allergen) =>
        userAllergenIds.has(allergen.id),
      );
    }

    const hasAllergenConflict = validatedItems.some(
      (item) => item.allergenConflicts.length > 0,
    );

    if (hasAllergenConflict && !checkout.allergenAcknowledged) {
      return NextResponse.json(
        {
          error:
            "Please acknowledge the allergen warning before submitting your order.",
        },
        { status: 400 },
      );
    }
    const subtotal = validatedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );

    const deliveryFee =
      checkout.orderType === "delivery" ? businessSettings.deliveryFee : 0;
    const weeklyWindowState = weeklySchedule
      ? getWeeklyOrderingWindowState({
          now: orderSubmissionTime,
          schedule: weeklySchedule,
          lateFee: businessSettings.lateFee,
        })
      : null;
    const lateFee = weeklyWindowState
      ? weeklyWindowState.lateFeeAmount
      : calculateLateFeeFromSettings({
          lateFee: businessSettings.lateFee,
          cutoffDay: businessSettings.orderCutoffDay,
          cutoffHour: businessSettings.orderCutoffHour,
          cutoffMinute: businessSettings.orderCutoffMinute,
          timeZone: weeklyMenuTimeZone,
        });

    const tipAmount = calculateTip(subtotal, checkout.tipType, customTipAmount);

    const total = subtotal + deliveryFee + lateFee + tipAmount;
    const requiresApproval = validatedItems.some(
      (item) => item.requiresApproval,
    );
    const usesSquare = checkout.paymentMethod === "square";
    const squareReadiness = usesSquare ? getSquareReadiness() : null;

    if (
      (requiresApproval &&
        checkout.paymentMethod !== PAYMENT_METHOD_AWAITING_APPROVAL) ||
      (!requiresApproval &&
        checkout.paymentMethod === PAYMENT_METHOD_AWAITING_APPROVAL)
    ) {
      return NextResponse.json(
        {
          error:
            "The selected payment workflow does not match this order's approval requirements.",
        },
        { status: 400 },
      );
    }

    if (usesSquare) {
      try {
        getSquareServerConfig();
      } catch {
        return NextResponse.json(
          { error: SQUARE_CUSTOMER_UNAVAILABLE_MESSAGE },
          { status: 503 },
        );
      }

      if (
        !submittedSquareSourceId ||
        !submittedSquareIdempotencyKey ||
        !isSquareIdempotencyKey(submittedSquareIdempotencyKey)
      ) {
        return NextResponse.json(
          { error: "Payment details are required." },
          { status: 400 },
        );
      }
    }

    const allergenAcknowledgedAt =
      hasAllergenConflict && checkout.allergenAcknowledged ? new Date() : null;
    const weeklyPeriodIds = Array.from(
      new Set(
        validatedItems
          .map((item) => item.weeklySelection?.weeklyMenuPeriodId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (weeklyPeriodIds.length > 1) {
      return NextResponse.json(
        {
          error:
            "Weekly meal plan items must belong to the same current weekly menu.",
        },
        { status: 400 },
      );
    }

    const order: CreatedOrderWithItems = await prisma.$transaction(
      async (tx) => {
        for (const weeklyPeriodId of weeklyPeriodIds) {
          const updatedCount = await tx.$executeRaw`
          UPDATE \`WeeklyMenuPeriod\`
          SET \`ordersPlaced\` = \`ordersPlaced\` + 1
          WHERE \`id\` = ${weeklyPeriodId}
            AND \`status\` = 'PUBLISHED'
            AND \`ordersPlaced\` < \`capacity\`
        `;

          if (updatedCount !== 1) {
            throw new OrderSubmissionError(
              "This weekly menu has reached capacity or is no longer available.",
            );
          }
        }

        const createdOrder = await tx.order.create({
          data: {
            ...(isAuthenticated
              ? {
                  user: {
                    connect: {
                      email: customerEmail,
                    },
                  },
                }
              : {}),

            customerName: contact.name || authenticatedUserName || "Customer",
            customerEmail,
            customerPhone: contact.phone || null,

            orderType:
              checkout.orderType === "delivery" ? "DELIVERY" : "PICKUP",

            status: requiresApproval || usesSquare ? "PENDING" : "ACCEPTED",
            approvalStatus: requiresApproval ? "PENDING" : "APPROVED",
            approvedAt: requiresApproval ? null : new Date(),

            requestedDateTime: requestedDate,

            allergyNotes: checkout.allergyNotes,
            substitutionPreference: checkout.substitutionPreference,

            allergenAcknowledged: hasAllergenConflict
              ? Boolean(checkout.allergenAcknowledged)
              : false,
            allergenAcknowledgedAt,

            subtotal,
            deliveryFee,
            lateFee,
            tipAmount,
            total,

            deliveryName: contact.name || authenticatedUserName || null,
            deliveryPhone: contact.phone || null,
            deliveryAddressLine1: contact.addressLine1 || null,
            deliveryAddressLine2: contact.addressLine2 || null,
            deliveryCity: contact.city || null,
            deliveryState: contact.state || null,
            deliveryPostalCode: contact.postalCode || null,
            deliveryNotes: contact.deliveryNotes || null,

            payByDate,
            paymentProvider:
              checkout.paymentMethod === PAYMENT_METHOD_AWAITING_APPROVAL
                ? null
                : checkout.paymentMethod,
            paymentStatus:
              checkout.paymentMethod === PAYMENT_METHOD_AWAITING_APPROVAL
                ? PAYMENT_STATUS_AWAITING_APPROVAL
                : usesSquare
                  ? "PAYMENT_PENDING"
                  : checkout.paymentMethod === "cash"
                    ? "OFFLINE_PAYMENT_DUE"
                    : "PAY_BY_DATE",

            items: {
              create: validatedItems.map((item) => ({
                menuItemId: item.menuItemId,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
                notes: item.notes,
                allergenAcknowledged:
                  item.allergenConflicts.length > 0
                    ? Boolean(checkout.allergenAcknowledged)
                    : false,
                allergenAcknowledgedAt:
                  item.allergenConflicts.length > 0
                    ? allergenAcknowledgedAt
                    : null,
                allergenConflictSnapshot:
                  item.allergenConflicts.length > 0
                    ? item.allergenConflicts
                    : undefined,
                weeklyMealPlanSelection: item.weeklySelection
                  ? {
                      create: {
                        weeklyMenuPeriodId:
                          item.weeklySelection.weeklyMenuPeriodId,
                        weeklyMealPlanPackageId:
                          item.weeklySelection.weeklyMealPlanPackageId,
                        weeklyMealPlanOfferingId:
                          item.weeklySelection.weeklyMealPlanOfferingId,
                        periodLabel: item.weeklySelection.periodLabel,
                        packageName: item.weeklySelection.packageName,
                        packageDays: item.weeklySelection.packageDays,
                        packageMealsPerDay:
                          item.weeklySelection.packageMealsPerDay,
                        packagePrice: item.weeklySelection.packagePrice,
                        packageRequiresChefApproval:
                          item.weeklySelection.packageRequiresChefApproval,
                        packageIsSeasonal:
                          item.weeklySelection.packageIsSeasonal,
                        offeringName: item.weeklySelection.offeringName,
                        spiceLevel: item.weeklySelection.spiceLevel,
                        proteinSubstitution:
                          item.weeklySelection.proteinSubstitution,
                        requestOnly: item.weeklySelection.requestOnly,
                        requiresApproval: item.weeklySelection.requiresApproval,
                        priceDelta: item.weeklySelection.priceDelta,
                        mealSlots: {
                          create: item.weeklySelection.mealSlots.map(
                            (slot) => ({
                              dayNumber: slot.dayNumber,
                              mealNumber: slot.mealNumber,
                              mealLabel: slot.mealLabel,
                              weeklyMealPlanOfferingId:
                                slot.weeklyMealPlanOfferingId,
                              offeringName: slot.offeringName,
                              offeringDescription: slot.offeringDescription,
                              dietaryInfo: slot.dietaryInfo,
                              selectedOptions: {
                                create: slot.selectedOptions.map((option) => ({
                                  weeklyMealPlanAllowedOptionId:
                                    option.weeklyMealPlanAllowedOptionId,
                                  optionType: option.optionType,
                                  optionName: option.optionName,
                                  optionDescription: option.optionDescription,
                                  dietaryInfo: option.dietaryInfo,
                                  priceDelta: option.priceDelta,
                                  requestOnly: option.requestOnly,
                                  requiresApproval: option.requiresApproval,
                                })),
                              },
                            }),
                          ),
                        },
                      },
                    }
                  : undefined,
              })),
            },

            statusHistory: {
              create: {
                status: requiresApproval || usesSquare ? "PENDING" : "ACCEPTED",
                note: requiresApproval
                  ? "Order created and waiting for approval."
                  : usesSquare
                    ? "Order created with a pending Square payment."
                    : "Order created and auto-approved.",
              },
            },
          },

          include: {
            items: {
              include: {
                weeklyMealPlanSelection: {
                  include: {
                    mealSlots: {
                      orderBy: [
                        {
                          dayNumber: "asc",
                        },
                        {
                          mealNumber: "asc",
                        },
                      ],
                      include: {
                        selectedOptions: {
                          orderBy: [
                            {
                              optionType: "asc",
                            },
                            {
                              createdAt: "asc",
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (usesSquare) {
          await tx.paymentAttempt.create({
            data: {
              provider: "SQUARE",
              websiteStatus: "PENDING",
              providerStatus: "PENDING",
              paymentPurpose: "ORDER_TOTAL",
              amountCents: dollarsToCents(total),
              tipCents: dollarsToCents(tipAmount),
              currency: "USD",
              idempotencyKey: submittedSquareIdempotencyKey,
              orderId: createdOrder.id,
              expiresAt: new Date(
                orderSubmissionTime.getTime() + PENDING_PAYMENT_EXPIRATION_MS,
              ),
              metadata: {
                environment: squareReadiness?.environment ?? "invalid",
                checkout: "standard",
              },
            },
          });
        }

        return createdOrder;
      },
    );

    if (usesSquare) {
      const squareConfig = getSquareServerConfig();

      try {
        const paymentResponse = await createSquareClient().payments.create({
          sourceId: submittedSquareSourceId,
          idempotencyKey: submittedSquareIdempotencyKey,
          amountMoney: {
            amount: BigInt(dollarsToCents(total - tipAmount)),
            currency: "USD",
          },
          ...(tipAmount > 0
            ? {
                tipMoney: {
                  amount: BigInt(dollarsToCents(tipAmount)),
                  currency: "USD" as const,
                },
              }
            : {}),
          autocomplete: true,
          locationId: squareConfig.locationId,
          referenceId: order.id.slice(0, 40),
          note: `Website standard order ${order.id}`,
        });
        const payment = paymentResponse.payment;
        const paidAt =
          payment?.status === "COMPLETED"
            ? new Date(payment.updatedAt ?? payment.createdAt ?? Date.now())
            : null;

        if (!payment?.id || !paidAt) {
          await prisma.paymentAttempt.update({
            where: { idempotencyKey: submittedSquareIdempotencyKey },
            data: {
              providerPaymentId: payment?.id ?? null,
              providerStatus: payment?.status ?? "UNKNOWN",
              websiteStatus: "PENDING",
            },
          });

          return NextResponse.json(
            {
              error:
                "Square has not completed this payment. No second charge will be attempted with this request identifier.",
            },
            { status: 409 },
          );
        }

        await prisma.$transaction([
          prisma.paymentAttempt.update({
            where: { idempotencyKey: submittedSquareIdempotencyKey },
            data: {
              providerPaymentId: payment.id,
              providerStatus: payment.status,
              providerReceiptUrl: payment.receiptUrl ?? null,
              receiptReference: payment.receiptNumber ?? null,
              websiteStatus: "PAID",
              paidAt,
            },
          }),
          prisma.order.update({
            where: { id: order.id },
            data: {
              status: "ACCEPTED",
              paymentStatus: "PAID",
              paidAt,
              statusHistory: {
                create: {
                  status: "ACCEPTED",
                  note: "Square payment completed.",
                },
              },
            },
          }),
        ]);

        order.status = "ACCEPTED";
        order.paymentStatus = "PAID";
        order.paidAt = paidAt;
      } catch {
        await prisma.paymentAttempt.update({
          where: { idempotencyKey: submittedSquareIdempotencyKey },
          data: {
            providerStatus: "REQUEST_FAILED",
            websiteStatus: "PENDING",
          },
        });

        return NextResponse.json(
          {
            error:
              "Square payment could not be confirmed. The payment request is retained to prevent a duplicate charge.",
          },
          { status: 502 },
        );
      }
    }

    try {
      if (isAuthenticated && checkout.saveContactInfo) {
        await prisma.user.update({
          where: {
            email: customerEmail,
          },
          data: {
            name: contact.name || authenticatedUserName || null,
            phone: contact.phone || null,
            addressLine1: contact.addressLine1 || null,
            addressLine2: contact.addressLine2 || null,
            city: contact.city || null,
            state: contact.state || null,
            postalCode: contact.postalCode || null,
            deliveryNotes: contact.deliveryNotes || null,
          },
        });
      }
    } catch (profileError) {
      console.error(
        "Failed to save checkout contact info to profile",
        profileError,
      );
    }

    await sendAppEmail({
      to: customerEmail,
      subject: "Order Confirmation",
      react: OrderConfirmationEmail({
        customerName: order.customerName,
        orderId: order.id,
        orderType: order.orderType,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        lateFee: Number(order.lateFee),
        tipAmount: Number(order.tipAmount),
        paymentStatus: order.paymentStatus,
        approvalStatus: order.approvalStatus,
        orderUrl: isAuthenticated ? `${appUrl}/orders/${order.id}` : null,
        scheduleLabel: getOrderScheduleLabel(Boolean(weeklySchedule)),
        scheduleValue: formatOrderScheduleDateTime(order.requestedDateTime, {
          hasWeeklyMealPlan: Boolean(weeklySchedule),
          weeklyFulfillmentMessage: weeklySchedule?.deliveryWindowLabel,
          fixedFulfillmentMessage: fixedCheckoutFulfillment?.displayMessage,
        }),

        deliveryName: order.deliveryName,
        deliveryPhone: order.deliveryPhone,
        deliveryAddressLine1: order.deliveryAddressLine1,
        deliveryAddressLine2: order.deliveryAddressLine2,
        deliveryCity: order.deliveryCity,
        deliveryState: order.deliveryState,
        deliveryPostalCode: order.deliveryPostalCode,
        deliveryNotes: order.deliveryNotes,
        allergenAcknowledged: order.allergenAcknowledged,
        allergenAcknowledgedAt: order.allergenAcknowledgedAt,

        items: order.items.map((item: CreatedOrderItem) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
          notes: item.notes,
          weeklyMealPlanSelection: item.weeklyMealPlanSelection
            ? {
                periodLabel: item.weeklyMealPlanSelection.periodLabel,
                packageName: item.weeklyMealPlanSelection.packageName,
                packageDays: item.weeklyMealPlanSelection.packageDays,
                packageMealsPerDay:
                  item.weeklyMealPlanSelection.packageMealsPerDay,
                packagePrice: Number(item.weeklyMealPlanSelection.packagePrice),
                packageRequiresChefApproval:
                  item.weeklyMealPlanSelection.packageRequiresChefApproval,
                packageIsSeasonal:
                  item.weeklyMealPlanSelection.packageIsSeasonal,
                offeringName: item.weeklyMealPlanSelection.offeringName,
                spiceLevel: item.weeklyMealPlanSelection.spiceLevel,
                proteinSubstitution:
                  item.weeklyMealPlanSelection.proteinSubstitution,
                requestOnly: item.weeklyMealPlanSelection.requestOnly,
                requiresApproval: item.weeklyMealPlanSelection.requiresApproval,
                priceDelta: Number(item.weeklyMealPlanSelection.priceDelta),
                mealSlots: item.weeklyMealPlanSelection.mealSlots.map(
                  (slot) => ({
                    dayNumber: slot.dayNumber,
                    mealNumber: slot.mealNumber,
                    mealLabel: slot.mealLabel,
                    offeringName: slot.offeringName,
                    dietaryInfo: slot.dietaryInfo,
                    selectedOptions: slot.selectedOptions.map((option) => ({
                      optionType: option.optionType,
                      optionName: option.optionName,
                      priceDelta: Number(option.priceDelta),
                      requestOnly: option.requestOnly,
                      requiresApproval: option.requiresApproval,
                    })),
                  }),
                ),
              }
            : null,
        })),
      }),
    });

    return NextResponse.json({
      ...order,
      guestCheckout: !isAuthenticated,
      orderUrl: isAuthenticated ? `/orders/${order.id}` : null,
    });
  } catch (error) {
    if (error instanceof OrderSubmissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Failed to create order." },
      { status: 500 },
    );
  }
}
