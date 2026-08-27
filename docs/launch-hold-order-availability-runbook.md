# Launch-Hold Order Availability Runbook

Date: August 27, 2026

Production site: `https://rahstwistedkitchen.com`

## Current production state

Square production payment processing is tested, working, and intentionally
left enabled with `SQUARE_PRODUCTION_PAYMENTS_ENABLED=true`. The site is in
**launch-hold/content-hold mode**: customer purchasing is controlled
operationally through the availability of published standard menu items and
weekly content, not by disabling the Square production gate.

Hostinger environment-variable changes trigger a full application rebuild.
Repeatedly turning the Square gate off and on would add avoidable rebuild and
deployment risk after production payment validation has already passed. Do not
change Square environment variables merely to manage ordinary catalog launch
timing.

This content hold is not an emergency payment kill switch. If payment creation
must be stopped because of a payment incident, follow the Square rollback
procedure in the production runbook and accept the required restart/redeploy.

## How the content hold controls purchasing

Before entering or maintaining launch hold:

- Unpublish, archive, or remove standard menu items unless the owner
  intentionally wants customers to buy them now.
- Keep weekly periods, offerings, and packages unpublished, inactive, or in
  draft unless they are intentionally sellable.
- Review by-request weekly packages separately. They remain approval-first, but
  they should not be advertised during hold unless the owner wants to collect
  those requests.
- Verify the public menu does not expose unintended `Add to Order` paths.
- Verify cart and checkout cannot create an unintended payable order from the
  currently published catalog.

Public informational pages can remain available. Catering and personal-chef
forms can remain live when the owner wants lead collection; those requests are
approval-first and must not receive a payment request unless payment is
intended.

Previously populated browser carts cannot be centrally cleared. The server's
current order flow still validates submitted items and totals, but the owner
must not assume unpublishing content erases every customer's local cart. Test a
stale cart after catalog changes and monitor new orders and payments.

## Launch-hold checklist

- [ ] Standard menu items are unpublished/removed unless intentionally
      sellable.
- [ ] Weekly periods, packages, and offerings are unpublished/inactive unless
      intentionally sellable.
- [ ] By-request weekly packages have been reviewed for whether request intake
      should remain visible.
- [ ] Public menu and weekly pages show only intended content.
- [ ] A stale cart cannot complete an unintended order through the current
      server-authoritative order flow.
- [ ] Existing Square hosted payment links and pending ledger attempts have
      been reviewed separately.
- [ ] Admins will not send or resend payment requests unless collection is
      intended.
- [ ] Service-request forms remain live only if lead collection is desired.
- [ ] Admin orders and payments are monitored after every content change.

## Active payment-link check

Removing or unpublishing menu content does not necessarily invalidate an
already-created Square hosted payment link. Catalog visibility and hosted-link
lifecycle are separate controls.

Before declaring launch hold active:

1. Review admin payments/reconciliation and relevant order/service details.
2. Check active or pending `PaymentAttempt` rows, especially attempts with a
   stored Square payment-link URL and a future expiration.
3. Confirm each active link is intentionally payable; do not send or resend a
   request merely because its button is available.
4. Allow expired attempts to follow the existing pending-payment expiration
   handling.
5. Use the existing stale-link check/invalidation behavior when Square reports
   a hosted link missing or deleted.
6. If a link's purpose or status is uncertain, do not resend it. Reconcile the
   ledger/provider state first.

Do not delete ledger records to hide an active link. Paid attempts must remain
preserved for reconciliation.

## Pre-launch publishing checklist

Before publishing real customer-purchasable content:

- [ ] Confirm every item name, description, price, allergen, option, and
      upcharge.
- [ ] Confirm weekly package names, prices, slot labels, offerings, Breakfast
      rules, required selections, and by-request behavior.
- [ ] Confirm delivery-fee and late-fee settings.
- [ ] Confirm the production Square gate remaining enabled is still the
      owner's intentional state.
- [ ] Confirm no obsolete active/pending hosted payment link can confuse the
      launch.
- [ ] Verify public menu, cart, and checkout totals using server-trusted data.
- [ ] Place a final small real-money smoke-test order only with explicit owner
      approval.
- [ ] Monitor admin orders, payment ledger, webhooks, and reconciliation after
      publishing.

## Leaving launch hold

Launch hold ends when the owner approves the real menu and weekly content and
the pre-launch checklist passes. Publishing content is the operational go-live
action while the production Square gate remains enabled. Record who published
the content, when it was published, and the first post-publish monitoring
result.

