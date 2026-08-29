import { CateringDepositPaidEmail } from "@/emails/CateringDepositPaidEmail";
import { CateringRequestEmail } from "@/emails/CateringRequestEmail";
import { CateringStatusEmail } from "@/emails/CateringStatusEmail";
import { OrderApprovalEmail } from "@/emails/OrderApprovalEmail";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";
import { PaymentReceivedEmail } from "@/emails/PaymentReceivedEmail";

const baseUrl = "https://example.test";

const orderProps = {
  customerName: "Jordan Taylor",
  orderId: "preview-order-1042",
  total: 93.25,
  subtotal: 78.5,
  deliveryFee: 8,
  lateFee: 0,
  tipAmount: 6.75,
  orderType: "DELIVERY",
  paymentStatus: "PENDING",
  approvalStatus: "PENDING",
  orderUrl: `${baseUrl}/orders/preview-order-1042`,
  allergenAcknowledged: true,
  allergenAcknowledgedAt: new Date("2026-07-08T18:30:00Z"),
  deliveryName: "Jordan Taylor",
  deliveryPhone: "(555) 010-2042",
  deliveryAddressLine1: "123 Mockingbird Lane",
  deliveryAddressLine2: "Apt 4B",
  deliveryCity: "Springfield",
  deliveryState: "IL",
  deliveryPostalCode: "62704",
  deliveryNotes: "Please leave the order with the front desk.",
  items: [
    {
      name: "Twisted Chicken Bowl",
      quantity: 2,
      unitPrice: 18,
      lineTotal: 36,
      notes: "Sauce on the side.",
    },
    {
      name: "Weekly Meal Plan Pack",
      quantity: 1,
      unitPrice: 42.5,
      lineTotal: 42.5,
      weeklyMealPlanSelection: {
        periodLabel: "Week of July 13, 2026",
        packageName: "Balanced Meal Plan",
        packageDays: 3,
        packageMealsPerDay: 2,
        packagePrice: 36,
        packageRequiresChefApproval: true,
        packageIsSeasonal: true,
        offeringName: "Jerk chicken with coconut rice",
        spiceLevel: "Medium",
        proteinSubstitution: null,
        requestOnly: false,
        requiresApproval: false,
        priceDelta: 6.5,
        mealSlots: [
          {
            dayNumber: 1,
            mealNumber: 1,
            mealLabel: "Breakfast",
            offeringName: "Jerk chicken with coconut rice",
            dietaryInfo: "High protein",
            selectedOptions: [
              {
                optionType: "SPICE_LEVEL",
                optionName: "Medium",
                priceDelta: 0,
                requestOnly: false,
                requiresApproval: false,
              },
              {
                optionType: "PROTEIN_SUBSTITUTION",
                optionName: "Extra 3oz Protein",
                priceDelta: 2,
                requestOnly: false,
                requiresApproval: false,
              },
            ],
          },
          {
            dayNumber: 1,
            mealNumber: 2,
            mealLabel: "Lunch",
            offeringName: "Salmon wellness bowl",
            dietaryInfo: "Pescatarian",
            selectedOptions: [
              {
                optionType: "SPICE_LEVEL",
                optionName: "Mild",
                priceDelta: 0,
                requestOnly: false,
                requiresApproval: false,
              },
              {
                optionType: "PROTEIN_SUBSTITUTION",
                optionName: "Extra 5oz Seafood",
                priceDelta: 4.5,
                requestOnly: false,
                requiresApproval: false,
              },
            ],
          },
          {
            dayNumber: 2,
            mealNumber: 1,
            mealLabel: "Breakfast",
            offeringName: "Turkey power bowl",
            dietaryInfo: "Balanced",
            selectedOptions: [
              {
                optionType: "SPICE_LEVEL",
                optionName: "Hot",
                priceDelta: 0,
                requestOnly: false,
                requiresApproval: false,
              },
            ],
          },
          {
            dayNumber: 2,
            mealNumber: 2,
            mealLabel: "Lunch",
            offeringName: "Island chicken meal plan",
            dietaryInfo: null,
            selectedOptions: [
              {
                optionType: "SPICE_LEVEL",
                optionName: "Medium",
                priceDelta: 0,
                requestOnly: false,
                requiresApproval: false,
              },
            ],
          },
        ],
      },
    },
  ],
};

