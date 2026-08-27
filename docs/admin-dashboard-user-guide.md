# Chef Rah's Twisted Kitchen Admin Dashboard User Guide

Last updated: August 27, 2026

This guide explains how to use the admin dashboard for daily operations, menu management, service requests, weekly meal plans, gallery updates, customer lookup, payments, reports, notifications, and business settings.

The dashboard is the operating center for paid pickup/delivery orders, weekly and approval-required orders, Square reconciliation, Catering and Personal Chef requests, catalog publication, and launch-hold controls. During the current content hold, admins control new purchasing through menu and weekly publication while continuing to monitor existing orders, service leads, and active payment links.

The guide is written for business admins, kitchen staff, and trusted operators. It avoids developer-only details unless they affect how the dashboard should be used.

## Quick Start

### Admin Access

Only accounts with the `ADMIN` or `OWNER` role can access the admin dashboard.

| Role    | Access                                                                                                                                       |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `OWNER` | All normal admin pages plus the owner-only Role Manager. The owner can assign `CUSTOMER`, `ADMIN`, or `OWNER` to registered users.           |
| `ADMIN` | Normal admin operations, including orders, kitchen, menus, customers, reports, notifications, and settings. Admins cannot manage user roles. |

1. Register or sign in with the admin account.
2. Go to `/admin`.
3. If the account does not have admin access, the app redirects away from the dashboard.

Before launch, register and bootstrap the first owner using the documented launch command:

```powershell
npm run owner:promote
```

That command requires `OWNER_EMAIL` to match an existing registered account. It does not create a user, invitation, or passwordless account. Once signed in, the owner can open `/admin/role-manager` and assign `ADMIN` access to additional users who registered normally.

In Role Manager:

1. Find the registered user by name or email.
2. Select `ADMIN` from that user's role list.
3. Choose Update Role.
4. Confirm the user can open the normal admin dashboard.

Keep at least one owner at all times. The page disables unsafe last-owner demotion, and the server rejects it even if a request is submitted manually. Successful role changes are written to the admin audit log with the acting owner, target user, previous role, new role, and timestamp.

### Main Admin Routes

| Area                   | Route                    | Purpose                                                                                                                                             |
| ---------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard              | `/admin`                 | Main control center with metrics, alerts, recent orders, and quick links.                                                                           |
| Orders                 | `/admin/orders`          | Review, filter, and open customer orders.                                                                                                           |
| Order detail           | `/admin/orders/[id]`     | Approve or deny orders, update status, mark paid, review snapshots, and print kitchen tickets.                                                      |
| Kitchen view           | `/admin/kitchen`         | Prep-ready approved orders in active kitchen statuses.                                                                                              |
| Service Requests       | `/admin/catering`        | Shared queue for catering and personal chef requests.                                                                                               |
| Service request detail | `/admin/catering/[id]`   | Approve or deny requests, quote, manage deposits, and update request status.                                                                        |
| Menu manager           | `/admin/menu`            | Manage standard menu items, categories, type, availability, allergens, and option groups.                                                           |
| Weekly menu manager    | `/admin/menu/weekly`     | Manage weekly periods, packages, slot labels, General/Breakfast offerings, allowed options, ordering windows, and fulfillment prep.                 |
| Menu categories        | `/admin/menu/categories` | Rename display categories and control sort order.                                                                                                   |
| Archived menu items    | `/admin/menu/archived`   | Restore or permanently delete archived menu items.                                                                                                  |
| Gallery manager        | `/admin/gallery`         | Manage uploaded gallery images and review built-in site images.                                                                                     |
| Customers              | `/admin/customers`       | Search customers and review order/payment activity.                                                                                                 |
| Customer detail        | `/admin/customers/[id]`  | Review a customer account, order history, service requests, and payment alerts.                                                                     |
| Payments               | `/admin/payments`        | Reconcile website and Square payment state, receipts, refunds, and payment requests.                                                                |
| Reports                | `/admin/reports`         | Review revenue, order, payment, approval, and service request metrics.                                                                              |
| Notifications          | `/admin/notifications`   | Review active/planned notification types and current email delivery mode.                                                                           |
| Business settings      | `/admin/settings`        | Manage fees, general order rules, global checkout scheduling, weekly ordering windows, fixed fulfillment, and customer-facing fulfillment messages. |
| Role manager           | `/admin/role-manager`    | Owner-only user role management for registered customer, admin, and owner accounts.                                                                 |

## Daily Operating Workflow

Use this sequence during regular order operations.

