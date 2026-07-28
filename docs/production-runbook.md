# Production Deployment Runbook

Last updated: July 14, 2026

Use this runbook to prepare, deploy, verify, and recover the production Chef Rah's Twisted Kitchen app at `https://rahstwistedkitchen.com`.

This is a documentation-only launch guide. It does not enable automated online checkout, change email sending behavior, or change the production upload posture.

## 1. Node.js Runtime

Use Node.js 24 LTS for local release builds and production builds.

Node.js Current releases, including Node 26, should not be used for production builds unless the exact version has been explicitly verified with this project. A local build on Node.js v26.4.0 completed successfully, but it showed toolchain instability:

- a Turbopack Rust panic message during build,
- a `DEP0205` deprecation warning from `@tailwindcss/node` using `module.register()`,
- the warning came from the dependency/toolchain layer, not from app code.

Treat Node 26 build output as a signal to switch back to the recommended LTS runtime before deployment. Keep the production host, local release machine, and CI build environment on Node.js 24 LTS unless a future upgrade is tested and documented.

TypeScript launch posture:

- Keep `strict: true` and `noImplicitAny: true` in `tsconfig.json`.
- Do not add `ignoreBuildErrors` to make a deployment pass.
- If generated Next.js route types become stale, remove `.next`, then rerun `npm run check`, `npm run build`, and `npx tsc --noEmit --pretty false` from a clean generated state.

## 2. Production Environment Variable Checklist

Configure these variables in the production host before deploying:

| Variable                            | Production value or note                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                      | Production MySQL/MariaDB connection string. The Prisma datasource is `provider = "mysql"` and the app uses the MariaDB Prisma adapter. |
| `AUTH_SECRET`                       | Production-only Auth.js secret, at least 32 characters. Generate a new secret; do not reuse local values.                              |
| `AUTH_URL`                          | `https://rahstwistedkitchen.com`                                                                                                       |
| `NEXTAUTH_URL`                      | `https://rahstwistedkitchen.com`                                                                                                       |
| `NEXT_PUBLIC_APP_URL`               | `https://rahstwistedkitchen.com`                                                                                                       |
| `BUSINESS_TIME_ZONE`                | `America/New_York` unless the business confirms another timezone.                                                                      |
| `RESEND_API_KEY`                    | Production Resend API key.                                                                                                             |
| `EMAIL_FROM_ADDRESS`                | Verified production sender, such as `Chef Rah's Twisted Kitchen <orders@rahstwistedkitchen.com>`.                                      |
| `EMAIL_DRY_RUN`                     | `false` only when ready for live customer email.                                                                                       |
| `EMAIL_PREVIEW_FILES`               | `false` in production.                                                                                                                 |
| `ALLOW_LOCAL_UPLOADS_IN_PRODUCTION` | `false` or unset. Keep local production uploads disabled for launch.                                                                   |
| `ALLOW_MANUAL_PAYMENT_IN_CHECKOUT`  | `false` or unset in production. The development/test override is ignored in production.                                                |
| `PAYMENT_JOBS_TOKEN`                | Permanent random secret of at least 32 characters for the pending-payment expiration scheduler.                                        |

Workflow-specific variables:

