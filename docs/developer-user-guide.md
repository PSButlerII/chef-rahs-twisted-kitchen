# Chef Rah's Twisted Kitchen Developer User Guide

## Square readiness controls

Local and Sandbox work uses `SQUARE_ENVIRONMENT=sandbox`,
`SQUARE_PRODUCTION_PAYMENTS_ENABLED=false`, and `SQUARE_CSP_MODE=sandbox`.
Sandbox payment actions continue to depend on the application ID, location ID,
and access token; webhook verification separately requires its signature key and
exact notification URL.

Production actions require `SQUARE_ENVIRONMENT=production`, the production gate set to `true`, all
Square credentials, the canonical HTTPS app URL, exact production webhook URL,
and explicitly approved production CSP mode. Customer endpoints expose only a
generic unavailable message. The authenticated admin payments page may show the
environment, gate state, missing variable names, and sanitized URL/CSP blockers,
never secret values. Turning the gate off leaves verified webhook reconciliation
available.

The current Hostinger deployment intentionally keeps the production gate enabled while launch availability is controlled by unpublished menu and weekly content. The gate remains the emergency payment rollback, not a catalog-availability control. Verified webhook reconciliation remains available when customer payment creation is gated off.

Last updated: August 27, 2026

This guide covers local setup, database maintenance, validation, launch rules, and production deployment for the current application. Use `docs/production-runbook.md` as the final production checklist and `docs/fresh-db-deployment-rehearsal.md` for a full rehearsal record.

## 1. Project Overview

Chef Rah's Twisted Kitchen is a Next.js food-service application with:

- Standard menu, plate, dessert, and a la carte ordering.
- Build Your Weekly Plan packages with required meal slots and per-slot options.
- True guest checkout and registered customer checkout.
- Owner/admin order, kitchen, menu, customer, report, and settings tools.
- Catering and personal-chef request workflows.
- Transactional email through Resend and React Email.
- Square production card checkout, hosted approval/deposit/final-balance links, ledger reconciliation, and refunds.

The server is authoritative for prices, fees, weekly windows, option upcharges, user ownership, and fulfillment scheduling. Do not move these decisions to client-only code.

## 2. Tech Stack

| Area                | Technology                                                  |
| ------------------- | ----------------------------------------------------------- |
| Application         | Next.js App Router, React, TypeScript, Tailwind CSS         |
| Database ORM        | Prisma                                                      |
| Production database | MySQL/MariaDB through `@prisma/adapter-mariadb`             |
| Authentication      | Auth.js / NextAuth credentials provider with Prisma adapter |
| Email delivery      | Resend                                                      |
| Email templates     | React Email                                                 |
| Client cart state   | Zustand                                                     |

This repository uses Next.js 16.2.10. Before changing Next.js APIs or conventions, follow `AGENTS.md` and read the relevant installed guide under `node_modules/next/dist/docs/`.

## 3. Local Setup

Use Node.js 24 LTS for local work and production builds. Node.js Current releases such as Node 26 are not the production recommendation unless the complete toolchain has been explicitly verified. Under Node 26, builds may emit a `DEP0205` warning from `@tailwindcss/node` using `module.register()`; that observed warning comes from the dependency/toolchain, not application code.

PowerShell setup:

```powershell
git clone https://github.com/PSButlerII/chef-rahs-twisted-kitchen.git
Set-Location chef-rahs-twisted-kitchen
npm ci
Copy-Item .env.example .env
```

Use `npm install` when intentionally resolving an existing checkout or updating reviewed dependencies; use `npm ci` for a clean lockfile-exact install in CI, deployment, and reproducible validation. Never run a broad dependency update as part of ordinary setup.

Edit `.env` with local-only values. Do not commit secrets, production credentials, or a real customer database URL.

Minimum local setup requires:

- A reachable MySQL/MariaDB database.
- Matching local values for `AUTH_URL`, `NEXTAUTH_URL`, and `NEXT_PUBLIC_APP_URL`.
- A stable `AUTH_SECRET` that does not change while testing existing browser sessions.
- `EMAIL_DRY_RUN=true` unless intentionally running a controlled live email test.

