You are helping continue development on a Next.js/Prisma food service web app for Chef Rah's Twisted Kitchen.

## September 2, 2026 — In-app admin guidance

- Added an authenticated, searchable Help & Guide center from the admin dashboard.
- Added direct page-help links, accessible contextual help, visible safety warnings, and protected access to the handbook and quick reference.

## September 2, 2026 — Client admin handoff package

- Created a rewritten, nontechnical Client Admin Handbook in editable DOCX and client-facing PDF formats.
- Created a two-page Daily Admin Quick Reference in DOCX and PDF.
- Captured sanitized screenshots from the rendered application using fictional local training data.
- Retained the existing Markdown admin guide as the detailed technical and operational reference.
- Completed document structure, metadata, accessibility, link, file-integrity, and full-page visual QA.
- No application behavior, package dependency, Prisma schema, migration, payment, authentication, upload, or production setting changed.
- Work is isolated on branch `docs/client-admin-handbook-2026-09-02` under commit subject `docs(handoff): add client admin handbook`.

Current business model:

- Meal Plans and A La Carte items are purchased through cart checkout.
- Catering and Personal Chef are service request / quote workflows, not direct checkout purchases.
- Meal plans are purchased through checkout but should be treated as fixed business-created offerings, not fully customizable meals.
- Meal plan customer-facing choices should be limited to spice level and protein substitutions.
- Meal plan packages should support 1-meal or 2-meal package options; the 3-meal package should be removed.
- Pork and beef are request-only for meal plans. Pricing may vary and chef approval may be required.
- Customer accounts should include allergen preferences, and meal plans containing those allergens should show alerts before cart/checkout completion.
- Customer accounts now include phone, delivery address fields, and delivery notes.
- Checkout preloads account profile data and can save edited checkout contact info back to the customer profile.
- Orders store a delivery/contact snapshot so historical orders keep the delivery info used at order time.
- Admin order approvals and service request approvals should prevent duplicate final decisions.

Important architecture notes:

- Menu item `type` controls behavior, such as MEAL_PLAN, A_LA_CARTE, CATERING, PLATE, DESSERT, SIDE, OTHER.
- Menu category controls display grouping, such as "Meal Plans", "A La Carte", "Desserts", "Sides".
- Do not confuse category names with enum values.
- Catering and Personal Chef share the CateringRequest/service request workflow using requestType.
- Checkout orderType should only be delivery or pickup.
- Keep routes stable for now:
  - /menu displays Meal Plans / A La Carte
  - /admin/catering displays Service Requests
  - /account/catering displays Service Requests

Please inspect the codebase before making changes. Do not rename routes or database models unless explicitly asked. Avoid large rewrites. Prefer small safe changes with clear commits.

Current next priorities:

1. Verify checkout contact/profile flow:
   - account profile updates correctly
   - checkout preloads current user profile
   - checkout does not leak prior user persisted data
   - saveContactInfo updates the profile after order submission
   - delivery/pickup validations match frontend and backend
2. Remove or avoid debug UI.
3. Polish checkout sections:
   - Order Method
   - Order Items
   - Contact / Delivery Info
   - Schedule
   - Preferences
   - Payment
   - Review
4. Ensure order detail pages show delivery/contact snapshot.
5. Ensure order confirmation emails include delivery/contact details.
6. Make sure duplicate approval decisions are blocked on both frontend and backend.
7. Run typecheck/build and report any issues before making unrelated changes.

Start by auditing the checkout/profile/order flow and tell me what you find. Then propose the smallest safe patch.

Progress update - July 9, 2026:

- Added `docs/production-runbook.md` as the production deployment runbook for `https://rahstwistedkitchen.com`.
- The runbook covers production environment variables, MySQL/MariaDB database setup, Prisma migration/deploy commands, foundation seed notes, first owner bootstrap and owner-managed admins, Resend setup, Hostinger/DNS notes, disabled local production uploads, manual Square/PayPal payment launch posture, security launch posture, QA, smoke tests, rollback, and future follow-up items.
- This was a documentation-only pass. No application code, Prisma schema, checkout/order/payment behavior, auth logic, upload behavior, security headers, Resend sending behavior, or email templates were changed.

Progress update - June 6, 2026:

- Checkout/profile/order flow has been audited and patched:
  - Checkout contact details are reset before account profile preload.
  - Persisted checkout state no longer carries stale contact/delivery details across users.
  - Account profile data preloads into checkout for signed-in users.
  - `saveContactInfo` updates the customer profile after order submission.
  - Delivery and pickup validations are enforced on both checkout UI and order creation API.
- Debug UI cleanup:
  - Removed the known admin menu form debug log.
  - No remaining `console.log`, `Debug`, or `debug` matches were found in `app`, `components`, `store`, `emails`, or `lib`.
- Checkout page polish:
  - Checkout is organized around Order Method, Order Items, Contact / Delivery Info, Schedule, Preferences, Payment, and Review.
  - The checkout route remains `/checkout`.
- Order history snapshots:
  - Customer and admin order detail pages show the delivery/contact snapshot saved with the order.
- Order confirmation email:
  - Confirmation emails include contact and delivery details from the order snapshot.
  - Duplicate divider/total markup and non-ASCII item separators were cleaned up.
- Approval duplicate-decision protection:
  - Admin order and service request approval forms show final approved/denied states instead of repeat decision buttons.
  - Admin order and service request approval APIs guard final decisions with pending-only transactional updates.
  - Duplicate final decisions return an error and do not resend approval/denial emails.
- Validation:
  - `npm run lint` passes without warnings.
  - `npm run build` passes with the current Next.js/Prisma setup.
- Service request and order detail polish:
  - Personal Chef requests now use the raw `requestType` value for branching, so they are labeled as Personal Chef instead of falling back to Catering.
  - Admin service request status updates now receive the raw status enum instead of a formatted label.
  - Admin service request approval and status controls are split into separate cards.
  - Customer order detail pages now show one approval notice instead of duplicated pending/denied/approved messaging.
- Purchase vs. service request boundary:
  - Public `/menu` hides menu items with type `CATERING` so quote-based services do not enter cart checkout.
  - Order creation rejects submitted cart items whose menu item type is `CATERING`, protecting against stale persisted carts.
  - Admin order filters now only expose delivery and pickup order types.
  - Admin orders table columns were realigned so approval status no longer appears under the item count column.
- Order label polish:
  - Added a shared order status formatter for customer and admin order summaries.
  - Account, admin, customer detail, order list, and kitchen views now show friendly order type/status/payment labels instead of raw enum values.
  - Cleaned corrupted item quantity and separator text in summary cards.
  - Kitchen view now passes only plain serialized order data to the client card, avoiding Prisma `Decimal` objects in client component props.
- Admin menu customization polish:
  - Restored manual option group name entry in the customization editor.
  - Removed duplicate "Add Option Group" heading in the customization editor.
- Email label polish:
  - Order confirmation emails now format order type, payment status, and approval status with customer-friendly labels.
  - Catering/service request status emails now format request status and approval status with customer-friendly labels.