| Variable                | Production value or note                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OWNER_EMAIL`           | Exact email of the first registered owner account. The bootstrap process never creates this user.                                                                                                    |
| `OWNER_BOOTSTRAP_TOKEN` | Temporary long random secret for `POST /api/setup/promote-owner` when production has no console. Remove it and restart/redeploy immediately after bootstrap; it is not a permanent runtime variable. |
| `FOUNDATION_SEED_TOKEN` | Temporary long random secret for `POST /api/setup/seed-foundation` when production has no console. Remove it and restart/redeploy immediately after foundation seeding.                              |
| `ADMIN_EMAIL`           | Legacy single-account input for `npm run admin:promote`; not required for normal role management.                                                                                                    |
| `ADMIN_ROLE`            | Legacy role for `npm run admin:promote`; defaults to `ADMIN`.                                                                                                                                        |

Square sandbox payment variables:

- Legacy Stripe environment variables may remain documented or blank while current env parsing exists.
- Stripe is not the planned launch provider.
- Square is the first provider; PayPal follows later.
- Standard checkout sandbox testing uses `SQUARE_ENVIRONMENT=sandbox`, `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, and the exact `SQUARE_WEBHOOK_NOTIFICATION_URL`.
- Keep Square access tokens and webhook signature keys server-side. Never expose them through `NEXT_PUBLIC_*` variables, browser code, logs, or API responses.
- Only Sandbox Payments API calls are allowed in this phase. Live production payments remain disabled. See `docs/payment-processing-decisions.md`.

Pending-payment expiration scheduling:

- Configure a scheduler to `POST /api/jobs/expire-pending-payments` regularly
  (recommended every 5–15 minutes).
- Send `PAYMENT_JOBS_TOKEN` only in the `x-payment-jobs-token` header.
- The endpoint is disabled with a 404 when the token is absent or shorter than
  32 characters, returns 401 for a wrong token, uses no-store headers, and is
  rate limited.
- Monitor the returned counts for attempts checked/expired, orders cancelled,
  emails sent or previewed, and errors.
- Scheduling is a deployment/hosting task. Do not add the worker to the
  Hostinger build lifecycle.

## 3. Database Setup

The app currently uses Prisma with a MySQL datasource and the MariaDB adapter. Provision a production MySQL/MariaDB-compatible database before deploy.

Database setup checklist:

1. Create the production database and database user.
2. Grant the app user only the permissions needed to run migrations and operate the app.
3. Confirm the database is reachable from the production host.
4. Store the production connection string in `DATABASE_URL`.
5. Run the current Prisma migrations against a fresh MySQL/MariaDB database.
6. Take a baseline backup before launch migrations.

PowerShell connection-string shape:

```powershell
$env:DATABASE_URL = "mysql://USER:PASSWORD@HOST:3306/DATABASE"
```

### Hostinger MySQL Host And Password Encoding

Hostinger documentation may describe an application-local MySQL host as `localhost`, but MySQL/MariaDB account grants can distinguish `user@localhost` from `user@127.0.0.1`. During this production deployment, Prisma returned `P1000` authentication failures when `DATABASE_URL` used `localhost`. phpMyAdmin reported `CURRENT_USER()` as the database account at `127.0.0.1`, and changing the Prisma URL host to `127.0.0.1` resolved authentication.

Use this Hostinger production shape unless the active database panel shows a different assigned host:

```text
mysql://DB_USER:URL_ENCODED_PASSWORD@127.0.0.1:3306/DB_NAME
```

URL-encode the database password before placing it in `DATABASE_URL`. For example, `+` becomes `%2B` and `!` becomes `%21`. Encode every other URL-reserved character as well; do not change the actual database password while encoding it.

If Prisma reports `P1000`, confirm all of the following before changing application code:

1. In phpMyAdmin, run `SELECT CURRENT_USER();` and compare the returned account host with `DATABASE_URL`.
2. Confirm the database name and username exactly match Hostinger's database panel.
3. Confirm the password is current and correctly URL-encoded.
4. Retry `npx prisma migrate deploy` with `127.0.0.1` when the account is reported as `user@127.0.0.1`.

If a database password or complete connection URL was shared in chat, a ticket, logs, or troubleshooting notes, rotate the database password before final launch. Update Hostinger's environment variable with the newly encoded password and redeploy.

Do not point production at a local database, a development database, a throwaway preview database, or any old PostgreSQL database from earlier project assumptions.

## 4. Prisma Migration And Deploy Steps

Run the current Prisma migrations against the fresh production MySQL/MariaDB database after the production environment is configured and before opening the site to customers.

### Hostinger Build Lifecycle