const cateringProps = {
  customerName: "Avery Morgan",
  requestId: "preview-catering-2042",
  requestType: "CATERING",
  eventType: "Corporate lunch",
  guestCount: 35,
  eventDate: "August 15, 2026 at 12:30 PM",
  location: "456 Sample Street, Springfield, IL",
  requestedMenu: "Jerk chicken, vegan curry bowls, plantains, and lemonade",
  specialRequests:
    "Include gluten-free labels and disposable serving utensils.",
  requestUrl: `${baseUrl}/account/catering/preview-catering-2042`,
};

const personalChefProps = {
  ...cateringProps,
  requestId: "preview-personal-chef-3042",
  requestType: "PERSONAL_CHEF",
  eventType: "Anniversary dinner",
  guestCount: 8,
  eventDate: "September 6, 2026 at 6:00 PM",
  location: "789 Demo Court, Springfield, IL",
  requestedMenu: "Four-course tasting menu with seafood and vegetarian options",
  specialRequests:
    "One guest avoids shellfish; please include mocktail pairings.",
  requestUrl: `${baseUrl}/account/catering/preview-personal-chef-3042`,
};

export const emailPreviews = [
  {
    slug: "order-submitted",
    label: "Order Submitted",
    description:
      "Customer order confirmation with delivery details and item totals.",
    render: () => OrderConfirmationEmail(orderProps),
  },
  {
    slug: "order-approved",
    label: "Order Approved",
    description: "Customer notification after an admin approves an order.",
    render: () =>
      OrderApprovalEmail({
        customerName: orderProps.customerName,
        orderId: orderProps.orderId,
        approved: true,
        approvalNote:
          "Your order is approved and scheduled for Friday delivery.",
        orderUrl: orderProps.orderUrl,
      }),
  },
  {
    slug: "order-denied",
    label: "Order Denied",
    description:
      "Customer notification after an admin does not approve an order.",
    render: () =>
      OrderApprovalEmail({
        customerName: orderProps.customerName,
        orderId: orderProps.orderId,
        approved: false,
        approvalNote:
          "The selected delivery window is unavailable. Please place a new order for another day.",
        orderUrl: orderProps.orderUrl,
      }),
  },
  {
    slug: "payment-received",
    label: "Payment Received",
    description:
      "Customer notification after offline payment is marked received.",
    render: () =>
      PaymentReceivedEmail({
        customerName: orderProps.customerName,
        orderId: orderProps.orderId,
        total: orderProps.total,
        paidAt: "July 9, 2026 at 10:15 AM",
        orderUrl: orderProps.orderUrl,
      }),
  },
  {
    slug: "catering-request-submitted",
    label: "Catering Request Submitted",
    description: "Customer confirmation after submitting a catering request.",
    render: () => CateringRequestEmail(cateringProps),
  },
  {
    slug: "personal-chef-request-submitted",
    label: "Personal Chef Request Submitted",
    description:
      "Customer confirmation after submitting a personal chef request.",
    render: () => CateringRequestEmail(personalChefProps),
  },
  {
    slug: "catering-request-approved",
    label: "Catering Request Approved",
    description: "Customer update with approval, quote, and deposit details.",
    render: () =>
      CateringStatusEmail({
        ...cateringProps,
        status: "QUOTED",
        approvalStatus: "APPROVED",
        approvalNote: "We can support this menu and guest count.",
        estimatedTotal: 875,
        depositAmount: 250,
      }),
  },
  {
    slug: "catering-deposit-paid",
    label: "Catering Deposit Paid",
    description:
      "Customer notification after a service request deposit is marked paid.",
    render: () =>
      CateringDepositPaidEmail({
        customerName: cateringProps.customerName,
        requestType: cateringProps.requestType,
        eventType: cateringProps.eventType,
        depositAmount: 250,
        paidAt: "July 9, 2026 at 11:00 AM",
        requestUrl: cateringProps.requestUrl,
      }),
  },
] as const;

export type EmailPreviewSlug = (typeof emailPreviews)[number]["slug"];

export function getEmailPreview(slug: string) {
  return emailPreviews.find((preview) => preview.slug === slug);
}