- Service request email terminology:
  - Shared service request emails now use `requestType` so Personal Chef messages are not labeled as Catering.
  - Approval, quote, deposit, catering, and personal chef request email senders pass the request type into their email templates.
- Service request UI terminology:
  - Shared account and admin service request views now use Service Requests or `requestType`-aware labels where Catering and Personal Chef records can both appear.
  - Admin dashboard, reports, customer detail, request detail, and notification pages avoid Catering-only copy for shared service request counts and approvals.
- Lint warning cleanup:
  - Replaced remaining plain image elements with `next/image` on the home page, menu cards, menu customization modal choice images, and admin menu item preview.
  - `npm run lint` now completes without the prior `@next/next/no-img-element` warnings.
- Admin status label polish:
  - Admin order and service request status dropdowns now show friendly status labels instead of raw enum values.
  - Service request status formatting explicitly covers new, deposit due, and deposit paid states.
- Account service request navigation:
  - The account dashboard Service Requests card now links to the account service request history instead of the public catering request form.
  - Account profile copy now describes contact, delivery, and service-location information for orders and service requests.
- Service request deposit guard:
  - Marking a service request deposit as paid now requires an unpaid request with a deposit amount.
  - Duplicate deposit-paid calls are rejected before sending another receipt email.
- Order payment guard:
  - Marking an order as paid now only succeeds for unpaid orders with payment due.
  - Duplicate order payment calls are rejected before sending another payment received email.
- Order detail label polish:
  - Customer and admin order detail pages now show friendly order and payment status labels.
  - Cleaned remaining corrupted quantity separators and aligned the admin payments table columns.
- Service request settings terminology:
  - Business settings now label the shared deposit percentage as a service request deposit instead of catering-only copy.
  - Service request approval API failures now use service request terminology.
- Admin menu API cleanup:
  - Removed stale commented category/type mapping code from the menu creation API so category display names and menu item enum values stay clearly separated.
- Admin menu display cleanup:
  - Replaced remaining malformed/non-ASCII expand/collapse markers, separators, and service tagline text with plain ASCII display copy.
- Admin menu customization entry:
  - Manual option-group creation now captures choice description, dietary info, image URL, request-only status, and price delta in one pass.
- Order creation server validation:
  - Live cart items are now repriced from the current menu item and option records before order totals are created.
  - Required option groups, single-choice limits, unavailable/archived items, catering item submissions, and request-only approval flags are enforced by the order API.
  - Reorder submissions carry the prior order item ID, and the order API verifies it belongs to the signed-in customer before using the historical snapshot price.
- Account order history display cleanup:
  - Replaced the remaining corrupted quantity separator in account order history with the plain ASCII `x` used on order detail surfaces.
- Admin order snapshot route hardening:
  - Disabled unused admin order allergen/option endpoints that were incorrectly pointed at menu customization tables using an order ID.
  - Those routes now return an authenticated unsupported-operation response and direct edits back to the menu manager.
- Stale comment cleanup:
  - Removed leftover commented-out order history markup and empty email-section comments from the order creation route.
- Reorder approval validation:
  - Reorder snapshot pricing remains historical, but linked current menu item approval rules now still require chef approval when applicable.
  - Reorders are blocked if the linked current menu item is now a catering/service item.
- Reorder availability validation:
  - Reorders are blocked when the linked current menu item has been archived or marked unavailable, while still using snapshot pricing for valid linked items.
- Checkout payment/tip validation:
  - Order creation now rejects invalid tip selections, negative custom tips, disabled payment methods, and manual-payment submissions without a valid pay-by date.
- Checkout schedule validation:
  - Order creation now requires a requested date/time and rejects invalid requested date values before applying business date rules.
- Service request submission validation:
  - Catering and Personal Chef request APIs now reject invalid email addresses, malformed event dates, and non-whole or non-positive guest counts before creating a request.
  - Existing service request routes and database models remain unchanged.
- Service request quote validation:
  - Admin quote updates now reject non-finite or negative estimated totals and deposit amounts on both the form and API.
  - A zero-dollar estimated total is treated as an explicit quote value instead of being ignored by status updates.
- Validation/typecheck workflow:
  - Added `npm run typecheck` using `next typegen && tsc --noEmit`.
  - Added `npm run prisma:generate` and `npm run check`.
  - `npm run check` now runs lint, Prisma generate, typecheck, and build in order.
  - Verified `npm run typecheck`, `npm run prisma:generate`, and `npm run check` on June 8, 2026.
- Checkout empty-cart UX hardening:
  - `/checkout` now shows a focused empty-cart state with actions to browse the menu or view the cart when no cart items exist.
  - The checkout submit button is disabled when the cart has no items as a defensive UI guard.
  - Contact and delivery fields now include a short note explaining account profile prefill and optional profile saving.
- Account/profile freshness after edits:
  - Account profile saves now revalidate `/account`, `/catering`, and `/personal-chef` after the profile update succeeds.
  - The account profile modal already calls `router.refresh()` after saving, and checkout continues to fetch profile data with `cache: "no-store"` on mount.
- Service request form UX pass:
  - Catering and Personal Chef form validation errors now redirect browser form submissions back to the form with friendly visible feedback instead of raw JSON responses.
  - Non-browser/API validation failures still receive JSON error responses.
  - Both forms include helper text for event date, guest count, location, and requested menu/service details.
  - Catering and Personal Chef continue to share the `CateringRequest` workflow while keeping distinct customer-facing copy.
- Admin service request workflow polish:
  - Admin service request status controls now lock completed, cancelled, and denied requests.
  - Deposit due and deposit paid status transitions are guarded in both the admin UI and API.
  - Quote editing is locked after final states, denied approvals, or paid deposits.
  - Zero-dollar quotes and zero-dollar deposits display as explicit `$0.00` values instead of looking unset.
  - Zero-dollar deposits are treated as no deposit due, so the mark-deposit-paid action is hidden and rejected by the API.
- Weekly meal plan modeling discovery:
  - Added `docs/weekly-meal-plan-discovery.md` to document the desired weekly meal plan admin and customer workflows before schema changes.
  - Updated the discovery on June 9, 2026 with client clarification that meal plans are fixed offerings, not truly customizable meals.
  - Updated the discovery on June 13, 2026 with resolved business decisions for allergens, capacity, cloning/rotation, current-week ordering, fixed package pricing, and request-only proteins.
  - Added `docs/weekly-meal-plan-schema-proposal.md` with an additive weekly menu schema proposal and rollout plan.
  - Current meal plans remain `MenuItem` records with `type = MEAL_PLAN`, limited option groups, request-only choices, and order snapshots.
  - Added and applied migration `20260613014948_add_weekly_meal_plan_models` with weekly period, package, offering, allowed-option, weekly allergen, order weekly selection snapshot, and item-level allergen acknowledgement fields.
  - Added the first admin weekly menu management slice for listing, creating, and editing weekly periods and 1-/2-meal packages.
  - Added the admin weekly offering slice for creating/editing/deleting fixed offerings, tagging offering allergens, and managing allowed spice/protein options.
  - Added admin weekly cloning/rotation controls that copy packages, offerings, allergen tags, and allowed options into a new draft weekly period.
  - Added the first public `/menu` weekly display slice for the current published weekly menu, including packages, fixed offerings, allergen labels, and allowed spice/protein options.
  - Added the first weekly cart/checkout wiring slice with package/offering/spice/protein selection, weekly order snapshots, allergen acknowledgement, and capacity enforcement.
  - The new weekly models are not fully surfaced in order detail pages, kitchen prep, or emails yet.