Hostinger uses its fixed build command:

```text
npm run build
```

The npm lifecycle now runs these operations in order:

1. The `prebuild` hook runs `npm run prisma:generate` to generate the Prisma Client.
2. The same `prebuild` hook runs `npx prisma migrate deploy` to apply pending committed migrations to the production MySQL/MariaDB database.
3. The `build` script runs `next build` only after `prebuild` succeeds.

`DATABASE_URL` must point to the production MySQL/MariaDB database and be available in Hostinger during the build. The database must be reachable from the build environment, and its user must have the permissions required by the committed migrations. A successful Prisma Client generation does not update the database schema.

`npx prisma migrate deploy` is production-safe and idempotent: it applies committed pending migrations and reports success without reapplying migrations already recorded in the database. If generation or migration fails, npm stops and `next build` does not run.

The build lifecycle intentionally does not run `npm run db:seed`, `npm run db:seed-demo`, `npm run owner:promote`, or the HTTP owner bootstrap endpoint. Seeding and owner setup remain explicit, separately reviewed launch actions.

Confirm every Hostinger deployment log shows `prisma generate`, `prisma migrate deploy`, and then `next build`. Because migrations now run in `prebuild`, local and CI uses of `npm run build` also require a valid, reachable `DATABASE_URL`; use only a database appropriate for that environment.

### Manual Or Console Deployment

The same npm lifecycle applies from a console:

```powershell
npm ci
npm run build
```

For migration diagnostics or an explicit migration-only operation, use `npx prisma migrate deploy`. The direct Windows executable form is also available:

```powershell
.\node_modules\.bin\prisma.cmd migrate deploy
```

After migrations, confirm the app can boot with the production environment. Do not use `prisma migrate dev` in production.

Current migration inventory:

- `20260708130546_init_mysql`
- `20260711010132_add_weekly_plan_slot_selections`
- `20260711014741_add_weekly_slot_option_selections`
- `20260711145356_add_weekly_package_flags_and_slot_labels`
- `20260711182000_add_weekly_offering_breakfast_only`
- `20260712170000_add_weekly_ordering_window`
- `20260712203000_add_global_checkout_scheduling`
- `20260713093000_make_weekly_fulfillment_time_optional`
- `20260713101500_make_checkout_fulfillment_time_optional`

## 5. Seed And Setup Notes

The production-safe foundation seed is configured in `prisma.config.ts` and `package.json`. It upserts only the baseline allergen names and leaves existing records unchanged. It does not create business settings, users, orders, menu content, or service requests.

Run it once after the first production migration. It is idempotent and can be rerun safely when needed. A console command is the preferred method when one is available:

```powershell
npm run db:seed
```

When Hostinger does not provide a usable production console:

1. Generate a temporary random token of at least 32 characters and set it as `FOUNDATION_SEED_TOKEN` in Hostinger.
2. Restart or redeploy so the running app receives the token.
3. Send the POST request from a trusted PowerShell session. The request has no body:

```powershell
$env:FOUNDATION_SEED_TOKEN = "temporary-long-random-secret-from-secure-storage"
$headers = @{
  "x-foundation-seed-token" = $env:FOUNDATION_SEED_TOKEN
}

Invoke-RestMethod `
  -Method Post `
  -Uri "https://rahstwistedkitchen.com/api/setup/seed-foundation" `
  -Headers $headers