1. Open `/admin`.
2. Review the metric cards and Operational Alerts.
3. Open pending orders from `/admin/orders`.
4. Approve or deny any orders requiring chef review.
5. Confirm payment due orders from `/admin/payments` or the order detail page.
6. Move approved orders through kitchen status from `/admin/kitchen` or the order detail page.
7. Review service requests from `/admin/catering`.
8. Quote and approve service requests as needed.
9. Review `/admin/menu/weekly` before each ordering window to confirm the published weekly menu, package options, allergen tags, and capacity.

For a busy prep day, keep `/admin/kitchen` open and use order detail pages for printable tickets.

## Dashboard Overview

Route: `/admin`

The dashboard is the control center. It shows high-level operating metrics and links to the areas that need attention.

### Metric Cards

The dashboard includes cards for:

- Pending Orders
- Service Request Approvals
- Active Orders
- Completed Orders
- Payment Due
- Needs Approval
- Revenue Snapshot
- Service Requests
- Catering Requests
- Personal Chef Requests

Clicking a card opens the related admin area.

### Operational Alerts

Operational alerts highlight work that needs attention:

- Orders with payment still due.
- Orders that may require chef approval.
- Pending orders waiting for review.
- Service requests waiting for approval.

If no alerts appear, there are no urgent admin items based on the current dashboard checks.

### Active Business Rules

The dashboard also summarizes current business settings:

- Delivery fee
- Late fee
- Service request deposit percent
- Weekend ordering rule

Use `/admin/settings` to change these values.

## Orders

Routes:

- `/admin/orders`
- `/admin/orders/[id]`

Orders are direct checkout purchases. Meal plan and a la carte orders live here. Catering and personal chef requests do not become direct checkout orders; they use the service request workflow.

Both guest and logged-in customers can submit direct checkout orders. Logged-in orders are linked to the customer's account. Guest orders keep the submitted name, email, phone, and delivery/contact snapshot with `userId = null`; they do not create or attach a user account by matching email.

### Order List

The orders page shows:

- Customer name and email.
- A `Guest` badge when the order is not linked to a registered user.
- Order type: Delivery or Pickup.
- Order status.
- Approval status.
- Item count, including weekly meal plan indicators.
- Order total.
- Payment status.
- Pay-by date.
- Created date.

### Order Filters

Use filters to focus the queue:

- All
- Pending
- Accepted
- Preparing
- Ready
- Completed
- Payments Due
- Offline Due
- Delivery
- Pickup
- Approval Pending
- Approved
- Denied
- Cancelled

Tip: Use `Approval Pending` when checking orders with request-only proteins or other approval-required choices.

### Order Statuses

| Status           | Meaning                                       |
| ---------------- | --------------------------------------------- |
| Pending          | Submitted and awaiting review.                |
| Accepted         | Accepted into the workflow.                   |
| Preparing        | Kitchen is preparing the order.               |
| Ready            | Ready for pickup, delivery, or final handoff. |
| Out for Delivery | Delivery workflow has started.                |
| Completed        | Fulfilled and closed.                         |
| Cancelled        | Cancelled and no longer active.               |
| Refunded         | Refunded and no longer active.                |

### Approval Statuses

| Status   | Meaning                                                                         |
| -------- | ------------------------------------------------------------------------------- |
| Pending  | Requires review.                                                                |
| Approved | Approved to continue.                                                           |
| Denied   | Denied and should not move forward unless the customer submits a revised order. |

The app blocks duplicate final approval decisions. After an order is approved or denied, the decision buttons are replaced by final-state messaging.

### Order Detail

The order detail page shows:

- Customer information and whether the order is a guest order.
- Delivery/contact snapshot saved at checkout.
- The customer-selected date/time when scheduling was enabled, or the configured fixed fulfillment message when scheduling was disabled.
- Order items and option notes.
- Weekly meal plan selections grouped by day and configured slot label, including per-slot options and upcharges.
- Allergen acknowledgement status.
- Allergy notes.
- Substitution preference.
- Totals.
- Payment status.
- Status history.

The delivery/contact snapshot is historical. It shows the information used for that order, even if the customer later changes their account profile. For fixed-schedule orders, an internal fallback datetime may be stored for system use, but it is not a promised delivery time and should not be presented to the customer as one.

### Approving or Denying an Order

Use the Approval Decision card.

1. Review the order items, weekly meal plan selections, allergen notes, and request-only items.
2. Add an optional approval note if needed.
3. Choose Approve Order or Deny Order.
4. Confirm the browser prompt.

Approving an order notifies the customer and moves the order forward. Standard paid pickup, delivery, and non-approval weekly orders normally arrive already paid. An approval-required weekly order moves to `PAYMENT_DUE`; use its payment-request control after approval to send or safely reuse a two-hour Square-hosted payment link. Denying an order notifies the customer and cancels the order.