## 4. Database Setup

### Disposable Docker MariaDB Rehearsal

This command creates a disposable local MariaDB container on port `3307`. The sample credentials are local test values only.

```powershell
docker run --name chef-rahs-mariadb-rehearsal `
  --detach `
  --publish 3307:3306 `
  --env MARIADB_ROOT_PASSWORD=local-root-password `
  --env MARIADB_DATABASE=chef_rahs_rehearsal `
  --env MARIADB_USER=chef_rahs `
  --env MARIADB_PASSWORD=local-dev-password `
  mariadb:11.4
```

Set the matching local URL:

```powershell
$env:DATABASE_URL = "mysql://chef_rahs:local-dev-password@127.0.0.1:3307/chef_rahs_rehearsal"
```

If a username or password contains URL-special characters, URL-encode it before placing it in `DATABASE_URL`.

### Hostinger MySQL Connection Note

For the current Hostinger deployment, use `127.0.0.1` rather than `localhost` in the production Prisma URL:

```text
mysql://DB_USER:URL_ENCODED_PASSWORD@127.0.0.1:3306/DB_NAME
```

Although Hostinger guidance may refer to `localhost`, Prisma returned `P1000` with that host during deployment. phpMyAdmin's `SELECT CURRENT_USER();` reported the account as `user@127.0.0.1`; using the same host in `DATABASE_URL` fixed authentication. Treat the phpMyAdmin account host and Hostinger database panel as the source of truth for this deployment.

Local validation can fail before application checks if the configured database host is offline, firewalled, or unreachable from the current network. A LAN-accessible MariaDB instance may also require an explicit user/host grant; grant only the required database permissions to the narrowest client host or range. Do not weaken production grants for local QA.

Always URL-encode special characters in the password. For example, `+` becomes `%2B` and `!` becomes `%21`. If credentials or the full URL were exposed while troubleshooting, rotate the database password, update the encoded production URL, and redeploy before launch.

### Prisma Commands

Generate the client and apply the committed migrations:

```powershell
npm run prisma:generate
npx prisma migrate deploy
```

Use `migrate deploy` for fresh rehearsals and production. Do not use `prisma migrate dev` in production.

Run the production-safe foundation seed once after the first migration when the target database needs the baseline allergens. It upserts only allergen names and does not create business settings or demo content:

```powershell
npm run db:seed
```

When a production host has no usable console, temporarily set a random `FOUNDATION_SEED_TOKEN` of at least 32 characters, restart/redeploy, and call the fixed POST-only setup endpoint:

```powershell
$headers = @{
  "x-foundation-seed-token" = $env:FOUNDATION_SEED_TOKEN
}

Invoke-RestMethod `
  -Method Post `
  -Uri "https://rahstwistedkitchen.com/api/setup/seed-foundation" `
  -Headers $headers
```

Confirm the response, remove `FOUNDATION_SEED_TOKEN`, and restart/redeploy again. Prefer `npm run db:seed` whenever a console is available. The endpoint and command share the same allergen-only logic.

For local, demo, staging, or a disposable rehearsal database, the demo seed adds showcase users, menu data, weekly packages, offerings, options, and launch scheduling defaults:

```powershell
npm run db:seed-demo
```

Do not run `npm run db:seed-demo` against a real production customer database unless the owner intentionally wants the demo catalog and understands that the script recreates demo weekly records.

Neither `npm run db:seed` nor `npm run db:seed-demo` runs automatically during the production build or migration lifecycle.

## 5. Environment Variables

Start from `.env.example`.

