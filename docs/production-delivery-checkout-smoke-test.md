# Production Delivery Checkout Smoke Test

## Final result

Status: **Pass.**

The delivery checkout preflight passed, and the owner subsequently completed a
real-money Square production payment and full refund. The actual charged and
refunded amount was `$2.00` (200 cents), not the originally planned `$1.00`.
Square initially reported the refund as `PENDING`; the application correctly
kept the refund pending. Square later reported `COMPLETED`, after which the
local ledger, order summary, and admin reconciliation all showed the completed
refund with no mismatch.

Refund completion can be asynchronous. A pending provider refund is a valid
temporary state and must not trigger a second refund.

## Delivery checkout preflight

Status: **Pass.**

- The public menu, cart, delivery selection, contact fields, and delivery
  address fields rendered correctly.
- Required-field validation ran before payment handling.
- The checkout summary included the configured delivery fee and tip in the
  final server-authoritative total.
- Square production card fields rendered and the customer action displayed
  `Pay with Card`.
- No Sandbox wording or manual/offline payment option appeared.

The preflight originally used a `$1.00` catalog item. The later owner-operated
payment lifecycle used an actual total of `$2.00`.

## Controlled production payment

Status: **Pass.**

- Order ID: `cmsor3yxz0000rv3plvm7j5gi`
- Parent payment ID: `cmsor3yyc0003rv3p8lqy7z60`
- Provider payment ID: `ZYkxJkUK82K5J1ry4MNeCrVpXvEZY`
- Amount: `$2.00` / 200 cents
- Provider: Square production
- Final parent provider status: `COMPLETED`

The real production payment reached Square and the application recorded the
corresponding delivery order and `ORDER_TOTAL` payment ledger row.

## Controlled production refund

Status: **Pass after asynchronous provider completion.**

- Refund attempt ID: `cmsor6p2h000erv3p8o7hljt5`
- Provider refund ID:
  `ZYkxJkUK82K5J1ry4MNeCrVpXvEZY_FGZPEKvzSMXTRCiBzrTfHreJva32leN2Jd7ejuNyUqE`
- Amount: `$2.00` / 200 cents
- Reason: `Customer ordered wrong item`
- `refund.created`: HTTP 200
- `refund.updated`: HTTP 200

Square initially returned `PENDING`. The app correctly retained the refund
child as pending rather than prematurely marking the payment and order
refunded. Square later returned `COMPLETED`, and reconciliation reached:

- parent `ORDER_TOTAL`: provider `COMPLETED`, website `REFUNDED`;
- refund child: provider `COMPLETED`, website `REFUNDED`;
- `refundedAt` populated on both ledger rows;
- admin ledger display: `REFUNDED`;
- admin Square display: `COMPLETED`; and
- admin reconciliation: `No mismatch detected`.

No second refund was issued. The guarded recovery apply was not needed because
the application state reconciled after Square reported completion.

## Operational conclusion

Production delivery checkout payment and full-refund reconciliation are
verified. When Square reports a refund as pending, leave it pending, wait for a
verified `refund.updated` event or perform the read-only provider status check,
and confirm admin reconciliation before closing the task. Never create a second
refund merely because completion is delayed.

Production Resend delivery evidence remains a separate launch item; this record
does not claim inbox/provider-delivery confirmation for order or refund email.