Common payment/approval states are:

- `AWAITING_APPROVAL`: no payment is collected yet.
- `PAYMENT_DUE`: approved and ready for an admin-created payment request.
- `PAYMENT_PENDING`: a Square checkout or hosted link is active but not completed.
- `PAID`: Square completion and the website ledger agree.
- `REFUNDED`: the completed refund has reconciled locally.
- `EXPIRED` / `EXPIRED_NON_PAYMENT`: the two-hour payment window ended without payment.
- `CANCELLED`: the order is no longer active.

### Approved Weekly Payment Requests

For a weekly package marked `Requires chef approval`:

1. The customer submits the order for approval; no Square fields appear and no payment is taken.
2. Review and approve it. The order becomes `PAYMENT_DUE`.
3. Use **Send payment request** on the order detail page. The app creates or reuses one active `ORDER_TOTAL` attempt and emails the hosted Square link.
4. A signed-in customer can also use **Pay Now** from the protected order page. A guest uses the emailed hosted link; there is no public guest order-tracking page.
5. Do not repeatedly send a still-active request. The duplicate guard intentionally reuses the active attempt.
6. After a request expires or is invalidated as stale, create a replacement from the same admin page.

The Square checkout item uses the trusted weekly package/order data for a customer-friendly name. The internal order ID remains available for reconciliation.

### Updating Order Status

Use the Status card.

1. Select a new status.
2. Optionally add a status note.
3. Click Update Status.

Status history appears on the order detail page.

### Marking an Order Paid

The Mark Paid button appears when payment is still due.

Use it only after payment has actually been received or confirmed outside the app. The app blocks duplicate paid actions once the order is already paid.

### Printing a Kitchen Ticket

On the order detail page, use Print Kitchen Ticket.

The print view is designed to include core kitchen information such as:

- Customer/order details.
- Customer-selected schedule or the fixed fulfillment message, as appropriate.
- Items and quantities.
- Weekly meal plan slot labels, selected offerings, options, and upcharges.
- Allergy alerts.
- Notes and selections.

## Kitchen View

Route: `/admin/kitchen`

The kitchen view shows prep-ready orders only. An order appears here when it is:

- Approved, and
- In one of these active statuses: Accepted, Preparing, or Ready.

Each kitchen card shows:

- Customer name.
- Guest status when the order is not linked to an account.
- Order type.
- Current status.
- Customer-selected schedule or fixed fulfillment message.
- Items and quantities.
- Weekly meal plan slots grouped by day and readable slot label, with selected options.
- Item notes and selections.
- Allergy alerts.

Use View / Print Ticket to open the full order detail page. Use the status button to advance the order through the next kitchen state.

## Service Requests

Routes:

- `/admin/catering`
- `/admin/catering/[id]`

Important: The route is named `/admin/catering` for stability, but the page handles both Catering and Personal Chef requests. In the UI, these are called Service Requests.

### Service Request List

The service request queue shows:

- Customer name and email.
- Request type: Catering or Personal Chef.
- Event type and event date.
- Guest count.
- Workflow status.
- Approval status.
- Submitted date.

### Request Type Filters

Use these to separate request categories:

- All
- Catering
- Personal Chef

### Workflow Filters

Use these to narrow the request queue:

- New
- Reviewing
- Quoted
- Approved
- Deposit Due
- Deposit Paid
- Completed
- Cancelled
- Approval Pending
- Approval Approved
- Approval Denied

### Service Request Statuses

| Status       | Meaning                                    |
| ------------ | ------------------------------------------ |
| New          | Submitted and not yet reviewed.            |
| Reviewing    | Admin is reviewing details.                |
| Quoted       | Quote information has been provided.       |
| Approved     | Request approved to continue.              |
| Deposit Due  | Deposit is required before moving forward. |
| Deposit Paid | Deposit has been marked paid.              |
| Completed    | Event/request is complete.                 |
| Cancelled    | Request is closed without fulfillment.     |

### Service Request Detail

The detail page shows:

- Customer contact information.
- Event type, date, guest count, and location.
- Requested menu.
- Allergy notes.
- Special requests.
- Approval controls.
- Status controls.
- Quote and deposit controls.

### Approving or Denying a Service Request

Use the Approval card.

1. Review customer notes, event details, guest count, location, and allergies.
2. Add an optional note if needed.
3. Approve or deny the request.
4. Confirm the browser prompt.

The app blocks duplicate final approval decisions. Once approved or denied, the decision buttons are replaced by a final-state message.

### Quote and Deposit Workflow

Use the Quote / Deposit card.

Fields:

- Estimated Total
- Deposit Amount

Notes:

- Leave Deposit Amount blank to allow the app to calculate the deposit from business settings.
- Use `0.00` only when there is intentionally no deposit due.
- Quote editing locks after final states, denied approvals, or a paid deposit.

Use Mark Deposit Paid only after the deposit is actually received. Duplicate deposit-paid actions are blocked.

Approved service requests expose **Send deposit payment request** only when the deposit phase is eligible. After the deposit is paid, **Send final payment request** becomes available when the remaining balance is due. These create Square-hosted requests; do not send one merely to inspect it. Payment state and operational completion are separate: a paid balance does not automatically mean the event work is completed.

Public Catering and Personal Chef forms share this admin queue. Customers receive a submission confirmation email. The current production flow does not send a separate admin-notification email, so staff must monitor this queue. Before approval, payment controls remain unavailable and no payment link is created.

## Menu Manager

Routes:

- `/admin/menu`
- `/admin/menu/categories`
- `/admin/menu/archived`

The Menu Manager controls standard menu records. Weekly meal plan periods, packages, and weekly offerings are managed separately at `/admin/menu/weekly`.

### Critical Menu Concepts

Menu item `type` controls behavior. Examples:

- Meal Plan
- A La Carte
- Catering Related
- Plate / Legacy
- Dessert
- Side
- Other

Menu category controls display grouping. Examples:

- Meal Plans
- A La Carte
- Desserts
- Sides

Do not confuse category names with type values. A category is where an item is displayed. A type is how the app treats the item.

Personal chef services are not menu items. They use the service request workflow.

### Creating a Menu Item

Use Add Meal Plan / Menu Item.

Fields:

- Menu Item Image: upload JPG, PNG, or WebP, or enter a public image URL.
- Item name.
- Description.
- Price.
- Available.
- Seasonal.
- Category.
- Item Type.
- Requires chef approval.
- Allow customer instructions.

Image uploads must be JPG, PNG, or WebP and 5 MB or smaller.

Production uploads use the configured durable Hostinger filesystem directory. The upload control stores the returned public URL in the same image field; manually entered public URLs remain supported.

### Availability

Use Mark Available or Mark Unavailable inside an item detail panel.

Unavailable items should not be purchasable by customers. Historical orders keep their saved item snapshots.

Availability/publication is also the current launch-hold control. Before making an item sellable, verify its price, allergens, options, and upcharges. Review delivery-fee and weekly late-fee settings in Business Settings because those server-authoritative fees affect checkout totals. Unpublishing an item prevents new storefront selection but does not cancel a Square hosted link that was already created.

The public footer and checkout policy notices read the current cutoff, delivery fee, late fee, and weekend-ordering setting. A zero fee is described as not currently charged rather than showing stale policy copy. These notices are informational; checkout and server submission remain authoritative for the actual order total.

### Editing a Menu Item

Open an item detail panel and choose Edit Item.

You can edit:

- Name.
- Description.
- Image URL.
- Price.
- Category.
- Item Type.
- Seasonal flag.
- Approval requirement.
- Customer instructions setting.

### Archiving and Deleting Menu Items

Use Archive Item when the item may return later.

Use Delete Item only when the item should be permanently removed from active/archived menu management. Historical order snapshots remain intact.

Archived items are managed from `/admin/menu/archived`, where they can be restored or deleted.

### Allergens

Each menu item can be tagged with allergens.

Customer accounts can store allergen preferences. Cart and checkout warn customers when selected items contain matching allergens, and checkout requires acknowledgement before order submission.

Keep allergen tags current on any item that may contain an allergen.

### Option Groups

Option groups define customer-facing choices.

Each option group has:

- Group name.
- Required or optional setting.
- Single or multiple choice setting.
- One or more choices.

Each choice can include:

- Name.
- Price delta.
- Description.
- Dietary info.
- Image URL.
- Request-only flag.

Request-only choices can require chef review before fulfillment.

### Meal Plan Template

For fixed meal plan items, the template adds only:

- Spice Level.
- Protein Substitution.

Older broad customizations such as vegetable/starch choice are intentionally not part of this standard menu item template. Weekly package slots and weekly offering choices are configured separately in the Weekly Menu Manager.

Pork and beef should be treated as request-only proteins. Pricing may vary and chef approval may be required.

### Menu Categories

Route: `/admin/menu/categories`

Use this page to rename categories and change sort order. This controls display grouping and order, not business behavior.

### Archived Items

Route: `/admin/menu/archived`

Use this page to restore archived items or permanently delete them.

## Weekly Menu Manager

Route: `/admin/menu/weekly`

Weekly meal plans use a Build Your Weekly Plan flow. A package defines the number of days and meal slots, and the customer must fill every slot with a published offering from the same weekly period. Slot-specific options and upcharges are preserved with the order for checkout, email, admin, and kitchen use.