- Gallery and image management:
  - Added `docs/gallery-image-management.md` to document the current gallery and image upload direction.
  - Public gallery data now points at optimized WebP assets in `public/gallery/webp` for demo readiness instead of missing `/gallery/*.jpg` paths.
  - Original HEIC gallery files should be treated as source assets, while WebP copies are used for the public page.
  - Added a `GalleryImage` model and migration seeded with the current optimized gallery images.
  - Public `/gallery` now reads gallery database records and falls back to `data/gallery.ts` if records are unavailable.
  - Admin `/admin/gallery` supports creating, editing, reordering, categorizing, replacing, and deleting gallery images.
  - Added `/api/admin/gallery` and `/api/admin/gallery/[id]` for admin gallery CRUD.
  - Runtime uploads to `public/uploads` should be treated as local/demo-only until production storage is confirmed.
- Admin menu item deletion:
  - Added a guarded hard-delete path for menu items.
  - `OrderItem.menuItem` now explicitly uses `onDelete: SetNull` so historical order snapshots remain intact after menu item deletion.
  - Active menu items expose Archive and Delete actions, and archived menu items can be restored or deleted.
- Customer allergen preferences and checkout safeguards:
  - Added account allergen preferences backed by `UserAllergen` records and seeded common allergen options.
  - Account dashboard customers can save allergen preferences.
  - Cart and checkout surfaces show conflict warnings when selected cart items contain a customer's saved allergens.
  - Order creation enforces live menu item allergen conflicts server-side and requires acknowledgement before creating the order.
  - Orders store allergen acknowledgement fields for the checkout submission.
  - Checkout persistence now treats allergen acknowledgement as transient so a prior acknowledgement cannot carry into a later checkout.
- Deployment readiness pass:
  - Added `.env.example` with the required database, Auth.js, app URL, Resend, legacy Stripe placeholders, and admin-promotion variables.
  - Added `npm run admin:promote` to promote an existing registered user to `ADMIN` or `OWNER` by `ADMIN_EMAIL`.
  - Confirmed Prisma migration status is up to date against the configured local development database on June 12, 2026.
  - Confirmed email links are centralized through `NEXT_PUBLIC_APP_URL` in `lib/email.ts`; production must set this to the public site URL.
  - Menu item uploads now use the same validated local public-upload helper as gallery uploads.
  - Runtime uploads to `public/uploads` remain local/demo-only until the production host supports durable storage or object storage is added.
  - Verified `npm run check` on June 12, 2026 after the checkout/admin upload/deployment-readiness fixes.
- Production upload storage guard:
  - Local public uploads are now blocked in production unless `ALLOW_LOCAL_UPLOADS_IN_PRODUCTION="true"` is set.
  - This keeps admin uploads usable for local demos while preventing accidental non-durable production uploads.
  - Gallery create/edit and menu item create/edit forms now accept public image URLs, so production can point records at externally hosted durable storage without choosing an upload SDK yet.
  - The remaining deployment decision is whether direct in-app production uploads should use durable local disk or a specific object storage provider.
- Meal plan fixed-offering alignment:
  - The meal plan template now adds only spice level and protein substitution option groups.
  - Older template entries for meal count, vegetable choice, starch choice, and broad meal-plan substitutions were removed from the admin template dropdown.
  - Applying the meal plan template no longer enables free-form customer item instructions by default.
  - Public meal plan copy now describes fixed offerings rather than broad meal-component customization.
- Meal plan customer option enforcement:
  - Public `/menu` now filters meal plan option groups to spice level and protein substitution only.
  - Order creation validates meal plan submitted options against the same allowed customer-facing groups, so stale carts cannot submit old meal-count, vegetable, starch, or broad-substitution options.
- Cart persistence reset:
  - Client-side cart persistence was bumped after the old menu items were archived so browsers with stale cart data start from an empty cart.
- Admin allergen tagging hardening:
  - Admin menu allergen checkboxes now preload each menu item's current allergen tags.
  - Saving menu item allergens now validates menu item and allergen IDs before replacing tags, and the replacement runs transactionally.
- Admin menu cache revalidation:
  - Admin menu item, option, allergen, template, availability, archive/restore, delete, and category mutations now revalidate the affected public/admin menu pages.
- Admin option validation:
  - Admin option group and option choice saves now validate choice names, non-negative price deltas, and public image URLs before saving.
  - Option edit forms surface validation messages returned by the API.

Review notes from main branch inspection - June 8, 2026:

- `package.json` exposes `dev`, `build`, `start`, `lint`, `typecheck`, `prisma:generate`, and `check` scripts.
- Use `npm run typecheck` for standalone TypeScript validation, `npm run prisma:generate` when Prisma client output needs refreshing, and `npm run check` for the full local verification workflow.
- Checkout is currently a client page with sectioned UI and profile hydration via `/api/account/profile`. It uses `resetContactDetails()` before loading the signed-in profile and uses `cache: "no-store"` when fetching profile data.
- Checkout still allows only manual invoice and cash/offline submissions; the disabled online-card placeholder must remain disabled until a future Square/PayPal integration is implemented.
- Order creation now performs the authoritative price and option validation server-side. Treat the client cart totals as display-only; do not trust them for order persistence.
- Prisma still has `OrderType.CATERING` in the schema for legacy compatibility, but checkout and order creation should only create `DELIVERY` and `PICKUP` orders.
- Catering and Personal Chef remain stored in `CateringRequest`. This is intentionally stable for now even though the UI should say Service Requests where both request types appear.

Next work items - June 8, 2026:

1. Add a dedicated validation/typecheck workflow - completed June 8, 2026
   - `npm run typecheck` runs `next typegen && tsc --noEmit`.
   - `npm run prisma:generate` runs `prisma generate`.
   - `npm run check` runs lint, Prisma generate, typecheck, and build in order.
   - Keep `npm run build` as the release gate; it is included in `npm run check`.

2. Finish checkout UX hardening - completed June 8, 2026
   - `/checkout` shows an empty-cart call-to-action when no cart items exist.
   - Submit is defensively disabled if the cart has no items.
   - Checkout contact fields explain profile prefill and optional profile saving.
   - The online card option remains disabled until Square/PayPal payment integration is wired server-side in a dedicated future phase.

3. Improve account/profile freshness after edits - completed June 8, 2026
   - Profile saves revalidate `/account`, `/catering`, and `/personal-chef`.
   - The account profile modal refreshes the current route after saving.
   - Checkout keeps using `cache: "no-store"` for profile hydration on mount.