| Variable                             | Purpose                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                       | MySQL-compatible Prisma URL. Hostinger production currently uses `mysql://DB_USER:URL_ENCODED_PASSWORD@127.0.0.1:3306/DB_NAME`.                            |
| `AUTH_SECRET`                        | Auth.js signing/encryption secret. Use a strong, stable value.                                                                                             |
| `AUTH_URL`                           | Canonical Auth.js origin. Local default is `http://localhost:3000`; production is `https://rahstwistedkitchen.com`.                                        |
| `NEXTAUTH_URL`                       | Compatibility Auth.js origin; keep it aligned with `AUTH_URL`.                                                                                             |
| `NEXT_PUBLIC_APP_URL`                | Public application origin used for links and email assets.                                                                                                 |
| `BUSINESS_TIME_ZONE`                 | Business-local scheduling zone, expected to be `America/New_York` for launch.                                                                              |
| `RESEND_API_KEY`                     | Resend API key used only when live sending is enabled.                                                                                                     |
| `EMAIL_FROM_ADDRESS`                 | Verified sender name/address used by transactional email.                                                                                                  |
| `EMAIL_DRY_RUN`                      | `true` logs/renders without sending; `false` permits live Resend delivery.                                                                                 |
| `EMAIL_PREVIEW_FILES`                | Enables local preview file output when supported by the email utility. Keep it `false` in production unless intentionally debugging.                       |
| `UPLOAD_STORAGE_DRIVER`              | Must be `filesystem` to enable admin uploads; other values fail closed.                                                                                    |
| `UPLOAD_FILESYSTEM_DIR`              | Absolute server-only durable upload directory; never return it to clients.                                                                                 |
| `NEXT_PUBLIC_UPLOAD_BASE_URL`        | Public URL base corresponding to the filesystem directory.                                                                                                 |
| `ALLOW_MANUAL_PAYMENT_IN_CHECKOUT`   | Development/test-only manual checkout override. It must be explicitly `true` and is ignored in production.                                                 |
| `SQUARE_ENVIRONMENT`                 | `sandbox` locally or `production` only for an explicitly approved live deployment.                                                                         |
| `SQUARE_CSP_MODE`                    | Selects the reviewed Square CSP source set for the matching environment; production never permits `unsafe-eval`.                                           |
| `SQUARE_PRODUCTION_PAYMENTS_ENABLED` | Explicit production payment-creation gate and emergency rollback control, not the routine catalog publication switch.                                      |
| `SQUARE_APPLICATION_ID`              | Environment-matching Web Payments SDK application identifier.                                                                                              |
| `SQUARE_LOCATION_ID`                 | Environment-matching Square location identifier.                                                                                                           |
| `SQUARE_ACCESS_TOKEN`                | Server-side Square secret; never expose through `NEXT_PUBLIC_*`.                                                                                           |
| `SQUARE_WEBHOOK_SIGNATURE_KEY`       | Server-only signature key used with the raw webhook body.                                                                                                  |
| `SQUARE_WEBHOOK_NOTIFICATION_URL`    | Exact Square webhook subscription URL used during signature verification.                                                                                  |
| `PAYMENT_JOBS_TOKEN`                 | Server-only secret of at least 32 characters for the protected pending-payment expiration job.                                                             |
| `OWNER_EMAIL`                        | Existing registered user's email for the one-time owner bootstrap. It is never a user-creation input.                                                      |
| `OWNER_BOOTSTRAP_TOKEN`              | Temporary long random secret for `POST /api/setup/promote-owner` when the host has no console. Remove it and restart/redeploy immediately after success.   |
| `FOUNDATION_SEED_TOKEN`              | Temporary long random secret for `POST /api/setup/seed-foundation` when the host has no console. Remove it and restart/redeploy immediately after success. |
| `ADMIN_EMAIL`                        | Legacy single-user input for `npm run admin:promote`. Not needed for owner-managed admins.                                                                 |
| `ADMIN_ROLE`                         | Legacy role for `npm run admin:promote`; defaults to `ADMIN`.                                                                                              |

Legacy Stripe placeholders may remain blank while the existing env parser supports them. Stripe is not the selected payment integration. Square is the production provider and PayPal remains later work. See `docs/payment-processing-decisions.md`.

## 6. Owner And Admin Setup

The application does not create privileged users from environment variables.

