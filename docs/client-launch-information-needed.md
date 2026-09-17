# Client Launch Information Needed

Last updated: July 14, 2026

Use this list to request the remaining information and assets from the client before launching Chef Rah's Twisted Kitchen.

## Launch Blockers

These items are needed before production can safely go live.

### Production Website And Hosting

- Final production domain.
- Confirmed public production site URL, such as `https://example.com`.
- Hostinger hosting/deployment access or confirmation of the final deployment target.
- Production MySQL/MariaDB database connection string for `DATABASE_URL`, such as `mysql://USER:PASSWORD@HOST:3306/DATABASE`.
- Confirmation that the production database is separate from local/demo data.
- Confirmation of who has deployment access.

### Authentication And Admin Access

- Email address for the single bootstrap owner account (`OWNER_EMAIL`).
- Confirmation that the owner will register normally before `npm run owner:promote` is run.
- Email addresses for staff who should become admins after registering; the owner will assign those roles in `/admin/role-manager`.
- Final `AUTH_SECRET` value, or approval for the developer/deployment host to generate it.
- Production values for:
  - `AUTH_URL`
  - `NEXTAUTH_URL`
  - `NEXT_PUBLIC_APP_URL`

### Email Sending

- Email provider account access or production `RESEND_API_KEY`.
- Verified sender domain or sender address.
- Final `EMAIL_FROM_ADDRESS`.
- Confirm whether a reply-to or business inbox should be used for customer replies.
- Confirm who receives internal contact/service notifications if `CONTACT_TO_EMAIL` will be used later.
- Approval to set `EMAIL_DRY_RUN=false` for the first live email test.
- Approval to set `EMAIL_PREVIEW_FILES=false` in production.

### Upload And Image Storage

- Decision on production image storage:
  - Use external public image URLs only for launch.
  - Or allow local production uploads temporarily.
  - Or choose a durable storage provider.
- If durable storage is required, provide provider choice and credentials/access:
  - Hostinger storage, S3-compatible storage, Cloudflare R2, Supabase Storage, UploadThing, or another provider.
- Confirmation of `ALLOW_LOCAL_UPLOADS_IN_PRODUCTION` value.
- Approved process for replacing menu/gallery images after launch.

### Business Settings

- Business timezone for `BUSINESS_TIME_ZONE`.
- Pickup address and pickup instructions.
- Delivery area or delivery radius.
- Delivery fee.
- Minimum lead time for orders.
- Confirmation of the final launch scheduling configuration already implemented:
  - Global customer-selected checkout scheduling is disabled.
  - Regular and weekly checkout do not ask for Requested Date or Requested Time.
  - Global and weekly fixed fulfillment day is Sunday.
  - No public fulfillment time is promised or displayed.
  - Weekly menus are posted and ordering opens Wednesday.
  - Weekly late fee starts Friday at 5:00 PM.
  - Weekly ordering closes Friday at 10:00 PM; later orders are rejected for that weekly period.
- Approval of the weekly customer message: "Weekly meal plan orders are delivered on Sunday. You will be notified when delivery is scheduled."
- Approval of the regular-order fixed fulfillment message shown while global scheduling is disabled.
- Confirmation that the weekly late fee remains `$10.00`.
- Service request deposit percentage.
- Preferred manual payment instructions for customer orders.
- Preferred manual deposit/payment instructions for service requests.
- Refund, cancellation, and rescheduling rules.

### Menu And Weekly Meal Plan Launch Data