4. Service request form UX pass - completed June 8, 2026
   - Browser form validation failures redirect back to the request form with friendly visible feedback.
   - Non-browser/API validation failures still receive JSON error responses.
   - Catering and Personal Chef forms include helper text for event date, guest count, location, and requested menu/service details.
   - Both workflows still route through `CateringRequest` while keeping distinct customer-facing copy.

5. Admin service request workflow polish - completed June 8, 2026
   - Admin service request status controls lock completed, cancelled, and denied requests.
   - Deposit due requires a positive deposit amount.
   - Deposit paid must go through the mark-deposit-paid action so `depositPaidAt` and customer email behavior stay consistent.
   - Quote editing is locked after final states, denied approvals, or paid deposits.
   - Admin and customer detail pages display zero-dollar quote and deposit values as `$0.00`.
   - Zero-dollar deposits are treated as no deposit due instead of a payable deposit.

6. Weekly meal plan modeling discovery - completed June 8, 2026
   - `docs/weekly-meal-plan-discovery.md` documents the desired admin workflow for weekly menu periods, package offerings, lunch/dinner choices, publishing, and fulfillment prep.
   - The customer workflow keeps weekly meal plans inside `/menu` and cart checkout.
   - Updated June 9, 2026: the recommended next model is a fixed-offering flow where customers choose package length, 1- or 2-meal package options, spice level, and allowed protein substitutions only.
   - Updated June 9, 2026: customer account allergen preferences and allergen conflict alerts should be added before checkout completion.
   - Updated June 13, 2026: business decisions are resolved. Use controlled allergen checkboxes, require allergen acknowledgement, show alerts for all food items, store acknowledgement at order and item level, allow multiple meal plans per cart, keep weekly packages fixed price, order only from the current week, cap weekly menus at 10 orders, support cloning/rotation, and require approval for additional proteins such as beef, pork, and lamb.
   - No schema or route changes were made.

7. Gallery and image management next step - completed June 9, 2026
   - `docs/gallery-image-management.md` documents the current static gallery approach and image upload direction.
   - Public gallery data now points at optimized WebP image assets so the demo gallery does not reference missing `/gallery/*.jpg` files.
   - Keep gallery curation static/code-based for now.
   - Keep image fields URL-based.
   - Keep original HEIC files as source assets and use WebP copies for public gallery rendering.
   - Treat `public/uploads` runtime writes as local/demo-only until production storage is confirmed.
   - Avoid tying gallery management to weekly meal plan modeling.

8. Admin gallery management and menu item deletion - completed June 9, 2026
   - Added a `GalleryImage` Prisma model and migration seeded with the existing optimized WebP gallery.
   - Added `/admin/gallery` and dashboard navigation for gallery image upload, edit, categorization, ordering, replacement, and deletion.
   - Public `/gallery` reads from database records with `data/gallery.ts` as a static fallback.
   - Gallery uploads are stored under `public/uploads/gallery` for local/demo use.
   - Added guarded menu item hard-delete support while preserving historical order snapshots with `OrderItem.menuItem` set null on delete.
   - Restored active menu item Archive action and added Delete action to active and archived menu item views.
   - Applied migration `20260609210000_add_gallery_images` to the configured local development database.

9. Deployment readiness pass - completed June 12, 2026
   - Required environment variable names are captured in `.env.example`.
   - Email links use `NEXT_PUBLIC_APP_URL` via `lib/email.ts`; set it to the production public URL before launch.
   - Prisma migrations are present through `20260611030722_add_order_allergen_acknowledgement`, and `prisma migrate status` reports the local development database is up to date.
   - `prisma/seed.ts` seeds common allergens and business settings.
   - `npm run admin:promote` promotes an already registered account using `ADMIN_EMAIL` and optional `ADMIN_ROLE`.
   - `npm run check` passes as the release validation workflow.
   - Remaining deployment decision: replace or back `public/uploads` with durable production storage before relying on admin image uploads in production.

10. Production upload storage decision - safe interim completed June 12, 2026

- Local `public/uploads` writes are blocked by default in production.
- Set `ALLOW_LOCAL_UPLOADS_IN_PRODUCTION="true"` only after confirming the deployment target has durable, shared local storage.
- Gallery image create/edit and menu item create/edit now accept public image URLs for externally hosted durable assets.
- Remaining optional decision: implement direct object-storage uploads after the production storage provider is selected.

11. Meal plan fixed-offering alignment - completed June 12, 2026

- The existing admin meal plan template now creates spice level and protein substitution choices only.
- Removed stale meal-plan template entries that exposed meal count, vegetable, starch, or broad substitution choices.
- Public menu and item modal copy now describes fixed meal plan offerings with limited spice/protein substitution options.

12. Meal plan customer option enforcement - completed June 12, 2026

- Public meal plan cards expose only spice level and protein substitution option groups.
- Order creation rejects stale meal plan cart selections for older customer-facing option groups.

13. Client cart persistence reset - completed June 12, 2026

- Bumped the persisted cart store version so older local browser carts are cleared on hydration.
- Keep the cart client-side for now; revisit database-backed carts only if the product needs cross-device cart continuity.

14. Admin allergen tagging hardening - completed June 12, 2026

- Admin menu allergen checkboxes preload the item's saved allergens.
- Invalid menu item or allergen IDs are rejected before replacing allergen tags.
- Allergen tag replacement now happens inside a transaction and revalidates `/menu` and `/admin/menu`.

15. Admin menu cache revalidation - completed June 12, 2026

- Added a shared menu revalidation helper for menu-related route handlers.
- Menu create, edit, delete, archive, restore, availability, option, allergen, template, and category mutations now invalidate the affected public/admin menu pages.

16. Admin option validation hardening - completed June 12, 2026

- Option group creation and option choice editing now validate choice names, non-negative price deltas, and public image URLs server-side.
- Admin option forms now show validation messages returned from the API.

17. Weekly meal plan business decisions - completed June 13, 2026

- Updated `docs/weekly-meal-plan-discovery.md` with the resolved weekly meal plan business decisions.
- Dedicated weekly menu models are now the recommended next direction, with current-week ordering, 10-order weekly capacity, cloning/rotation, fixed package prices, all-food allergen alerts, order/item allergen acknowledgement snapshots, and request-only approval for additional proteins.
- No schema migration has been applied yet.

18. Weekly meal plan schema proposal - completed June 13, 2026

- Added `docs/weekly-meal-plan-schema-proposal.md`.
- The proposal keeps the existing `MenuItem` checkout flow stable and adds dedicated weekly period, package, offering, allowed-option, allergen, capacity, clone-source, and order snapshot models as the recommended first migration direction.
- The first migration should be additive only and should not rewrite existing menu items, historical orders, routes, or checkout behavior.

19. First weekly meal plan schema migration - completed June 13, 2026