1. Start or deploy the app.
2. Register the first owner normally through `/register`.
3. Set `OWNER_EMAIL` to that exact registered email.
4. If the host has console access, run:

```powershell
npm run owner:promote
```

If the host has no console, temporarily set a random `OWNER_BOOTSTRAP_TOKEN` of at least 32 characters, restart/redeploy, and call the POST-only endpoint:

```powershell
$headers = @{
  "x-owner-bootstrap-token" = $env:OWNER_BOOTSTRAP_TOKEN
}

Invoke-RestMethod `
  -Method Post `
  -Uri "https://rahstwistedkitchen.com/api/setup/promote-owner" `
  -Headers $headers
```

Remove `OWNER_BOOTSTRAP_TOKEN` and restart/redeploy immediately after the successful response. The endpoint then becomes unavailable.

5. Sign out, sign back in as the owner, and open `/admin/role-manager`.
6. Have additional staff register normally with their own passwords.
7. Assign those registered users the `ADMIN` role in Role Manager.

`OWNER` has all normal admin access plus role management. `ADMIN` has normal admin access but cannot open the role page or call its mutation API. Last-owner protection prevents the final owner from being demoted. Successful changes are audited.

Neither bootstrap method creates users or passwords, and neither reads or updates `User.passwordHash`. Do not create fake users, passwordless users, temporary admin passwords, or users solely to satisfy an environment variable. Do not use email matching to attach guest orders to registered users.

## 7. Running The App

Development:

```powershell
npm run dev
```

Production build and local production start:

```powershell
npm run build
npm run start
```

`npm run build` is migration-aware in every environment. Its `prebuild` hook generates Prisma Client and runs `npx prisma migrate deploy` before `next build`. Set `DATABASE_URL` to a valid, reachable MySQL/MariaDB database appropriate for the environment before building; the database user needs migration permissions.

The default origin is `http://localhost:3000`. When using another port, update all three local URL variables so Auth.js redirects and generated links use the same origin.

## 8. Validation Commands

For a clean production-style validation on Windows PowerShell:

```powershell
npm audit
npm audit --omit=dev
npx prisma validate
npm run prisma:generate
npm run check
npm run build
npx tsc --noEmit --pretty false
npx prisma migrate status
git diff --check
```

Notes:

- `npm run check` runs ESLint, Prisma generation, Next route type generation, TypeScript, and a production build.
- The build inside `npm run check` also invokes the migration-aware `prebuild`, so `check` requires a valid `DATABASE_URL` and database connectivity.
- The separate build and `tsc` commands are still useful final deployment checks.
- `prisma validate`, generation, builds, and migration status require the expected Prisma configuration; build/check also need a reachable database because `prebuild` runs `migrate deploy`.
- Seeds are intentionally excluded from routine validation because they mutate the configured database.

## 9. TypeScript And Hostinger Notes

### Hostinger Upload Storage Feasibility

Production testing confirmed that the deployed Node/Next.js runtime can write, read, and publicly serve files from Hostinger's `public_html/image_uploads` directory. The admin-only durable upload implementation validates size, MIME and magic bytes, generates UUID names, and returns public URLs without exposing the absolute path. Gallery uploads are stored below the public base as `/gallery/<uuid>`, while bundled files remain under `/gallery/webp`. A completely empty gallery table uses bundled metadata as a fallback; otherwise database rows are authoritative. `npm run gallery:import-built-ins -- --dry-run` previews the idempotent built-in import and `--apply` explicitly creates missing records. Imported static paths gain full admin CRUD without making bundled files eligible for filesystem deletion.

`app/gallery/page.tsx` remains the server data-loading boundary and passes serializable gallery records to `components/gallery/ModernGallery.tsx`. The client component owns category state, nine-item incremental rendering, hover/focus overlays, and the accessible lightbox; it performs no client-side data fetch. Remote URLs continue using the existing unoptimized-image check, while root-relative built-in and durable public paths retain normal `next/image` behavior.

Hostinger runs the fixed command `npm run build`. Before deployment, configure `DATABASE_URL` in the Hostinger environment and confirm it points to the production MySQL/MariaDB database that the build environment can reach with migration permissions.