### Weekly Menu Periods

A weekly menu period includes:

- Week label.
- Start date.
- End date.
- Customer scheduling mode: inherit the business setting, fixed weekly fulfillment, or customer-selected date/time.
- Ordering open date/time.
- Late-fee start date/time.
- Ordering close date/time.
- Customer-facing delivery message.
- Order capacity.
- Status.
- Fulfillment notes.

The normal form keeps the legacy ordering cutoff out of the main workflow. It is maintained automatically from Ordering Closes and appears only in the Advanced / system schedule section with the internal fixed fulfillment datetime.

Launch periods should resolve to this business-local schedule:

- Weekly menus are posted and ordering opens Wednesday.
- Orders before Friday at 5:00 PM have no weekly late fee.
- Orders from Friday at 5:00 PM through Friday at 10:00 PM include the configured late fee.
- Weekly ordering closes Friday at 10:00 PM; orders after that time are rejected.
- Fulfillment is Sunday, with no promised public delivery time.
- The customer-facing message is: "Weekly meal plan orders are delivered on Sunday. You will be notified when delivery is scheduled."

Weekly menu statuses:

| Status    | Meaning                                             |
| --------- | --------------------------------------------------- |
| Draft     | Internal setup; not ready for customers.            |
| Published | Visible to customers for the current eligible week. |
| Closed    | No longer accepting orders.                         |
| Archived  | Retained historically but not active.               |

Capacity counts submitted customer orders for the weekly menu, not meal plan item quantity.

Example: If one customer orders two weekly meal plan items in one checkout, capacity increases by one customer order.

### Creating or Editing a Weekly Menu

Use Create Weekly Menu to start a new period, or open an existing period and use Edit Weekly Menu.

Recommended setup order:

1. Create the weekly menu period in Draft status.
2. Review the resolved ordering open, late-fee start, close, and Sunday fulfillment settings.
3. Add packages and configure each package's meal slot labels.
4. Add General and, where needed, Breakfast offerings.
5. Add allergens to each offering.
6. Add allowed weekly options and verify any upcharges or request-only flags.
7. Review capacity, customer-facing delivery copy, and fulfillment notes.
8. Publish when ready.

### Cloning a Weekly Menu

Use Clone Weekly Menu to copy an existing period into a new draft.

The clone copies:

- Packages.
- Offerings.
- Allergen tags.
- Allowed spice/protein options.
- Fulfillment notes.
- Capacity value.
- Weekly scheduling mode and customer-facing delivery message.

Cloning advances resolved schedule datetimes for the new period. Before publishing, verify the week label, period dates, ordering window, Sunday fulfillment, capacity, packages, offerings, and meal-specific details.

### Weekly Packages

Packages define customer-facing package choices.

Fields:

- Package name.
- Package price.
- Days: 5 days or 7 days.
- Meals per day: 1 through 4.
- One configured label for each daily meal slot.
- Display order.
- Notes.
- Availability.
- Requires chef approval.
- Seasonal package.

Meal slot labels are selected from consistent choices such as Breakfast, Lunch, Dinner, Snack, or the slot-specific generic label (`Meal 1`, `Meal 2`, and so on). Breakfast can be assigned to any package slot. A 5-Day / 3 Meals package can use Breakfast, Lunch, and Dinner, producing 15 required customer selections.

`Requires chef approval` is displayed to admins with that wording and displayed to customers as `By request`. `Seasonal` is a separate package flag and customer badge; it does not mean the same thing as By request.

### Weekly Offerings

Offerings are fixed meals customers can choose from for that weekly menu.

Fields:

- Offering name.
- Display order.
- Description.
- Dietary info.
- Image URL.
- Availability.
- Meal type: General or Breakfast.

Offerings should be written as complete meals, not open-ended custom meal builders. Breakfast offerings receive a Breakfast-only badge in admin and are shown only in package slots labeled Breakfast. They do not appear in Lunch, Dinner, Snack, or generic Meal slots, and the server rejects a Breakfast offering submitted for a non-Breakfast slot.

The package editor labels selector choices as `Item · Breakfast` or `Item · Standard`. Changing a slot label immediately recomputes the eligibility preview and safely clears stale preview choices; no refresh is required. Breakfast-only offerings are filtered from non-Breakfast slots. Standard offerings may remain valid in Breakfast slots under the existing business rule. This selector is an eligibility preview, not a saved per-slot offering assignment.

Customers must complete every configured slot. The customer view uses the admin-configured slot labels, enforces the required count, and preserves allergens, selected options, and server-authoritative upcharges. A `By request` package remains approval-first and does not display Square payment fields before approval.