- Added migration `20260613014948_add_weekly_meal_plan_models`.
- Added `WeeklyMenuStatus` and `WeeklyMealPlanOptionType`.
- Added weekly menu period, package, offering, allowed option, and weekly offering allergen models.
- Added `OrderWeeklyMealPlanSelection` for order item weekly meal plan snapshots.
- Added item-level allergen acknowledgement fields to `OrderItem`.
- Applied the migration to the configured local development database and confirmed `prisma migrate status` reports the database is up to date.
- `npm run check` passes after the schema migration.

20. Admin weekly menu management slice - completed June 13, 2026

- Added `/admin/menu/weekly` as a stable admin subroute from the existing Menu Manager.
- Admins can list, create, and edit weekly menu periods with label, date range, ordering cutoff, status, capacity, and fulfillment notes.
- Admins can add and edit weekly meal plan packages for each period.
- Package validation is limited to 5- or 7-day packages with 1 or 2 meals per day.
- Duplicate packages for the same weekly menu/day/meal count are blocked by API validation and the schema uniqueness rule.
- Published weekly menus cannot overlap another published weekly menu date range.
- This slice intentionally does not wire weekly offerings, allergens, cloning/rotation, public `/menu`, cart, checkout, kitchen prep, or emails yet.

21. Admin weekly offering/options management slice - completed June 13, 2026

- Extended `/admin/menu/weekly` so admins can create, edit, and delete fixed weekly meal offerings for each weekly period.
- Weekly offerings can be tagged with controlled allergen checkboxes using the shared allergen records.
- Admins can create, edit, and delete allowed spice level and protein substitution options for each offering.
- Weekly option validation only allows spice level and protein substitution option types.
- Request-only and chef approval flags are limited to protein substitutions, and request-only substitutions must require approval.
- Duplicate offering names per weekly menu and duplicate option type/name pairs per offering are blocked by API validation and schema uniqueness rules.
- This slice intentionally does not wire cloning/rotation, public `/menu`, cart, checkout, kitchen prep, or emails yet.

22. Admin weekly menu cloning/rotation controls - completed June 13, 2026

- Added a clone action to `/admin/menu/weekly` for each weekly period.
- Cloning creates a new draft weekly period with fresh capacity usage and a `cloneSourceId` pointing back to the source period.
- The clone form defaults the new period one week after the source period and allows admins to adjust label, date range, cutoff, capacity, and fulfillment notes.
- Cloning copies packages, fixed offerings, offering allergen tags, and allowed spice/protein options.
- Cloning does not copy orders or order selections.
- This slice intentionally does not wire public `/menu`, cart, checkout, kitchen prep, or emails yet.

23. Public weekly meal plan display slice - completed June 13, 2026

- Public `/menu` now shows the current published weekly menu when today's date is inside the published weekly period.
- The weekly display includes available packages, fixed offerings, allergen labels, dietary info, and available spice/protein options.
- Weekly option price deltas and approval-required protein substitutions are visible as read-only public details.
- `/menu` is now rendered dynamically so the current-week display can roll over by date.
- Existing menu item category filtering now includes the weekly meal plan section when a current published weekly menu exists.
- This slice intentionally does not add weekly meal plans to cart, checkout, kitchen prep, or emails yet.

24. Weekly meal plan cart/checkout wiring slice - completed June 13, 2026

- Public `/menu` now lets customers add a current published weekly meal plan to cart by selecting package, fixed offering, spice level, and optional protein substitution.
- Weekly cart items preserve package, offering, spice, protein, price delta, request-only, approval-required, and allergen details in the client cart state.
- Cart and checkout allergen warnings include weekly offering allergens using the existing account allergen preference workflow.
- Order creation revalidates weekly selections from live weekly records before creating the order.
- Weekly checkout rejects stale carts when the weekly period is no longer current, no longer published, past cutoff, unavailable, at capacity, or has changed price/options.
- Weekly capacity increments once per order, not once per weekly meal plan item, matching the schema proposal.
- Order creation now writes `OrderWeeklyMealPlanSelection` snapshots and item-level allergen acknowledgement/conflict snapshots for weekly and regular menu items.
- This slice intentionally does not fully surface weekly snapshots in customer order detail, admin order detail, kitchen prep, or confirmation emails yet.

25. Weekly meal plan order snapshot visibility slice - completed June 13, 2026

- Customer order detail pages now include saved weekly meal plan package, offering, spice, protein, price delta, request-only, and approval-required snapshot details.
- Admin order detail and printable kitchen ticket pages now include the same weekly snapshot details.
- The admin kitchen board now selects weekly order snapshots and passes only serializable values into the client kitchen card.
- Order confirmation emails now include weekly meal plan snapshot details for weekly order items.
- Order creation now includes `OrderWeeklyMealPlanSelection` records when building the immediate confirmation email payload.
- No route or data model changes were made.

26. Legacy cleanup later, not now

- Do not rename `/admin/catering`, `/account/catering`, or `CateringRequest` yet.
- Do not remove `OrderType.CATERING` until all historical data and route assumptions are reviewed.
- Do not remove `MenuItemType.PLATE` until the client confirms it is no longer needed and existing data is migrated or archived.
- Prefer user-facing label cleanup over model/route renames until production behavior is stable.

27. Weekly meal plan reorder and list summary slice - completed June 13, 2026

- Historical weekly meal plan order items are now treated as display-only for generic reorder.
- The account reorder button skips weekly meal plan snapshots and explains that weekly meal plans must be ordered from the current weekly menu.
- Order creation rejects recovered/reorder submissions that point at a previous weekly meal plan snapshot, covering stale persisted carts and direct payloads.
- Account order history now includes weekly meal plan snapshot details for weekly items.
- Account dashboard, admin dashboard, admin order list, admin customer detail, and admin customer list views now show compact weekly meal plan indicators/counts.
- No route or data model changes were made.

28. Weekly meal plan fulfillment prep and manual QA checklist - completed June 13, 2026

- Public weekly capacity was confirmed as visible on `/menu`, and checkout already blocks over-capacity weekly orders.
- Admin weekly menu periods now show clearer capacity used/remaining copy.
- `/admin/menu/weekly` now includes a read-only Weekly Fulfillment Prep summary for each period.
- Fulfillment prep groups active weekly selections by offering, package, spice level, and protein substitution.
- Fulfillment prep shows active weekly order counts plus request-only, approval-required, and allergen conflict counts.
- Fulfillment prep lists active weekly orders for the period with links back to the admin order detail/kitchen ticket.
- Added `docs/weekly-meal-plan-manual-qa.md` for local browser testing and repeatable weekly menu checks.
- No route or data model changes were made.

29. Weekly admin form layout usability pass - completed June 13, 2026

- Weekly menu period, clone, package, offering, and option forms now avoid viewport-based multi-column grids inside nested admin cards.
- Expanded weekly offering editors now stack the offering edit form, image/delete controls, allergen editor, and option controls so fields do not collide or overflow.
- Treat weekly admin data-entry forms as human-readable working surfaces first; prefer stacked controls inside constrained cards over dense multi-column layouts.
- `npm run check` passes after the layout update.
- Browser verification confirmed the expanded weekly offering editor has no horizontal overflow at the default desktop viewport. A narrower viewport reload was blocked by the local Browser runtime URL policy, so mobile should still be checked manually.