The expected deployment log order is:

1. `npm run prisma:generate`
2. `npx prisma migrate deploy`
3. `next build`

Prisma Client generation and migration deployment are separate requirements: generation updates application client artifacts, while `migrate deploy` applies committed schema changes to the actual database. The `prebuild` hook runs both before `next build` and stops the build if either fails.

`npx prisma migrate deploy` is production-safe and idempotent. It applies committed pending migrations and does not recreate migrations already recorded as applied. The build lifecycle runs no foundation seed, demo seed, or owner bootstrap. Never substitute `prisma migrate dev` in production.

`tsconfig.json` intentionally has:

```json
{
  "strict": true,
  "noImplicitAny": true
}
```

Do not weaken strictness, add `ignoreBuildErrors`, or hide production errors with `ts-ignore`. Prefer explicit data shapes and null guards, particularly around BusinessSettings, weekly period schedules, guest `userId`, email `orderUrl`, and order fulfillment display.

Next.js generated types under `.next` can become stale after route changes or interrupted development builds. If generated route or validator files report malformed or impossible errors, stop the dev server, remove `.next`, regenerate, and rerun the full validation sequence.

## 10. Current Launch Business Rules

- Global customer-selected checkout scheduling is disabled.
- Checkout does not show Requested Date or Requested Time while scheduling is disabled.
- The server stores a trusted internal fulfillment datetime when required, but that fallback time is not a customer promise.
- No exact delivery time is promised.
- Weekly fulfillment copy is: "Weekly meal plan orders are delivered on Sunday. You will be notified when delivery is scheduled."
- Weekly menus are posted and ordering opens Wednesday.
- Weekly ordering remains open through Friday.
- The configured late fee applies from Friday at 5:00 PM through Friday at 10:00 PM.
- Weekly ordering closes Friday at 10:00 PM; later orders are rejected for that period.
- Weekly fulfillment is Sunday.

BusinessSettings provide global defaults, and WeeklyMenuPeriod stores resolved dates for each published period. The order API remains the source of truth.

Shared public fee/cutoff policy copy reads `BusinessSettings` through the server-side settings helper. Zero delivery/late fees use explicit no-charge wording; positive fees use the configured amount. Do not reintroduce hardcoded policy amounts. Display copy remains informational and must never replace server-authoritative fee calculation in the order API.

## 11. Weekly Meal Plan Behavior

- A package requires `days * mealsPerDay` customer selections.
- Each slot stores its day index, meal index, readable label snapshot, weekly offering, and selected option records as permanent order data.
- Package slot labels can be Breakfast, Lunch, Dinner, Snack, or the position-specific generic Meal label.
- The demo 5-Day / 3 Meals package uses Breakfast, Lunch, and Dinner and is marked Requires chef approval; customers see `By request`.
- Seasonal is a separate package flag.
- Breakfast-only offerings appear only in slots labeled Breakfast and are also validated server-side.
- Selected slot options are validated against the selected offering and period.
- Option upcharges are recomputed server-side and added to the base package price.
- Stale, unavailable, unpublished, expired, wrong-period, and incomplete selections are rejected.
- Fixed weekly scheduling stores the server-resolved Sunday fulfillment datetime and displays the configured message without exposing an internal fallback time.

## 12. Guest Checkout Behavior

- Guest orders are real orders with `Order.userId = null`.
- Guests provide name, email, phone, and delivery/contact details required by the selected fulfillment type.
- The API does not create a user and does not auto-attach a guest order by matching email.
- Confirmation email goes to `order.customerEmail`.
- Guests land on the public `/checkout/thank-you` flow rather than a protected order detail page.
- Guest emails do not include account-only order links.
- Account order pages remain login-only and query by the authenticated user.
- Logged-in orders continue to link to the authenticated user and appear in account history.
- Admin order list/detail pages display guest orders, including a Guest badge.

## 13. Email Testing

### Phase 1: Dry Run

Use:

```powershell
$env:EMAIL_DRY_RUN = "true"
$env:EMAIL_PREVIEW_FILES = "true"
```

Trigger order confirmation, approval, payment received, and service-request paths. Confirm the expected recipient and subject in logs or preview files. This validates app-side rendering and triggers only; it does not validate Resend delivery.

### Phase 2: Controlled Live Resend Delivery

After the sender domain and DNS are verified:

1. Use an internal/test recipient only.
2. Set `EMAIL_DRY_RUN=false` temporarily.
3. Submit an internal order and trigger approval/payment email where applicable.
4. Confirm inbox delivery and check spam/promotions if needed.
5. Return `EMAIL_DRY_RUN` to `true` if more non-live QA remains.

Set `EMAIL_DRY_RUN=false` for launch only after controlled live delivery passes and the team is ready for customer-facing emails.

## 14. Fresh Database Rehearsal

Use a fresh, disposable MySQL/MariaDB database and production-shaped non-secret values.

1. Start the Docker MariaDB container or provision an empty rehearsal database.
2. Set `DATABASE_URL` and the required application/email variables.
3. Run `npm ci` from the repository root.
4. Run `npm run prisma:generate`.
5. Run `npx prisma migrate deploy`.
6. Run `npm run db:seed` for foundation allergen data.
7. Optionally run `npm run db:seed-demo` only on the disposable rehearsal database.
8. Review BusinessSettings, especially disabled scheduling, blank public times, Wednesday open, Friday 5:00 PM late fee, Friday 10:00 PM close, and Sunday fulfillment.
9. Run `npm run build` and `npm run start`.
10. Register and bootstrap the first owner.
11. Run guest pickup, guest delivery, guest weekly, logged-in, admin, kitchen, email dry-run, breakfast filtering, option upcharge, past-date, and weekend smoke tests.
12. Complete the controlled live internal Resend test before launch approval.

See `docs/fresh-db-deployment-rehearsal.md` for the detailed checklist and migration inventory.

## 15. Common Troubleshooting

### `EADDRINUSE` On Port 3000

Another process is already listening on the port. Stop the known local dev process, or run on another port:

```powershell
npm run dev -- -p 3001
```

When changing ports, update `AUTH_URL`, `NEXTAUTH_URL`, and `NEXT_PUBLIC_APP_URL` to the same origin.

### Auth.js `no matching decryption secret`

Confirm every running app process uses the same `AUTH_SECRET`. Stop stale servers, restart the app, and clear the local site's auth cookies after intentionally changing the secret. Never rotate the production secret casually because existing sessions depend on it.

### Windows `EPERM` On A Locked Node Modules Or SWC File

Stop the running Next.js/Node process that owns the file and close tools actively scanning it. Identify the relevant process before using `Stop-Process`. Then rerun `npm ci` or the failed build command. Do not edit generated dependency files.

### Stale `.next` Route Or Validator Errors