### Weekly Offering Allergens

Each weekly offering can be tagged with allergens.

These tags power customer warning and checkout acknowledgement flows when the customer's saved allergens match the selected weekly meal.

### Weekly Spice and Protein Options

Allowed weekly options currently include:

- Spice Level.
- Protein Substitution.

Each option can include:

- Option type.
- Option name.
- Price delta.
- Display order.
- Description.
- Dietary info.
- Availability.
- Request with chef approval, for protein substitutions.

The approval checkbox is only available for protein substitutions. Options are selected per meal slot. Positive price deltas are added to the package price by the server, while request-only options remain visible in the order, confirmation email, admin detail, and kitchen workflow.

### Weekly Fulfillment Prep

Each weekly period includes a fulfillment prep summary.

It shows:

- Order capacity used and remaining.
- Active order count.
- Request-only quantity.
- Approval-required quantity.
- Allergen flag quantity.
- Counts by offering.
- Counts by package.
- Counts by spice level.
- Counts by protein.
- Active weekly orders for the period.

Denied, cancelled, and refunded orders are excluded from prep counts.

Use Open Kitchen Board to move from weekly prep into active kitchen order management.

## Gallery Manager

Route: `/admin/gallery`

Use the gallery manager to control uploaded, database-backed public gallery images and review the built-in site images. Built-in cards are marked read-only and do not offer edit or delete actions.

### Adding a Gallery Image

Fields:

- Image upload or public image URL.
- Display title.
- Alt text.
- Category.
- Sort order.

Gallery categories:

- Meal Prep
- Meal Plans
- Catering
- Personal Chef
- Behind the Scenes

Images must be JPG, PNG, or WebP and 5 MB or smaller. WebP is preferred for public performance.

Production uploads require the durable filesystem environment configuration. If it is missing, the admin upload control fails closed and a manually hosted public URL may still be used.

The public gallery displays both sources. Built-in images live under `/gallery/webp`; uploaded production images use `/image_uploads/gallery/<uuid>`. If both sources use the same `src`, the database-backed record is shown once and takes precedence.

### Editing a Gallery Image

Use Edit on an image card to update:

- Image file or public image URL.
- Title.
- Alt text.
- Category.
- Sort order.

### Deleting a Gallery Image

Use Delete only when the image should be removed from the public gallery. The action asks for confirmation and cannot be undone through the dashboard.

## Customers

Routes:

- `/admin/customers`
- `/admin/customers/[id]`

### Customer List

The customer list includes:

- Customer name and email.
- Order count.
- Weekly meal plan item count.
- Total spent.
- Payment due count.
- Last order date.

Search by customer name or email.

Filters:

- All.
- Has Orders.
- Payment Due.

### Customer Detail

The customer detail page shows:

- Total orders.
- Active orders.
- Payments due.
- Total spent.
- Order history.
- Service request history.
- Customer info.
- Payment alert when applicable.

Use customer detail pages to answer support questions, follow up on payments, or jump into a specific order/request.

## Payments

Route: `/admin/payments`

Payment Management is the reconciliation view for website orders and Square activity. Standard production checkout, approved-weekly order links, and eligible service deposit/final-balance links write `PaymentAttempt` ledger rows.

Use the page to compare:

- Website/ledger status and Square provider status.
- Payment purpose (`ORDER_TOTAL`, `SERVICE_DEPOSIT`, `SERVICE_FINAL_BALANCE`, or `REFUND`).
- Square payment/reference and receipt information.
- Paid/refunded timestamps.
- Parent payment and child refund rows.
- Reconciliation warnings.

`No mismatch detected` means the website state agrees with the provider evidence available to the app. A mismatch is a review signal, not permission to charge or refund again. Open the related order/request and Square receipt before taking action.

Square refunds can remain `PENDING` before becoming `COMPLETED`. A pending refund is a valid temporary state. Do not issue a second refund. After Square completes it, the refund child and parent payment reconcile to `REFUNDED`; the order display follows for a full standard-order refund. Failed or rejected refunds remain visibly failed/rejected and must not mark the parent refunded.

Normal refunds are admin-only, full refunds of eligible standard `ORDER_TOTAL` payments. Enter the reason, review the confirmation, and submit once. The normal action is unavailable after 24 hours, fulfillment, or preparing/service-started status. Square is the receipt source. Duplicate webhook events and repeated completion processing are guarded against.

Legacy **Mark Paid** controls are only for a genuine externally confirmed manual/offline payment. Manual customer checkout is disabled in production.

## Launch-Hold / Content-Hold Operations

Square production payments are tested and intentionally remain enabled. Hostinger environment-variable changes trigger a full rebuild, so launch hold is controlled through catalog publication rather than toggling the payment gate.