30. Weekly menu date-only semantics and QA precondition audit - completed June 14, 2026

- Added a shared weekly menu date helper so weekly period start/end dates are treated as business date-only ranges instead of exact UTC instants.
- Admin weekly menu display now shows the selected start and end dates without shifting one day early in local time.
- Public `/menu` and checkout order validation now compare the current business date against the full selected weekly date range.
- Weekly menu creation and cloning now validate ordering cutoff against the full end date instead of midnight at the beginning of the end date.
- Added `BUSINESS_TIME_ZONE` to `.env.example`, defaulting weekly date checks to `America/New_York`.
- `npm run check` passes after the date semantics update.
- Manual QA preconditions were audited: the current local weekly menu starts June 15, 2026, has one 2-meal package, one offering, no spice/protein options, and no allergen tags. Full checkout submission was not run because `RESEND_API_KEY` is configured locally and submitting would create an order and send email.

31. Email preview and weekly checkout QA pass - completed June 14, 2026

- Confirmed `EMAIL_DRY_RUN=true` and `EMAIL_PREVIEW_FILES=true` are present locally so checkout QA writes `.email-previews/*.eml` instead of sending real email.
- `npm run check` passes after the email preview commit.
- Completed weekly menu QA test data in the local development database: one 1-meal package, one 2-meal package, Mild/Spicy options, a Lamb request-only approval-required protein substitution, and a Wheat allergen tag matching the QA customer account.
- Browser verified `/menu`, cart, and checkout surfaces show weekly package/offering/spice/protein snapshots, Lamb approval-required messaging, customer profile prefill, per-item Wheat allergen warnings, and the required allergen acknowledgement blocker.
- The local Browser runtime did not dispatch the final checkout form submit reliably from the sticky review column, so the order creation path was verified with an authenticated local `/api/orders` request using the same weekly payload.
- The verified QA order `cmqekqa1i00004gtkv9i9v8c4` stored delivery/contact snapshots, order-level and item-level allergen acknowledgements, two weekly meal plan snapshots, and a pending approval status because of the Lamb substitution.
- Weekly capacity for the test period incremented once for the order, from 0 to 1, even though the order contained two weekly meal plan items.
- The generated email preview includes contact/delivery details, allergen acknowledgement copy, weekly meal plan snapshots, the Lamb approval-required details, and the correct $217.00 total.

32. Weekly meal plan admin fulfillment QA pass - completed June 15, 2026

- Browser verified `/admin/menu/weekly` fulfillment prep for the QA period shows capacity `1/10`, one active order, two weekly meal plan items, offering/package/spice/protein group counts, one request-only approval-required protein substitution, and two Wheat allergen flags.
- Browser verified `/admin/orders/cmqekqa1i00004gtkv9i9v8c4` shows the saved delivery/contact snapshot, both weekly meal plan snapshots, Lamb request-only approval-required details, and allergen acknowledgement.
- The printable kitchen ticket uses the admin order detail page, and the weekly snapshot sections are in the print-visible main content while admin action controls are hidden in print.
- Approved the QA order through the admin approval UI with email dry-run enabled; the order now has approval status `APPROVED`, order status `ACCEPTED`, and an approval email preview saved under `.email-previews`.
- Browser verified `/admin/kitchen` shows the approved QA order with both weekly snapshots, the Lamb approval-required detail, requested time, and a View / Print Ticket link.
- Fixed `UpdateOrderStatusForm` so its local status dropdown syncs when `router.refresh()` brings in a new server status after approval or status updates.
- `npm run check` passes after the admin fulfillment QA fix.

33. Production readiness config/copy cleanup - completed June 15, 2026

- Added `.codex-next-dev*.log` to `.gitignore` so local Codex/dev-server log files stay out of commits.
- `.env.example` now calls out that local uploads are development-only by default and production should use durable object storage unless local uploads are explicitly allowed as a temporary exception.
- `.env.example` now documents that production email delivery requires both `RESEND_API_KEY` and `EMAIL_DRY_RUN=false`, while local QA should keep dry-run preview files enabled.
- The email helper now exposes an explicit delivery mode: live, preview files, dry-run, or disabled.
- `/admin/notifications` now reports email preview/dry-run/live/disabled status accurately instead of treating a configured Resend key as live delivery when dry-run is enabled.
- Checkout, customer order details, and customer service request details now use clearer manual payment copy for invoice, cash/offline payment, and deposit instructions.
- No route or data model changes were made.

34. Launch readiness checklist and environment guard - completed June 15, 2026

- Added `docs/launch-readiness-checklist.md` with production environment variables, durable upload storage posture, email live-send test steps, manual payment notes, browser smoke coverage, and database launch commands.
- Added `npm run env:check` using `scripts/check-production-env.mjs` to catch production blockers such as placeholder secrets, localhost URLs, non-HTTPS app URLs, dry-run email, invalid upload flags, and incomplete core launch settings.
- The checker does not print secret values.
- Verified the checker in report-only mode against the current local `.env`; it correctly reports the local development environment as not production-ready because it uses localhost URLs, dry-run email, and lacks some production launch settings.
- Direct production uploads still intentionally wait on the chosen durable storage provider; current safe posture is to keep local production uploads blocked and use public image URLs for production assets.
- Public `/gallery` now renders dynamically so gallery database records are read at request time instead of requiring database access during production build/prerender.
- No route or data model changes were made.

35. Final customer-facing smoke/copy pass - completed June 16, 2026

- Browser smoke-tested public home, `/menu`, cart, checkout, catering request, personal chef request, gallery, customer order detail, admin notifications, and admin payments on desktop.
- Browser smoke-tested the same customer-facing surfaces plus admin notification/payment pages at a compact mobile viewport.
- No route or workflow changes were made.
- Fixed mobile horizontal overflow caused by the shared header navigation by allowing the header/nav to wrap and making the cart count badge inline.
- Wrapped the admin payments table in its own horizontal scroll container so narrow screens do not force the whole page wider.
- Cleaned one home-page Personal Chef image alt text phrase.
- Browser verification after the fix confirmed no page-level horizontal overflow on the checked mobile pages and no console errors on the smoke-tested pages.

36. Final production-readiness review - completed June 16, 2026

- `npm run check` passes after the final smoke/copy polish commit.
- `prisma migrate status` reports 16 migrations and the configured local development database schema is up to date.
- `npm run env:check -- --report` runs without exposing secret values and correctly reports the current local `.env` as not production-ready.
- Updated `docs/launch-readiness-checklist.md` with the June 16 review status and remaining production blockers/warnings.
- Remaining blockers before launch are non-code deployment tasks: set production `https://` app/auth URLs, set `BUSINESS_TIME_ZONE`, disable email dry-run for the live-send test, decide/confirm durable upload storage posture, set `OWNER_EMAIL` before owner bootstrap, and execute the final manual QA checklist in the target environment.

37. Weekly capacity wording clarification - completed June 16, 2026

