# Confirmed Payment Processing Decisions

Date: July 27, 2026

Status: foundation only. This document is authoritative for the next payment implementation phase. The current application does not install a Square SDK, call Square APIs, create payment links, expose guest retry links, process provider webhooks, or issue live refunds.

## Provider Sequence And Scope

- Square is the first provider. PayPal follows after Square is stable unless the client changes priority.
- The Square and PayPal business accounts are created and vetted.
- Standard pickup, delivery, and weekly meal plan orders that do not require approval will charge immediately at checkout.
- Standard checkout should support cards and wallets in a later Square implementation.
- ACH should be limited to larger approved catering, personal-chef, and final-balance payments in a later phase.
- Square is the official receipt source.

## Approval-Required Payments

- Orders that require approval must not collect payment at checkout.
- By-request weekly packages request payment only after admin approval.
- Catering and personal-chef requests always require approval before payment.
- Approved catering and personal-chef requests require a 50% deposit.
- Admin sends a separate final-balance payment link by email.
- Menu items and options can require approval according to owner/admin configuration.
- This foundation pass only displays disabled deposit and final-payment request placeholders. It does not create links, send payment-request emails, or change approval behavior.

## Checkout And Manual Payment Policy

- Production customer checkout is online-payment only.
- Manual invoice, cash, and offline checkout options are hidden and rejected by default.
- Manual/offline checkout may be enabled only for development or testing by explicitly setting `ALLOW_MANUAL_PAYMENT_IN_CHECKOUT=true`.
- The development flag is ignored when `NODE_ENV=production`.
- Until Square checkout is implemented, standard production orders cannot be submitted through checkout. Approval-required orders can still be submitted without collecting payment.

## Taxes, Tips, And Trusted Totals

- Taxes are included in listed prices. Do not add a separate checkout tax line.
- Tips support 10%, 15%, 20%, and a custom non-negative amount.
- The tip is added to the final checkout total before payment.
- The server recalculates item prices, fees, late fees, tips, and the final total. Browser-submitted totals are not authoritative.

## Pending Payment And Retry Expiration

- A pending standard payment holds its order and weekly capacity for two hours (120 minutes).
- A secure guest interrupted-payment retry link also expires after two hours.
- If the order remains unpaid after two hours, a future expiration job must:
  1. expire or cancel the order exactly once;
  2. release reserved weekly capacity exactly once;
  3. invalidate further payment attempts and retry links; and
  4. send one cancellation-for-non-payment email.
- Retry links are not part of this foundation pass. Do not expose one until signed/hashed token storage, single-order scoping, expiry, single-use/revocation behavior, and end-to-end tests are complete.

## Refund Policy And Eligibility

Approved customer wording:

> Full refund within 24 hours after placing the order, unless the order has already been fulfilled or service work has already started.

Normal refund eligibility requires all of the following:

- the request is within 24 hours after `Order.createdAt`;
- the order is not fulfilled or final; and
- the order has not reached `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, or any later/final status.

The shared refund helper hides the future normal-refund action after preparation starts or the window expires. No Square refund call exists in this pass. Partial refunds, exceptional refunds, disputes, and service-request refund rules need explicit workflows and audit requirements during the live integration.

## Admin Reconciliation Requirements

The owner performs payment reconciliation. The admin payment view must ultimately compare:

- website payment status;
- Square payment status;
- Square payment ID;
- Square receipt/reference;
- paid date/time;
- refund status; and
- mismatch warnings.

The current admin foundation shows existing website order/payment summaries and clearly marks unavailable Square fields. It can detect limited internal inconsistencies, such as a website `PAID` status without `paidAt`, but cannot reconcile against Square until provider records and webhooks exist.

## Data Model Review

The current `Order` model has summary fields for `paymentProvider`, `paymentStatus`, `payByDate`, `paidAt`, `tipAmount`, and `total`. `CateringRequest` has quote, deposit amount, and deposit-paid summary fields. These are not enough for a durable payment ledger.

No Prisma migration is included in this foundation pass. The actual Square phase should use a reviewed additive MySQL/MariaDB migration containing:

- a payment-attempt/ledger model with provider, purpose, amount, currency, normalized status, provider payment/order IDs, receipt/reference, idempotency key, timestamps, and sanitized failure data;
- relations to either an order or catering/personal-chef request;
- a webhook-event ledger with unique provider event IDs and processing state;
- refund records supporting full and future partial refunds;
- pending-payment expiry and capacity-release state;
- secure hashed guest retry-token records with expiration and revocation; and
- transactionally maintained existing summary fields for compatibility.

Do not force Square IDs, webhook history, refunds, and retries into a few nullable `Order` columns. The payment ledger and idempotent lifecycle should be designed and migrated together.

## Environment Plan

Planned variables:

```dotenv
SQUARE_ENVIRONMENT=sandbox
SQUARE_APPLICATION_ID=
SQUARE_LOCATION_ID=
SQUARE_ACCESS_TOKEN=
SQUARE_WEBHOOK_SIGNATURE_KEY=
ALLOW_MANUAL_PAYMENT_IN_CHECKOUT=false
```

`SQUARE_ACCESS_TOKEN` and `SQUARE_WEBHOOK_SIGNATURE_KEY` are server-side secrets. Never expose them through `NEXT_PUBLIC_*`, client components, logs, email, audit metadata, or API responses. The application and location IDs are identifiers rather than secrets, but should remain server-configured until the selected Square browser integration explicitly needs a public application ID.

## Follow-Up For Live Square Integration

1. Approve and apply the additive payment, webhook, refund, expiry, and secure retry-token schema.
2. Install the current supported Square SDK only after reviewing its official integration and dependency requirements.
3. Add a provider boundary, idempotent payment creation, and trusted amount/currency checks.
4. Add Square Web Payments SDK card/wallet UI and the required production CSP.
5. Implement verified raw-body webhooks with duplicate and out-of-order event handling.
6. Implement the two-hour expiry worker, weekly-capacity release, and non-payment cancellation email.
7. Implement secure guest retry access without adding public guest order tracking.
8. Implement deposit and final-balance request creation after approval.
9. Implement full-refund operations, permissions, audit logs, and reconciliation.
10. Run sandbox, webhook, retry, expiration, duplicate-charge, capacity, refund, receipt, and production smoke tests before enabling Square.