- Unpublish or remove standard menu items and weekly offerings/packages that are not intentionally sellable.
- Review by-request weekly packages before publishing.
- Service request forms may remain live when lead collection is desired; they do not charge before approval.
- Unpublishing content does **not** invalidate an already-created Square hosted payment link. Review active/pending payment attempts separately, and do not resend links unless payment is intended.
- Monitor Orders and Payments after every content change.
- Before publishing real content, verify names, prices, allergens, options/upcharges, weekly slots/offerings, delivery fee, late fee, and that the enabled payment gate is still intentional.

See `docs/launch-hold-order-availability-runbook.md` for the complete hold and publishing checklist.

## Reports

Route: `/admin/reports`

Reports provide operational snapshots, including:

- Total revenue.
- Orders this week.
- Orders this month.
- Average order value.
- Pending payments.
- Service request count.
- Catering request count.
- Personal chef request count.
- Pending order approvals.
- Pending service request approvals.
- Completed and cancelled order counts.
- Most ordered items.
- Revenue snapshot.

Use these reports for quick checks and operational awareness. They are not yet a full accounting export.

## Notifications

Route: `/admin/notifications`

The notifications page shows active and planned notification workflows.

Active workflows include:

- Order confirmations.
- Order approval updates.
- Payment received notices.
- Service request confirmations.
- Service request approval/quote updates.
- Service request deposit received notices.

Planned workflows include:

- Kitchen status updates.
- Payment reminders.

### Email Delivery Mode

The Email System card shows the current email mode:

- Live Sending: customer emails are sent through the configured provider.
- Preview Files: emails are saved locally for QA and not sent.
- Dry Run: emails are logged only.
- Disabled: emails are skipped because the email provider key is not configured.

For local testing, `EMAIL_DRY_RUN=true` protects real customers from receiving test emails. Dry-run logs and preview files prove that app-side rendering and triggers ran, but they do not prove Resend delivery. A controlled internal delivery test requires a verified Resend sender, an internal recipient, and `EMAIL_DRY_RUN=false`. Confirm inbox delivery before leaving live sending enabled for launch.

## Business Settings

Route: `/admin/settings`

Business settings control operational rules used by checkout and service requests. Changes affect new checkout calculations and newly resolved weekly periods; historical order snapshots remain unchanged.

General fields:

- Delivery Fee.
- Late Fee.
- Service Request Deposit Percent.
- Cutoff Day.
- Cutoff Hour.
- Cutoff Minute.
- Delivery Area.
- Disable weekend ordering.

Checkout Fulfillment Schedule fields:

- Allow customers to choose checkout fulfillment date/time.
- Fixed checkout fulfillment day.
- Optional fixed checkout fulfillment time.
- Customer-facing checkout fulfillment message.

For launch, global customer scheduling is disabled. Checkout therefore hides Requested Date and Requested Time for weekly and regular orders and stores a trusted server-resolved fulfillment datetime. Leave the public time blank because the business does not promise an exact delivery time. The internal fallback time is system data, not a customer promise.

Weekly Meal Plan Ordering Window fields:

- Allow customers to choose weekly meal plan fulfillment date/time.
- Weekly ordering open day/time.
- Weekly late-fee start day/time.
- Weekly ordering close day/time.
- Fixed weekly fulfillment day and optional time.
- Customer-facing weekly fulfillment message.

Launch defaults are Wednesday opening, Friday 5:00 PM late-fee start, Friday 10:00 PM close, Sunday fulfillment, and no public fulfillment time. Weekly periods resolve these defaults when they are created, after which the period's schedule should be reviewed before publication.

Be careful when changing settings during an active order window. Existing historical orders keep their saved snapshots, but new checkout calculations, newly created periods, and service request quotes may use current settings.

## Image and Upload Guidelines

Use WebP images where possible.

Accepted upload types:

- JPG
- PNG
- WebP

Maximum upload size: 5 MB.

Image URL fields accept:

- Root-relative public URLs, such as `/uploads/gallery/example.webp`.
- Full `http://` or `https://` image URLs.

Production warning:

- Admin uploads write outside the repository to the configured durable filesystem directory.
- Uploaded names are generated UUIDs; JPG, PNG, and WebP signatures are verified server-side.
- The generic upload route requires an authenticated `ADMIN` or `OWNER` session.
- Database backups and uploaded-file backups are separate unless the Hostinger backup plan explicitly covers `public_html/image_uploads`.

## Allergen Workflow

Allergens can appear on:

- Standard menu items.
- Weekly meal plan offerings.

Customers can save allergen preferences in their account.

When a customer adds items that match their saved allergens:

1. Cart and checkout show warnings.
2. Checkout requires allergen acknowledgement.
3. The order stores acknowledgement fields.
4. Admin order detail and kitchen/prep surfaces show allergy/allergen information.

Admin best practice:

- Tag allergens during menu setup.
- Review allergy notes before approving or preparing orders.
- Treat allergy notes and allergen flags as high-priority operational information.

## Approval and Duplicate Decision Guardrails

The dashboard has safeguards for final approval decisions.

For orders:

- Pending approval orders can be approved or denied.
- Approved orders cannot be approved again.
- Denied orders cannot be denied again.
- Duplicate API calls are rejected.

For service requests:

- Pending service requests can be approved or denied.
- Approved or denied requests lock final decision controls.
- Duplicate API calls are rejected.

For payments and deposits:

- Mark Paid appears only when payment is due.
- Mark Deposit Paid appears only when a valid unpaid deposit is due.
- Duplicate paid actions are rejected.

These guardrails help prevent duplicate customer emails and inconsistent final states.

## Recommended Operating Cadence

### Daily

- Check `/admin` for alerts.
- Review new orders.
- Review service requests.
- Confirm outstanding payments.
- Use `/admin/kitchen` for active prep.

### Before Each Weekly Menu Window

- Create or clone the weekly menu period.
- Confirm dates, ordering open/late/close times, Sunday fulfillment message, and capacity.
- Configure packages, meal counts, and readable slot labels.
- Add General offerings and Breakfast offerings where Breakfast slots exist.
- Tag allergens.
- Add per-offering spice and protein options, including any upcharges.
- Mark request-only proteins appropriately.
- Publish only after the weekly menu is complete.

### During Prep

- Use Weekly Fulfillment Prep for counts.
- Use Kitchen View for active tickets.
- Print order details when needed.
- Watch allergy notes and allergen flags.

### After Fulfillment

- Mark orders completed.
- Mark payments paid when confirmed.
- Complete service requests after events are fulfilled.
- Review reports for follow-up needs.

## Common Mistakes to Avoid

- Do not create Personal Chef as a menu item. Use the service request workflow.
- Do not send Catering through cart checkout. Use service requests and quotes.
- Do not confuse menu category with menu item type.
- Do not publish a weekly menu until packages, offerings, allergens, and options are complete.
- Do not omit or mislabel package meal slots; customers must fill every configured slot.
- Do not place Breakfast-only offerings in non-Breakfast slots.
- Do not treat weekly meals as unrestricted custom items; choices must come from published offerings in the same weekly period.
- Do not mark payments or deposits paid until money is actually received.
- Do not ignore request-only proteins; they may need chef approval.
- Do not rely on local uploads for production unless durable storage is confirmed.

## Launch Notes for Admins

Before production launch:

- Production URLs must use `https://`.
- Run dry-run email QA with `EMAIL_DRY_RUN=true`, then complete a controlled internal Resend delivery test with `EMAIL_DRY_RUN=false` before enabling customer-facing email.
- `OWNER_EMAIL` must match a registered user before bootstrapping the first owner with `npm run owner:promote`.
- Confirm global and weekly customer scheduling are disabled, both public fulfillment times are blank, and the fixed Sunday messages do not promise a time.
- Durable image storage must be decided if admins need direct production uploads.
- Square production payments are implemented and tested. The current launch hold is enforced operationally through unpublished menu/weekly content, not by disabling the production payment gate.
- PayPal remains deferred.
- Review active hosted payment links separately because unpublishing catalog content does not cancel them.

See `docs/launch-hold-order-availability-runbook.md`, `docs/production-runbook.md`, and `docs/final-production-launch-smoke-test.md` for the current operational and technical checklists.

## Troubleshooting

### I cannot access `/admin`

Confirm the account role is `ADMIN` or `OWNER`.

### I approved or denied something and the buttons disappeared

That is expected. Final approval decisions are locked to prevent duplicate customer emails and duplicate final states.

### A weekly menu is not visible to customers

Check:

- The weekly period status is Published.
- The resolved ordering window has opened and has not closed in the business timezone.
- The weekly period dates and Sunday fulfillment date are correct.
- Packages and offerings are available.
- Capacity has not been reached.

### A customer cannot submit checkout because of allergens

The customer likely selected an item that matches saved account allergens. They must acknowledge the allergen warning before submitting.

### An image upload fails in production

Local production uploads may be blocked until durable upload storage is configured. Use a public image URL instead.

### A service request quote cannot be edited

Quote editing locks after certain final states, denied approvals, or paid deposits.

### A deposit paid button is missing

The request may not have a deposit due, the deposit may already be paid, the request may not be approved, or the request may be in a locked/final state.