Stop the dev server and run:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run check
```

Do not commit `.next` or hand-edit generated route types.

### `npm ci` Cannot Find The Lockfile

Run the command from the repository root, where `package.json` and `package-lock.json` are located. `npm ci` intentionally requires the lockfile and should not be replaced with an unreviewed dependency update during deployment.

## 16. Deployment Notes

The current production path is Hostinger with MySQL/MariaDB and Node.js 24 LTS.

Recommended deployment order:

```powershell
npm ci
npm run build
# Run the production foundation seed separately only when the launch procedure calls for it:
npm run db:seed
```

Then start/deploy the built app, register the first owner, use either `npm run owner:promote` or the temporary-token endpoint, configure Resend, and complete production smoke tests. On a host without console access, remove `OWNER_BOOTSTRAP_TOKEN` and restart/redeploy before normal production operation.

Production rules:

- Use `npx prisma migrate deploy`; never use `prisma migrate dev` in production.
- Verify `npm run build` logs show its `prebuild` generation and migration deployment before `next build`; `prisma generate` alone is not sufficient.
- Review foundation seed behavior before running it on an existing database.
- Do not run the demo seed against real customer data unless explicitly intended.
- Configure the three durable upload variables and back up uploaded files separately from the database unless hosting backups cover the upload directory.
- Keep local email preview routes and preview files out of the production workflow.
- Run `npm run env:check` with final live values before launch approval.
- Treat `SQUARE_PRODUCTION_PAYMENTS_ENABLED` as an emergency payment-creation rollback, not as the normal catalog hold. The current content hold uses publication state; see `docs/launch-hold-order-availability-runbook.md`.

## 17. Payment Architecture and Operations

### Checkout, hosted links, and the ledger

The server is authoritative for item/package prices, paid options, tips, fees, and the final amount. Taxes are included in listed prices and are not added as a separate checkout line. Standard pickup, delivery, and non-approval weekly orders use Square card checkout. Approval-required weekly orders, service deposits, and service final balances use Square-hosted payment links only after the applicable admin decision.

`PaymentAttempt` is the internal ledger. Its provider status records Square's state while website status records the application's state. Purposes distinguish `ORDER_TOTAL`, `SERVICE_DEPOSIT`, `SERVICE_FINAL_BALANCE`, and `REFUND`. Refund attempts are child rows linked to the original parent payment. Provider IDs, idempotency keys, receipts/references, timestamps, and sanitized metadata support reconciliation without making the order table a provider event log.

Payment creation must retain its existing idempotency and active-attempt checks. Standard checkout and hosted requests use a two-hour (`120` minute) pending window computed by the server. Do not accept a customer-selected pay-by date for Square. Approved weekly hosted links use trusted package/order data for customer-facing item names while retaining the order ID internally.

### Square configuration and readiness

Keep application ID, location ID, access token, and webhook signature key aligned to one Square environment. `SQUARE_ACCESS_TOKEN` and `SQUARE_WEBHOOK_SIGNATURE_KEY` are server-only. Production customer payment creation additionally requires the production gate, canonical HTTPS URLs, and approved production CSP. Run `npm run env:check` with the intended deployed values; never print secrets.

Turning the production gate off is the emergency rollback for new customer payment actions. It is not the normal launch-hold mechanism and must not disable verified webhook reconciliation for payments already in flight. Hostinger rebuilds after environment changes, so the present hold keeps the gate enabled and unpublishes customer-purchasable content.

### Webhooks and deduplication

The webhook endpoint is `/api/webhooks/square`. The exact production notification URL is `https://rahstwistedkitchen.com/api/webhooks/square`; scheme, host, and path must match because signature verification uses it. Subscribe only to:

- `payment.created`
- `payment.updated`
- `refund.created`
- `refund.updated`

The route verifies the Square signature against the raw body before parsing or deduplication. `PaymentWebhookEvent` has a unique provider/event-ID key. A verified duplicate returns success and is not reconciled twice; a create-time `P2002` catch covers races. Unsupported verified events are stored as ignored. Avoid noisy payout/order events unless a reviewed feature intentionally consumes them, and never treat an unverified event as a duplicate.

### Refund reconciliation and recovery

Square refunds may validly remain `PENDING`. Only `COMPLETED` transitions the refund child and eligible parent/order state to refunded. `FAILED` and `REJECTED` remain terminal failures and never mark the parent refunded. Completion is idempotent and notification logic must not emit duplicate emails.

For the specifically documented affected refund, use the local, read-only-by-default recovery command:

```powershell
npm run payment:recover-affected-refund
npm run payment:recover-affected-refund -- --apply
```

Run dry mode first. Apply mode reconciles local rows only after retrieving authoritative Square status; it must never create another refund. The script operates against the `DATABASE_URL` and Square credentials loaded in the shell where it runs. Running it locally does not magically operate on the live website—verify the target environment before using `--apply`. See `docs/production-runbook.md` and `docs/payment-processing-decisions.md` for the incident-safe procedure.

### Pending-payment expiration