```

4. Confirm the response reports `success: true`, `seededAllergenCount: 10`, and the expected allergen names.
5. Remove `FOUNDATION_SEED_TOKEN` from Hostinger and restart or redeploy again. Removing the variable disables the endpoint.

The endpoint accepts no seed data and runs the same fixed allergen upserts as `npm run db:seed`. It does not create users, orders, service requests, menus, weekly content, or business settings.

`npm run db:seed-demo` is intended for local, demo, staging, or disposable rehearsal databases. Do not run it against real production customer data unless the owner intentionally wants the demo catalog and understands that the script recreates demo weekly data.

```powershell
npm run db:seed-demo
```

Neither seed command runs automatically during `npm run build`, Hostinger `prebuild`, or `npx prisma migrate deploy`.

Launch menu items, weekly meal plan periods, offerings, gallery images, pricing, and business settings should be reviewed and configured through the admin UI after the first owner account is promoted.

After the foundation seed or any intentional demo seed, review `/admin/settings` and confirm the final launch scheduling values:

- Global checkout customer scheduling is disabled.
- Global fixed fulfillment day is Sunday, the public time is blank, and the configured fixed fulfillment message is customer-ready.
- Weekly customer scheduling is disabled.
- Weekly ordering opens Wednesday.
- Weekly late ordering starts Friday at 5:00 PM in `BUSINESS_TIME_ZONE`.
- Weekly ordering closes Friday at 10:00 PM in `BUSINESS_TIME_ZONE`.
- Weekly fixed fulfillment day is Sunday and its public time is blank.
- Weekly fixed fulfillment message is: "Weekly meal plan orders are delivered on Sunday. You will be notified when delivery is scheduled."
- Late fee amount is `$10.00` unless the owner has approved another amount.

The app may store a server-resolved fallback datetime in `Order.requestedDateTime` for fixed scheduling. That internal value is not a promised delivery time and must not appear to customers as a fallback such as `12:00 PM`.

## 6. First Owner Account And Admin Access

Both bootstrap methods only promote an existing registered user. They do not create an account, set or change a password, read or update `User.passwordHash`, send an invitation, or create a passwordless user.

Steps:

1. Deploy the app with production env vars.
2. Register the first owner account through the production `/register` page.
3. Set `OWNER_EMAIL` to that exact registered email.
4. Choose the method available on the production host.

With console or SSH access, run:

```powershell
$env:OWNER_EMAIL = "owner@example.com"
npm run owner:promote
```

Without console access, generate a one-time random secret of at least 32 characters, store it temporarily as `OWNER_BOOTSTRAP_TOKEN` in Hostinger, and restart/redeploy so the running app receives it. Call the endpoint once from a trusted PowerShell session:

```powershell
$env:OWNER_BOOTSTRAP_TOKEN = "temporary-long-random-secret-from-secure-storage"
$headers = @{
  "x-owner-bootstrap-token" = $env:OWNER_BOOTSTRAP_TOKEN
}

Invoke-RestMethod `
  -Method Post `
  -Uri "https://rahstwistedkitchen.com/api/setup/promote-owner" `
  -Headers $headers
```

The request has no body. `OWNER_EMAIL` is the only possible target, the endpoint supports `POST` only, and it refuses to run after any owner exists. On success, remove `OWNER_BOOTSTRAP_TOKEN` from Hostinger and restart/redeploy again. Verify the endpoint is unavailable after removal.

After promotion, sign out and sign back in, then confirm `/admin`, `/admin/role-manager`, and the `OWNER_BOOTSTRAPPED` audit event. Additional users must register normally with their own passwords; the owner can then assign `ADMIN` access in Role Manager. Admins retain normal admin access but cannot manage roles. Keep at least one owner at all times.

## 7. Resend Setup Notes

Before setting `EMAIL_DRY_RUN=false`, finish Resend production setup:

1. Verify the sending domain in Resend.
2. Add the required DNS records at Hostinger or the active DNS provider.
3. Confirm Resend shows the sender domain as verified.
4. Set `RESEND_API_KEY`.
5. Set `EMAIL_FROM_ADDRESS` to a verified sender on the production domain.
6. Set `EMAIL_PREVIEW_FILES=false`.
7. Set `EMAIL_DRY_RUN=false` only when ready for live delivery.

First live email test:

1. Use an internal test customer address.
2. Submit a test order.
3. Confirm the customer receives the order confirmation.
4. Approve or deny the test order and confirm the status email.
5. Submit one catering or personal-chef request and confirm the request confirmation.