- Confirmed current weekly capacity behavior matches the resolved business rule: capacity counts submitted customer orders per weekly menu, not weekly meal plan item quantity or package count.
- Public weekly menu copy now says weekly order slots instead of generic spots.
- Admin weekly menu create/clone forms now label the field as Order Capacity and explain that it counts submitted customer orders, not meal plan item quantity.
- Admin weekly menu capacity displays now use weekly order/order slot wording.
- Weekly meal plan manual QA now explicitly checks that capacity increments once per customer order, even when a cart contains multiple weekly plan items or quantities.
- No transaction, route, or data model changes were made.

38. Customer-facing visual refresh / brand polish pass - completed June 16, 2026

- Added a warm customer-facing brand system with shared page, container, card, button, eyebrow, focus, and selection styling.
- Refreshed the public home, menu, cart, checkout, catering request, personal chef request, gallery, login, register, customer account, customer orders, and customer service request detail/list pages.
- Refreshed shared customer-facing components including the site header/footer, menu cards, category filters, weekly menu section, weekly order builder, cart summary, add-to-cart controls, allergen warnings, account profile/allergen forms, profile modal, and reorder button.
- Used existing local logo/gallery imagery for the visual pass; final client-approved hero/service imagery and final social URLs are still needed before launch polish is considered complete.
- Fixed the `/menu` customization modal so it renders through a document body portal instead of being clipped by the menu card layout.
- Fixed mobile `/menu` horizontal overflow caused by long weekly meal plan select labels in the weekly order builder.
- Browser smoke-tested `/`, `/menu`, `/cart`, `/checkout`, `/catering`, `/personal-chef`, `/gallery`, `/login`, and `/register` on desktop and a compact mobile viewport with no page-level horizontal overflow or browser console errors.
- `npm run check` passes after the visual refresh and modal/mobile fixes.
- No database schema, route, checkout/order business logic, payment, scheduling, allergen, approval, or validation behavior was intentionally changed.

39. Admin dashboard refresh first slice - completed June 16, 2026

- Added a scoped admin visual system with admin page, container, card, filter chip, table, badge, action link, and back link styles.
- Refreshed `/admin` with stronger dashboard hierarchy, operational metric cards, quick actions, alert cards, business rule summaries, recent orders, and quick links.
- Refreshed `/admin/orders` with active filter chips, clearer status/approval/payment badges, result counts, and a horizontally contained admin table for smaller screens.
- Refreshed `/admin/catering` with separate request-type and workflow filter groups, active filter states, clearer service request badges, result counts, and a responsive table container.
- Refreshed `/admin/kitchen` and kitchen order cards for better prep scanability, weekly snapshot readability, allergy alerts, and stacked action controls on narrow screens.
- Lightly refreshed admin order and service request detail pages plus related approval, status, quote, and paid-action controls without changing workflow behavior.
- Browser smoke-tested `/admin`, `/admin/orders`, `/admin/catering`, `/admin/kitchen`, one admin order detail page, and one service request detail page on desktop and compact mobile viewports with no page-level horizontal overflow or browser console errors.
- `npm run check` passes after the admin refresh slice.
- No database schema, routes, approval guards, payment tracking, quote/deposit, allergen acknowledgement, or order/status workflow logic was intentionally changed.

40. Admin dashboard refresh remaining management surfaces - completed June 17, 2026

- Extended the scoped admin visual system with shared admin input, label, primary/secondary/danger button, section heading, row-card, and disabled-state styles.
- Refreshed `/admin/menu`, `/admin/menu/weekly`, `/admin/gallery`, `/admin/customers`, `/admin/customers/[id]`, `/admin/payments`, `/admin/reports`, `/admin/notifications`, `/admin/settings`, `/admin/menu/categories`, and `/admin/menu/archived`.
- Polished dense menu, weekly menu, gallery, category, business settings, package, offering, option, allergen, and customization forms so controls stack cleanly and use consistent focus/hover states.
- Aligned recurring admin action controls for archive, delete, restore, availability, meal plan template application, weekly option/offering deletion, gallery deletion, and option choice editing.
- Browser smoke-tested the refreshed admin management routes on desktop, plus compact mobile checks for opened `/admin/menu` and `/admin/menu/weekly` detail panels, with no page-level horizontal overflow or browser console errors in the tested tab.
- `npm run check` passes after the remaining admin refresh. The then-existing `components/layout/SiteFooter.tsx` unused `Image` lint warning was unrelated to this admin work and was cleaned up in item 41.
- No database schema, routes, API behavior, approval guards, payment tracking, allergen acknowledgement, order workflow, menu workflow, or weekly capacity logic was intentionally changed.

41. Launch readiness validation refresh - completed June 18, 2026

- Re-ran the launch checklist validation commands after the About page commit.
- `npm run check` passes without lint warnings after removing an unused `next/image` import from the site footer.
- Prisma reports 16 migrations and the configured local development database schema is up to date.
- `npm run env:check -- --report` runs without printing secret values when invoked through the working npm path.
- Next patched `package-lock.json` with the missing SWC optional dependency entries during build; keep this lockfile update so future installs/builds do not repeat the warning.
- Current production URL target is `https://rahstwistedkitchen.com`; production env values for `NEXT_PUBLIC_APP_URL`, `AUTH_URL`, and `NEXTAUTH_URL` should use that origin. `EMAIL_DRY_RUN` must be `false` before live email sending.
- Remaining warnings are local production uploads not explicitly configured, email preview files enabled, online checkout intentionally disabled while Square/PayPal integration is future work, and `OWNER_EMAIL` not set for owner bootstrap.
- Updated `docs/launch-readiness-checklist.md` with the June 18 review status.

42. Admin dashboard user guide - completed June 18, 2026

- Added `docs/admin-dashboard-user-guide.md` as an in-depth operator guide for the admin dashboard.
- The guide covers admin access, daily operations, dashboard metrics, orders, kitchen workflow, service requests, menu management, weekly menus, gallery management, customer lookup, payments, reports, notifications, business settings, image uploads, allergens, approval safeguards, operating cadence, common mistakes, launch notes, and troubleshooting.
- The guide explicitly notes that `/admin/catering` is the shared Service Requests workflow for Catering and Personal Chef, and that menu category display names should not be confused with menu item type behavior.
- No app behavior, routes, schema, or business logic were changed.

43. Admin reports Business Insights section - completed June 19, 2026

- Added an additive Business Insights section to `/admin/reports` while keeping the existing report cards, order breakdown, top ordered items, operational alerts, and revenue snapshot content in place.
- Added `lib/admin-report-metrics.ts` for server-side period aggregation of revenue, order count, average order value, pending approvals, manual-payment follow-up, service request counts, revenue trend, order status/type breakdowns, and top selling item quantity/revenue.
- Added reusable admin report components under `components/admin/reports` for KPI cards, empty chart states, responsive bar charts, revenue trend charts, top selling item summaries, and the composed Business Insights section.
- Business Insights supports 30-day, 90-day, and 12-month period filters and shows polished empty states when there is not enough data for a chart.
- `npm run check` passes after the reports enhancement.
- No database schema, checkout/order/payment, service request, approval, routing, or admin workflow behavior was changed.