`POST /api/jobs/expire-pending-payments` is protected by `PAYMENT_JOBS_TOKEN` (minimum 32 characters) in the `x-payment-jobs-token` header. Schedule it at the production cadence documented in `docs/production-runbook.md`. It expires eligible pending attempts after their server-generated two-hour deadline, revokes retry tokens, cancels eligible unpaid orders, releases weekly capacity, and sends the non-payment cancellation email according to configured email delivery mode. The worker uses conditional updates so repeated or overlapping runs are safe.

An approved weekly order is capacity-bearing while its active payment request is pending. Capacity is released only when the eligible unpaid order is cancelled by expiration; payment-link creation itself must not increment capacity again.

### Weekly and service-request flows

Weekly packages require `days * mealsPerDay` selections. Admin slot labels drive the customer labels and selector eligibility preview. Breakfast-only offerings are invalid in non-Breakfast slots; Standard offerings may be used in Breakfast slots. The API revalidates the period, package, required slots, offering eligibility, allergens/options, and trusted option upcharges.

Normal weekly packages follow immediate checkout. `Requires chef approval` packages submit as approval-first, expose no Square fields, then become payment due after approval. Their hosted checkout uses a customer-friendly trusted package name and keeps the internal order ID for reconciliation.

Catering and Personal Chef forms create service requests, not orders or payments. Both share the admin service queue. Customers receive confirmation email; no separate admin-notification email is currently sent, so operations rely on the queue. Deposit and final-balance hosted-link actions become available only in the appropriate approved/payment phase. Paid-in-full is derived from the required paid deposit/final-balance ledger state; operational service completion remains a separate, manual workflow state.

### Dependency security maintenance

Use targeted patch/minor parent upgrades or a narrowly scoped, compatibility-verified override. Never run `npm audit fix --force`. Re-run both `npm audit` and `npm audit --omit=dev`, inspect `npm explain`/`npm ls` paths, and distinguish runtime reachability from CLI/build tooling. Avoid Prisma, Next, React, Tailwind, Square, or Auth major changes during launch hardening. Do not downgrade Prisma merely to silence an advisory if that breaks the current adapter/toolchain.

After remediation is merged, allow Dependabot/GitHub dependency alerts to rescan the default branch and confirm the alert clears. The repository may use narrowly scoped transitive overrides where the parent has no safe release; preserve the rationale in `docs/security-advisory-triage.md` and remove an override when the parent adopts the patch.

## 18. Launch Hold and Production Deployment

Deploy the latest reviewed `main` to Hostinger and verify the commit/build logs. Hostinger's fixed build lifecycle runs Prisma generation and `migrate deploy` through `prebuild`; do not add seed, bootstrap, or ad-hoc payment work to that lifecycle.

Production Square is ready, but the site can remain in content-hold mode. Keep standard menu items and weekly offerings/packages unpublished unless intentionally sellable. Service forms may remain available for lead collection. Existing Square-hosted links are independent of catalog visibility, so audit active/pending attempts separately before and during the hold.

Before publishing the real catalog, verify names, prices, allergens, options/upcharges, weekly labels and offerings, fees, payment readiness, and admin reconciliation. Use:

- `docs/launch-hold-order-availability-runbook.md`
- `docs/production-runbook.md`
- `docs/payment-processing-decisions.md`
- `docs/square-production-activation-plan.md`
- `docs/square-production-rehearsal-report.md`
- `docs/final-production-launch-smoke-test.md`
- `docs/service-request-production-submission-evidence.md`
- `docs/weekly-content-final-preflight.md`
- `docs/security-advisory-triage.md`

## 19. Future Developer Notes

- Square production payment workflows are implemented. PayPal, ACH, and any broader provider expansion remain future scope.
- Tokenized guest order tracking and public guest order detail links are future scope. Guest thank-you and email flows must not expose protected order data.
- Durable admin filesystem uploads are implemented; production environment and backup/restore rehearsal remain. FTP/SFTP is not required. If SFTP is introduced later, use a dedicated limited account.
- SMS/customer scheduling notifications may be added later; the current fulfillment message says the owner will notify the customer when delivery is scheduled.