Preview routes and preview files are for development only. Production preview routes remain blocked by `NODE_ENV === "production"`.

## 8. DNS And Domain Notes

Production domain: `https://rahstwistedkitchen.com`

Domain/hosting provider: Hostinger

DNS checklist:

1. Point `rahstwistedkitchen.com` to the production app host using the host's required A, AAAA, or CNAME records.
2. Configure `www.rahstwistedkitchen.com` if the business wants the `www` hostname supported.
3. Ensure HTTPS is issued and active before launch.
4. Confirm `AUTH_URL`, `NEXTAUTH_URL`, and `NEXT_PUBLIC_APP_URL` all use `https://rahstwistedkitchen.com`.
5. Add Resend DNS records for the sender domain.
6. Wait for DNS propagation before final smoke tests.

Post-DNS checks:

```powershell
Invoke-WebRequest -Uri "https://rahstwistedkitchen.com" -UseBasicParsing
Invoke-WebRequest -Uri "https://rahstwistedkitchen.com/menu" -UseBasicParsing
```

## 9. Upload And Storage Launch Posture

Local production uploads must remain disabled for launch:

```powershell
$env:ALLOW_LOCAL_UPLOADS_IN_PRODUCTION = "false"
```

Launch posture:

- Admins should use durable public image URLs for menu and gallery images.
- Hostinger testing confirmed that the deployed Node/Next.js runtime can write, read, and publicly serve files from `public_html/image_uploads`.
- The temporary storage probe has been removed, and no application upload feature is enabled for launch.
- Defer direct filesystem upload implementation until after launch; see `docs/post-launch-backlog.md`.

## 10. Payment Launch Posture

Automated online checkout is not implemented in this foundation.

Launch posture:

- Production customer checkout is online-payment only; manual/offline checkout is hidden and rejected.
- Manual/offline checkout can be enabled only in development/testing with `ALLOW_MANUAL_PAYMENT_IN_CHECKOUT=true`.
- Approval-required orders are submitted without payment and receive payment requests only after approval in a future phase.
- Admins should mark orders or deposits paid only after payment is actually confirmed outside the app.
- Do not configure live Square credentials. Validate card/wallet tokenization, a completed test payment, receipt data, webhook reconciliation, and missing-config disablement in Sandbox.
- Do not add Stripe launch wording; Stripe is legacy/optional only while current env parsing still exists.

## 11. Security Launch Posture

Security work already completed:

- Customer ownership audit.
- Admin audit logging.
- Rate limiting.
- Security header pass.

Launch posture:

- Keep CSP intentionally minimal for launch.
- Keep production preview routes blocked.
- Keep local production uploads disabled.
- Use HTTPS-only production URLs.
- Use a unique production `AUTH_SECRET`.
- Do not expose `.env` values in logs, screenshots, tickets, or client messages.
- Keep admin access limited to known owner/admin accounts.

## 12. Manual Pre-Launch QA Checklist

Run this after production env vars, migrations, seed, DNS, and the first owner bootstrap are complete.

Customer-facing:

- Open `/`, `/menu`, `/gallery`, `/catering`, and `/personal-chef`.
- Confirm current menu items, weekly meal plan packages, and weekly meal offerings are accurate.
- Add a weekly meal plan to the cart and confirm the package and actual meal offering are visible.
- Add an a la carte item to the cart.
- Confirm allergen acknowledgement appears when expected.
- Test checkout validation for pickup and delivery.
- Confirm Requested Date and Requested Time are hidden while global customer scheduling is disabled.
- Confirm checkout shows the configured fixed fulfillment message instead of date/time inputs.
- Confirm no customer-facing cart, checkout, order detail, or email displays an internal `12:00 PM` fallback time.
- Submit a guest regular order without `requestedDateTime` and confirm the server stores trusted fulfillment data.
- Submit a guest weekly meal plan order without `requestedDateTime` and confirm Sunday fulfillment is resolved by the weekly period.
- Confirm weekly ordering is open Wednesday through Friday, adds the late fee from Friday 5:00 PM through 10:00 PM, and rejects orders after Friday 10:00 PM.
- Confirm Breakfast-only weekly offerings appear only in Breakfast slots.
- Confirm the 5-Day / 3 Meals package shows Breakfast, Lunch, and Dinner and displays "By request" to customers.
- Submit one internal test order.
- Confirm the customer account order detail page shows the submitted order.
- Submit one internal catering request.
- Submit one internal personal-chef request.