- Final launch-week weekly menu.
- Weekly menu start date and end date.
- Confirmation that the resolved weekly period schedule matches Wednesday open, Friday 5:00 PM late-fee start, Friday 10:00 PM close, and Sunday fulfillment.
- Weekly order capacity. Current expected value is 10 customer orders per weekly menu.
- Final 5-Day / 2 Meals package price; its slots are Lunch and Dinner.
- Final 5-Day / 3 Meals package price; its slots are Breakfast, Lunch, and Dinner, it requires chef approval, and customers see "By request."
- Final weekly offerings with names, descriptions, and images if available.
- Confirmation that Breakfast-only offerings are appropriate for Breakfast slots and must remain hidden from non-Breakfast slots.
- The demo seed contains exactly three Breakfast-only offerings for demo/staging use; replace or approve them before using that catalog as launch data.
- Allergen tags for every weekly offering.
- Allowed spice levels.
- Allowed protein substitutions.
- Which protein substitutions are request-only and approval-required.
- Confirmation that beef, pork, lamb, or other premium proteins require approval when applicable.
- A La Carte launch items, prices, descriptions, categories, images, and allergens.
- Desserts and sides launch items, prices, descriptions, images, and allergens.
- Any items that should stay archived or hidden at launch.

### Payment Policy

- Confirm whether online card checkout is disabled at launch.
- Online card checkout remains disabled for launch unless a separate Square/PayPal integration phase is approved and implemented.
- Client-selected future online payment providers: Square and PayPal.
- Manual Square/PayPal payment links or invoices are acceptable for launch. Provide exact copy for:
  - Invoice payment instructions.
  - Cash/offline payment instructions.
  - Deposit instructions for service requests.
  - Pay-by-date expectations.

### Legal And Customer Policy Copy

- Privacy policy copy or approval to launch without a dedicated privacy page.
- Terms of service copy or approval to launch without a dedicated terms page.
- Allergen disclaimer wording.
- Refund/cancellation policy wording.
- Delivery/pickup policy wording.
- Any required business license, health, or food safety wording the client wants shown.

## Content And Brand Polish

These items may not block launch, but they improve quality and client confidence.

### Brand Assets

- Final approved logo files.
- Final brand colors if different from the current site style.
- Final social media profile URLs.
- Final business phone number.
- Final business email.
- Final public business address, if it should be shown.
- Business hours or response-time expectations.

### Public Page Content

- Final About page copy approval — complete September 17, 2026.
- Final home page headline and service descriptions.
- Final Catering description.
- Final Personal Chef description.
- Final gallery category names.
- Final hero image or approved food/service images.
- Customer testimonials, if any.
- FAQ content, if desired.

### Image Assets

- Approved Chef Rah portrait for the About page.
- Hero image for the home page.
- Service image for Catering.
- Service image for Personal Chef.
- Menu item images.
- Weekly offering images.
- Gallery images in WebP, JPG, or PNG format.
- Alt text notes for important images, if the client has preferences.

Image preference:

- WebP is preferred for performance.
- Production images should be hosted from durable public URLs unless production upload storage is confirmed.

## QA And Signoff Contacts

Ask the client to identify:

- Person responsible for approving public site copy.
- Person responsible for approving menu/pricing.
- Person responsible for approving allergen tags.
- Person responsible for approving email wording.
- Person responsible for approving production test orders.
- Person who should receive launch-day issue reports.

## Suggested Client Message

Use or adapt this message:

```text
We are ready for the final launch-prep phase. The app is functionally built and has passed local validation, but production launch is blocked until we receive the final production environment details, email sending information, upload/storage decision, launch menu data, payment instructions, policy copy, and admin account details.

Please review the attached launch information list and send the launch-blocking items first. Brand/content polish items can follow separately if needed.
```

## Internal Notes

- Do not use the local development database as production.
- Do not enable live email until the client approves the sender address and first live-send test.
- Do not allow local production uploads unless the client accepts the durability risk or the host guarantees persistent shared storage.
- Do not enable automated Square/PayPal checkout unless the client approves a dedicated future payment integration phase. Manual Square/PayPal payment links or invoices are acceptable for launch.
- Keep Catering and Personal Chef as service request workflows, not checkout products.
- Do not interpret the internally stored fulfillment datetime as a customer promise. When no public fulfillment time is configured, customer pages and emails must show the approved message and never expose a fallback such as `12:00 PM`.
- Use `npm run db:seed-demo` only for local, demo, staging, or disposable rehearsal databases. Do not run it against real production customer data unless the demo catalog is intentionally desired.
