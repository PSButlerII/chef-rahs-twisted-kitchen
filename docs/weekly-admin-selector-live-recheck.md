# Weekly Admin Selector Live Recheck

## Test record

- Date/time: August 12, 2026, 1:01 PM America/New_York
- Tester/operator: Codex, using the authenticated production admin and public
  customer site
- Production URL: `https://rahstwistedkitchen.com`
- Admin weekly package tested: `Dinner and lunch`
- Weekly menu: `weekly menu test`
- Result: **Partial pass; selector fix passed, public checkout blocked by Draft
  weekly menu**

No package or menu changes were saved. No order, payment, refund, or hosted
payment link was created.

## Admin selector result

The deployed selector improvement passed in production without a browser
refresh:

- Changing Slot 1 from `Meal 1` to `Breakfast` immediately recomputed the
  eligibility preview.
- The Breakfast preview contained `Eggs and Bacon · Breakfast`,
  `Bisquets and gravy · Standard`, and `pizza · Standard`.
- Changing the slot back to `Meal 1` immediately removed the Breakfast-only
  offering while retaining the Standard offerings.
- A selected Standard preview was cleared when the slot type changed.
- A selected Breakfast preview was cleared when the slot changed back to a
  non-Breakfast type.
- Reducing meals per day from two to one removed the obsolete second-slot
  controls. Restoring two meals recreated Slot 2 with `Select an offering to
  preview` selected, rather than restoring the stale preview choice.
- The page states that these controls are eligibility previews and do not save
  an offering assignment for each package slot.

The test changed controlled browser state only. Reloading the page discarded
the unsaved QA changes.

## Breakfast and Standard behavior

Status: **Pass.**

- Breakfast offerings are clearly labeled with `· Breakfast`.
- Non-Breakfast offerings are clearly labeled with `· Standard`.
- Breakfast-only offerings are excluded from non-Breakfast slots.
- Breakfast slots include Breakfast offerings and continue to permit Standard
  offerings, matching the documented business rule.
- No server validation was changed in this QA branch. The live UI behavior
  matches the existing validation model exercised by the prior readiness QA.

## Customer menu result

Status: **Blocked by production content state.**

At recheck time, `weekly menu test` was `Draft`, with its existing two packages
and three offerings visible only in the admin manager. The public menu showed
`Menu coming soon` and `No meal plan or menu items are available yet.`

Therefore this recheck could not verify current public slot labels, required
selection enforcement, Breakfast selection, allergen warnings, or option
upcharges. Those behaviors passed in the earlier production readiness test
while the same weekly content was published, but that earlier evidence is not
substituted for a live customer recheck here.

## Cart result

Status: **Not run; no published weekly package was available.**

No weekly item could be added from the live customer menu. Cart math and
selection persistence were not rechecked, and no temporary QA cart entry was
created.

## Checkout preflight result

Status: **Not run; blocked before cart.**

The normal production `Pay with Card` path and the by-request approval-first
path could not be reached with the weekly menu in Draft. No Sandbox or
manual/offline wording was observed on the public weekly menu, but checkout
wording and Square-field absence/presence were not reverified in this pass.

## Issues found

1. The selector refresh defect is resolved in the deployed admin UI.
2. The Breakfast/Standard labels and filtering behavior are correct.
3. The intended weekly menu is currently Draft, so no weekly package is visible
   to customers and live cart/checkout preflight is blocked.
4. Previously recorded content-review items still apply before publication:
   confirm intended package price, align the by-request `10 meals` title with
   its 5-by-3 configuration, and review spelling/capitalization.

No application code or production data was changed.

## Remaining blockers

1. The owner must review the weekly content and publish the intended weekly
   menu during an approved QA window.
2. Rerun customer menu, cart, normal checkout preflight, and by-request
   approval-first preflight after publication.
3. Obtain explicit owner approval before one controlled real-money weekly
   payment.
4. Production Resend delivery evidence and catering/personal-chef submission
   evidence remain separate launch blockers.

## Pass/fail

**Partial pass.** The live admin selector refresh, stale-preview cleanup,
Breakfast/Standard labeling, and eligibility behavior passed. Weekly checkout
is not yet ready for a controlled payment because the weekly menu is Draft and
the customer/cart/checkout recheck could not be completed. No real payment was
run.