44. Pre-launch QA runbook and client launch information list - completed June 19, 2026

- Added `docs/pre-launch-qa-runbook.md` with a practical end-to-end QA process for public pages, account/profile/allergen flows, menu/cart/checkout, order details, email previews, admin orders, kitchen, service requests, weekly menus, gallery/menu management, reports, notifications, settings, accessibility, mobile, and production smoke testing.
- Added `docs/client-launch-information-needed.md` with launch-blocking production details, email requirements, upload/storage decisions, business settings, launch menu data, payment policy, legal/customer policy copy, brand/content assets, QA approvers, and a suggested client message.
- The new docs are launch-support documentation only; no app source, schema, route, workflow, checkout, payment, approval, or email behavior was changed.

45. Suggested next Codex prompt

- Pause code changes until production environment values, durable upload storage, admin account promotion, and the first live email test environment are ready; then run the launch checklist end to end and fix only issues found during that final deployment QA.

46. Customer ownership/security review fixes - completed June 27, 2026

- Fixed the legacy `/api/profile` update route so it returns only non-sensitive profile fields, matching the safer `/api/account/profile` response shape.
- Restored admin mark-paid behavior in `/api/orders/[id]/mark-paid` so admin-gated payment updates are not incorrectly filtered by the admin user's customer email.
- Updated `/orders/[id]` to query by order ID plus the signed-in user's email so the customer detail page does not load another customer's order before authorization.
- Cleaned account profile route formatting around the existing safe selected-field response.
- `npm run check` passes after these fixes.

47. Admin audit logging review - completed June 27, 2026

- Reviewed the existing `AdminAuditLog` model, `writeAdminAuditLog` helper, and all admin mutation routes under `/api/admin`.
- Confirmed existing audit coverage for order approvals, order status/payment changes, service request approvals/status/quote/deposit changes, gallery image changes, menu item create/update/archive/restore/delete/availability changes, and weekly menu period/offering/package/option changes.
- Added missing additive audit logs for menu item allergen assignment, meal plan template application, menu option group create/delete, menu option choice updates, menu category updates, weekly offering allergen assignment, and business settings updates.
- Left the admin order allergen/options snapshot routes unlogged because they return `410` unsupported-operation responses and do not mutate data.
- No Prisma schema, route, UI, checkout, payment, menu, weekly meal plan, gallery, order, or service request business logic changes were made.
- `npm run check`, `npm run build`, and `git diff --check` pass after the audit logging additions.

48. Category-scoped gallery drag-and-drop ordering - completed August 30, 2026

- Added an accessible sortable Gallery Manager that keeps All Images read-only and enables deliberate Save Order and local Reset Order actions only for a complete selected category.
- Reused the existing `GalleryImage.sortOrder` field with no schema migration. Meal Prep and Meal Plans records share one normalized scope; database-backed public All ordering follows configured category order with deterministic sort-order, creation-time, and ID tie-breakers.
- Added an admin-protected, complete-set-validated transactional reorder endpoint with cache revalidation and one audit event per saved category order.
- New images and category changes append to their destination category, while deletion gaps remain safe until the next reorder. Built-in import planning now appends independently within each normalized category.
- Added focused ordering QA while preserving gallery fallback authority, durable upload/file cleanup protections, payments, orders, Prisma/MariaDB configuration, and the scoped MariaDB security override.
- Closed the authenticated keyboard-QA gap on August 30, 2026. The rendered failure combined missing Space/Enter activation guidance with dnd-kit's geometry-based keyboard coordinate getter choosing incorrect off-screen cards as the variable-height grid scrolled. The Gallery Manager now uses a responsive-grid-specific directional getter, applies the tracked logical target on drop, announces image titles and positions accurately, and provides visible handle-associated instructions plus pickup/cancel feedback. Authenticated desktop and narrow-layout checks covered Space/Enter, all arrow directions, Escape, pointer, reset, save/refresh/public persistence, category isolation, failed-save rollback, and stale-scope handling.

Next work items - June 16, 2026:

## Completed Visual Refresh / Brand Polish Pass

Completed June 16, 2026 and recorded above in item 38. The original scope is retained below as a design record.

A customer-facing visual refresh should happen once the current functional checkout/profile/order flow work is stable.

### Goal

Create a modern, responsive, polished customer experience for Chef Rah’s Twisted Kitchen with a cohesive brand identity, strong visual hierarchy, bold typography, clear calls to action, improved spacing, refined cards/sections, and better mobile presentation.

### Priority pages

- Home page
- Menu / Meal Plans page
- Cart page
- Checkout page
- Customer account order/request pages
- Shared customer-facing UI components

Admin pages are lower priority unless shared components affect both admin and customer experiences.

### Design direction

- Warm, premium-but-approachable food-service brand
- Strong hero sections and conversion-focused CTAs
- Clear customer pathways:
  - View Meal Plans
  - Start an Order
  - Request Catering
  - Request Personal Chef Service

- Improved typography scale and section spacing
- Polished cards, badges, alerts, buttons, and empty states
- Subtle microinteractions using Tailwind hover/focus/transition states
- Accessible contrast and keyboard-friendly focus states

### Image/performance notes

Use existing local/gallery images where possible. Avoid adding large unoptimized remote images. Prefer Next.js Image for image-heavy sections. If final client-provided hero/brand imagery is not available, use existing assets or tasteful placeholders and document the remaining image needs.

### Constraints

- Do not change database schema for this pass.
- Do not alter checkout/order business logic.
- Do not remove validation, approval, allergen, payment, or scheduling behavior.
- Do not break existing routes.
- Run npm run check before completion.

### Expected output

The branch should include a summary of changed pages/components, any remaining client image/content needs, and validation results.

## Admin Dashboard Refresh

First slice completed June 16, 2026 and recorded above in item 39. Remaining management-surface polish completed June 17, 2026 and recorded above in item 40. The original scope is retained below as a design record.

### Goal

Modernize the admin experience without changing business logic. The admin dashboard should feel clean, organized, fast to scan, and easy to use during real order, catering, menu, gallery, and customer-management workflows.

### Priority admin areas

- Admin dashboard overview
- Orders list and order detail pages
- Catering / personal chef request management
- Menu and weekly meal plan management
- Gallery/image management
- Business settings
- Customer/account lookup areas if present

### Design direction

- Clear dashboard hierarchy with key metrics and status cards
- Better visual separation between pending, approved, denied, paid, unpaid, and completed records
- Improved table readability and responsive behavior
- More consistent admin buttons, badges, filters, forms, and empty states
- Clear action areas for approve, deny, update payment, archive, and edit workflows
- Subtle microinteractions for hover/focus/loading states
- Accessible contrast and keyboard-friendly focus states
- Keep admin pages practical and workflow-focused rather than overly decorative

### Constraints

- Do not change database schema unless specifically approved.
- Do not alter order approval, payment tracking, allergen acknowledgement, or request workflows.
- Do not remove existing admin functionality.
- Avoid redesigning customer-facing pages in this branch.
- Run npm run check before completion.