Admin:

- Sign in as the promoted admin.
- Open `/admin`.
- Review `/admin/menu`, `/admin/menu/weekly`, and `/admin/gallery`.
- Approve or deny the internal test order.
- Confirm duplicate order decisions are blocked.
- Update an order status.
- Mark an eligible manual payment as paid only after confirming the test payment externally.
- Review `/admin/catering` for service requests.
- Review `/admin/notifications` for email mode.
- Review `/admin/settings` for business settings.
- Confirm weekly period schedule fields resolve from the launch defaults and do not require a public fulfillment time.

Email:

- Confirm order submitted email.
- Confirm order approved or denied email.
- Confirm payment received email after a test mark-paid action.
- Confirm catering or personal-chef request email.
- Confirm Resend delivery logs for the internal tests.

## 13. Post-Launch Smoke Test Checklist

Run immediately after launch:

- `https://rahstwistedkitchen.com` loads over HTTPS.
- `/menu` loads and shows the active published menu.
- `/cart` loads.
- `/checkout` loads and still shows automated online card checkout as disabled.
- `/checkout` hides Requested Date and Requested Time while customer scheduling is disabled and shows the configured fulfillment message.
- Guest regular and weekly orders submit without a customer-supplied `requestedDateTime`.
- Customer order detail and email do not expose the internal fallback fulfillment time.
- Weekly Friday 5:00 PM-10:00 PM late-fee behavior and the Friday 10:00 PM close are enforced server-side.
- Customer registration and login work.
- Internal test order submission works.
- Internal test service request submission works.
- Live customer emails send through Resend when `EMAIL_DRY_RUN=false`.
- `/admin` is accessible only to promoted admin/owner accounts.
- Admin order approval sends the correct customer email.
- Gallery images and menu images render.
- Production uploads remain blocked when `ALLOW_LOCAL_UPLOADS_IN_PRODUCTION=false` or unset.

## 14. Rollback Notes

Prepare rollback before launch:

1. Record the deployed commit SHA.
2. Take a database backup before migrations.
3. Confirm how to redeploy the previous app build in the host dashboard.
4. Keep a copy of the production environment variable set.

If the app deploy fails before migrations:

- Redeploy the previous known-good build.
- Keep the database untouched.

If migrations deploy but the app fails:

- Put the site in maintenance mode if the host supports it.
- Redeploy the previous known-good build only if it is compatible with the migrated schema.
- Restore the pre-migration database backup if the previous build is not schema-compatible.
- Keep `EMAIL_DRY_RUN=true` during recovery if duplicate or incorrect customer email is a risk.

If live email sends incorrectly:

- Set `EMAIL_DRY_RUN=true`.
- Pause affected customer workflows.
- Review Resend logs and app audit history.
- Resume live email only after the issue is understood.

## 15. Known Future Follow-Up Items

- Implement automated Square/PayPal checkout in a dedicated future phase.
- Choose durable production upload storage and wire direct admin uploads to it.
- Replace any remaining legacy Stripe env parsing or placeholders when the Square/PayPal phase begins.
- Add exact business-approved manual payment wording to customer-facing content if needed.
- Add host-specific deployment screenshots or Hostinger steps once the final hosting target and deployment mechanism are confirmed.
- Continue tightening CSP after launch traffic patterns and required third-party assets are known.
