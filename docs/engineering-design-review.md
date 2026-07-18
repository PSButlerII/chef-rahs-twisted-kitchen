# Engineering Design Review

## Document status and evidence convention

This document is the primary technical reference for the repository at commit `9e2ca66703e903890e2a14de1f1e7a3f6bfbfba5`. It is a design review of the implementation in that revision, not a statement of undocumented product intent. It intentionally does not reproduce credentials, environment values, private URLs, client information, or infrastructure identifiers.

Conclusions use these confidence labels:

- **Confirmed** — directly demonstrated by application code, schema, configuration, scripts, or committed documentation.
- **Likely** — supported by multiple repository signals but not expressed as an enforceable contract.
- **Speculative** — a plausible interpretation for which repository evidence is insufficient. Speculative items are not treated as facts or recommendations without further validation.

Repository paths in backticks are the evidence citations. Existing documentation is used as supporting operational context; executable code and schema take precedence where the two differ.

## 1. Executive Summary

**Confirmed.** Chef Rah's Twisted Kitchen is a full-stack, database-backed ordering and operations application built as a single Next.js App Router deployment. It supports a public marketing site, standard menu ordering, configurable weekly meal plans, catering and personal-chef requests, customer accounts, allergen preferences, and an authenticated administration area. Evidence: `app/`, `components/`, `app/api/`, `prisma/schema.prisma`, and `app/layout.tsx`.

The system is a modular monolith. Server-rendered pages and Route Handlers run in the same Next.js application; Prisma connects those server paths to MySQL; browser-side Zustand stores provide persisted cart and checkout state. There is no separate API service, job worker, event bus, or independently deployable frontend in the repository. Evidence: `package.json`, `lib/prisma.ts`, `store/cart-store.ts`, and `store/checkout-store.ts`.

The design is strongest where business correctness matters. The order API treats browser cart data as untrusted, reloads live menu and weekly-plan records, validates option selections and scheduling, computes totals on the server, snapshots mutable product data into order records, and writes the order in a transaction. Administrative access is guarded both in pages and APIs, and role authorization is rechecked against persisted user data rather than trusting only JWT role claims. Evidence: `app/api/orders/route.ts`, `lib/menu-option-validation.ts`, `lib/weekly-menu-validation.ts`, `lib/auth-guards.ts`, and `prisma/schema.prisma`.

The principal engineering risks are concentrated in operations and maintainability:

1. There is no general automated unit, integration, or end-to-end test framework. The only executable rule-focused QA script is `scripts/qa-late-fee-rules.ts`; most verification is documented manual QA.
2. `app/api/orders/route.ts` is a large orchestration boundary that combines parsing, validation, live catalog resolution, pricing, capacity handling, persistence, profile updates, and notifications.
3. Rate limiting uses an in-memory process map and forwarded IP headers. It is not shared across replicas and resets on process restart. Evidence: `lib/rate-limit.ts`.
4. Production image writes are deliberately blocked unless explicitly enabled, while no durable object-storage adapter is implemented. Evidence: `lib/public-upload.ts` and `docs/production-runbook.md`.
5. Automated online payment is not implemented; the current workflow records manual/offline payment state. The installed Stripe dependency and optional environment schema are legacy residue, not an active checkout integration. Evidence: `app/checkout/page.tsx`, `app/admin/payments/page.tsx`, `env.ts`, `package.json`, and `docs/provider-transition-review.md`.

Overall assessment: the repository is a credible launch-oriented modular monolith with unusually explicit operational and business-rule documentation. It should remain a monolith for the foreseeable scope, but needs automated tests, smaller application services around ordering, durable uploads, distributed abuse controls, and a deliberate payment integration before higher scale or unattended operation.

## 2. Project Purpose

**Confirmed.** The application provides a digital storefront and operations console for a food-service business. Public pages promote meal preparation, catering, and personal-chef services; `/menu`, `/cart`, and `/checkout` form the ordering funnel; `/catering` and `/personal-chef` collect service requests; `/account` exposes customer data; `/admin` exposes operational management. Evidence: `app/page.tsx`, `app/menu/page.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/catering/page.tsx`, `app/personal-chef/page.tsx`, `app/account/page.tsx`, and `app/admin/page.tsx`.

**Confirmed.** The system is not merely a brochure site. It persists users, orders, order line snapshots, weekly menu configuration, service requests, business rules, gallery content, allergen associations, status history, and administrative audit records. Evidence: `prisma/schema.prisma`.

**Likely.** The current architecture is optimized for a single business and a relatively small operator team. Evidence includes a singleton-style `BusinessSettings` concept, global menu/gallery administration, one-owner bootstrap protection, and no tenant identifier in any model. Evidence: `lib/business-settings.ts`, `app/api/setup/promote-owner/route.ts`, and `prisma/schema.prisma`.

**Speculative.** Multi-location or multi-brand support may eventually be desirable, but no repository evidence establishes that requirement.

## 3. Intended Users

### Public visitors

**Confirmed.** Unauthenticated visitors can browse marketing content, menus, weekly offerings, and galleries, and can submit catering or personal-chef requests. Evidence: public pages under `app/` and public POST handlers `app/api/catering/route.ts` and `app/api/personal-chef/route.ts`.

### Customers

**Confirmed.** Registered customers can authenticate with email and password, manage contact information and allergen preferences, change a password, view their orders and service requests, and reorder eligible items. Evidence: `auth.ts`, `app/register/page.tsx`, `app/account/`, `app/api/account/`, and `components/account/`.

**Confirmed.** Guest ordering is supported because `Order.userId` is nullable and the order handler permits a missing session while always storing customer contact fields. Service requests follow the same optional user relationship. Evidence: `prisma/schema.prisma`, `app/api/orders/route.ts`, `app/api/catering/route.ts`, and `app/api/personal-chef/route.ts`.

### Administrators

**Confirmed.** `ADMIN` and `OWNER` roles operate orders, kitchen views, service requests, menus, weekly menus, gallery content, customers, payments, reports, notifications, business settings, and audit records. Evidence: the `UserRole` enum, `lib/auth-guards.ts`, and pages under `app/admin/`.

### Owners

**Confirmed.** Owners have the administrator capability set plus exclusive access to role management. The role API protects the last owner from demotion, and initial owner creation has a dedicated token-protected bootstrap route. Evidence: `app/admin/role-manager/page.tsx`, `app/api/admin/users/[id]/role/route.ts`, and `app/api/setup/promote-owner/route.ts`.

## 4. Business Workflow

### Standard and weekly ordering

1. **Confirmed.** The public menu page loads available, non-archived menu items and the current published weekly menu. Evidence: `app/menu/page.tsx` and `components/menu/WeeklyMenuSection.tsx`.
2. **Confirmed.** Customers configure regular item options or construct required day/meal slots for a weekly plan. Browser state is placed in a versioned, local-storage-backed Zustand cart. Evidence: `components/menu/MenuItemModal.tsx`, `components/menu/WeeklyMenuOrderForm.tsx`, and `store/cart-store.ts`.
3. **Confirmed.** Checkout collects fulfillment/contact information, allergen acknowledgement, tips, and a manual payment method. Some contact data can be persisted for an authenticated user. Evidence: `app/checkout/page.tsx`, `store/checkout-store.ts`, and `types/order.ts`.
4. **Confirmed.** `POST /api/orders` rate-limits the request, parses it, resolves live catalog records, rejects invalid or stale selections, enforces weekly ordering windows/capacity and cart-composition rules, calculates server-authoritative charges, derives approval requirements, snapshots selections, and creates order records transactionally. Evidence: `app/api/orders/route.ts`, `lib/order-calculations.ts`, `lib/menu-option-validation.ts`, `lib/weekly-ordering-window.ts`, and `lib/weekly-menu-validation.ts`.
5. **Confirmed.** Administrators approve or deny orders, advance fulfillment status, record manual payment, and use the kitchen view. Status changes can append history, and mutations are audit logged. Evidence: `app/api/admin/orders/[id]/approval/route.ts`, `app/api/admin/orders/[id]/status/route.ts`, `app/api/admin/orders/[id]/mark-paid/route.ts`, `app/admin/kitchen/page.tsx`, and `lib/admin-audit-log.ts`.

### Service requests

1. **Confirmed.** Catering and personal-chef forms submit into the shared `CateringRequest` model, distinguished by `ServiceRequestType`. Evidence: `app/api/catering/route.ts`, `app/api/personal-chef/route.ts`, and `prisma/schema.prisma`.
2. **Confirmed.** Administrators review, approve or deny, quote, update workflow status, and record a deposit. State-dependent guards prevent inappropriate quote or deposit operations. Evidence: `app/api/admin/catering/`, `lib/service-request-workflow.ts`, and `components/admin/CateringQuoteForm.tsx`.
3. **Confirmed.** Customer and administrator email templates exist for request receipt and lifecycle changes, with live, preview, dry-run, and disabled delivery modes. Evidence: `emails/`, `lib/email.ts`, and `lib/email-preview.ts`.

### Menu administration

**Confirmed.** Administrators create and edit menu items, categories, allergens, option groups/choices, availability, archival state, weekly periods, weekly packages, weekly offerings, offering options, and clones. Destructive relations use Prisma cascade or set-null policies according to whether dependent history must survive. Evidence: `app/api/admin/menu/`, `components/admin/`, and `prisma/schema.prisma`.

## 5. System Architecture

### Architectural style

**Confirmed.** The application is a TypeScript modular monolith using Next.js 16 App Router and React 19. Server Components are the default rendering model; Client Components are used for forms, browser state, and interactions. Next.js Route Handlers form the HTTP API. Evidence: `package.json`, `app/`, and the `"use client"` boundaries throughout `components/` and `store/`.

```text
Browser
  |-- Server-rendered pages and layouts
  |-- Client components
  |-- Zustand local persistence (cart and checkout)
  v
Next.js application
  |-- App Router pages
  |-- Route Handlers
  |-- Auth.js session/authentication
  |-- Domain and validation helpers in lib/
  |-- React Email rendering and email adapter
  v
Prisma Client -> MariaDB adapter -> MySQL-compatible database
```

### Module boundaries

- `app/`: route-level composition, Server Components, Client pages, and HTTP handlers.
- `components/`: reusable public, account, menu, cart, layout, allergen, and admin UI.
- `lib/`: domain rules, persistence singleton, authorization, email, uploads, reporting, audit, revalidation, and display adapters.
- `store/`: persisted browser state for cart and checkout.
- `prisma/`: schema, migrations, seed/bootstrap utilities.
- `emails/`: branded transactional email components.
- `scripts/`: production-environment validation and focused rules QA.
- `docs/`: operational, design, security, launch, and QA records.

### Runtime boundaries

**Confirmed.** Database and authorization work stays in server code; `lib/auth-guards.ts` explicitly imports `server-only`. Interactive state and browser storage stay behind Client Component boundaries. Evidence: `lib/auth-guards.ts`, `app/menu/page.tsx`, `store/cart-store.ts`, and `store/checkout-store.ts`.

**Confirmed.** Cache invalidation is explicit for menu and weekly-menu mutations through helpers in `lib/menu-revalidation.ts` and `lib/weekly-menu-revalidation.ts`.

**Likely.** The architecture is appropriate for current complexity because most workflows share a database and transactional consistency boundary. Splitting services would add coordination cost without evidence of independent scaling or ownership needs.

## 6. Data Architecture

### Persistence technology

**Confirmed.** Prisma 7 models a MySQL data source. Runtime connectivity uses `@prisma/adapter-mariadb`, and `lib/prisma.ts` maintains a development singleton to avoid repeated client creation. Evidence: `prisma/schema.prisma`, `prisma.config.ts`, `lib/prisma.ts`, and `package.json`.

### Domain model

The schema has six major aggregates:

1. **Identity:** `User`, `Account`, `Session`, `VerificationToken`, and `UserAllergen`.
2. **Catalog:** `MenuCategory`, `MenuItem`, item allergens, option groups, and option choices.
3. **Weekly planning:** `WeeklyMenuPeriod`, packages, offerings, allowed options, and allergen links.
4. **Orders:** `Order`, `OrderItem`, weekly selection snapshots, meal-slot snapshots, option snapshots, and `OrderStatusHistory`.
5. **Service requests:** `CateringRequest`, with a discriminator for catering versus personal chef.
6. **Operations:** `BusinessSettings`, `GalleryImage`, and `AdminAuditLog`.

Evidence: `prisma/schema.prisma`.

### Historical snapshots

**Confirmed.** Orders intentionally copy names, descriptions, prices, package characteristics, selected options, allergen conflict data, and weekly-period labels rather than depending exclusively on mutable catalog rows. Optional foreign keys use `onDelete: SetNull` while snapshot fields remain. This preserves the commercial record when menus change. Evidence: `OrderItem`, `OrderWeeklyMealPlanSelection`, `OrderWeeklyMealPlanSlotSelection`, and `OrderWeeklyMealPlanSlotOptionSelection` in `prisma/schema.prisma`, plus persistence logic in `app/api/orders/route.ts`.

### Integrity and concurrency

**Confirmed.** The schema uses unique constraints for user email, category name, join pairs, weekly package shape, weekly offering names, and per-slot option types. It also supplies indexes for common weekly-menu, gallery, allergen-option, and audit queries. Evidence: `prisma/schema.prisma`.

**Confirmed.** Order creation uses a Prisma transaction. Weekly capacity is represented by `capacity` and `ordersPlaced`, and server code, not the browser, owns the increment and availability decision. Evidence: `app/api/orders/route.ts` and `WeeklyMenuPeriod` in `prisma/schema.prisma`.

**Confirmed.** Owner bootstrap uses a serializable transaction and maps the relevant Prisma write-conflict error to a retry response. Evidence: `app/api/setup/promote-owner/route.ts`.

### Migration posture

**Confirmed.** Nine timestamped migration directories are committed, beginning with the MySQL initialization and adding weekly-plan selection, scheduling, and fulfillment changes. `prebuild` runs Prisma generation and `prisma migrate deploy`. Evidence: `prisma/migrations/` and `package.json`.

### Data concerns

- **Confirmed:** Monetary values are stored as `Decimal(10,2)` in the database and converted deliberately at application boundaries.
- **Confirmed:** `BusinessSettings` has no database-enforced singleton key. Singleton behavior therefore depends on application access helpers. Evidence: `prisma/schema.prisma` and `lib/business-settings.ts`.
- **Likely:** Free-form `paymentProvider` and `paymentStatus` strings ease provider evolution but weaken database-level state integrity compared with enums.
- **Confirmed:** There is no repository implementation of backup, restore automation, retention, or data deletion workflows. The production runbook describes migration and operational checks, but evidence is insufficient to claim an automated recovery objective.

## 7. API Architecture

### Shape and conventions

**Confirmed.** The application exposes 47 App Router `route.ts` modules. The API is internal JSON/form-data HTTP rather than a separately versioned public API. Dynamic resources use filesystem parameters such as `[id]`; handlers use Next.js 16 asynchronous route context where applicable. Evidence: `app/api/`.

API groups are:

- `/api/auth/*`: Auth.js handlers.
- `/api/register`: account creation.
- `/api/account/*` and legacy `/api/profile`: authenticated profile, allergen, and password operations.
- `/api/orders`: public/guest-capable order creation; administrative order mutations exist under `/api/admin/orders/*`, plus a duplicate-compatible admin-gated mark-paid path under `/api/orders/[id]/mark-paid`.
- `/api/catering` and `/api/personal-chef`: public service request creation.
- `/api/business-settings`: public-safe business rule read.
- `/api/admin/*`: role-gated operational mutations.
- `/api/setup/*`: disabled-by-configuration, token-protected bootstrap operations.

### Validation and authority

**Confirmed.** Handlers generally normalize input and return explicit 4xx responses. High-complexity weekly-menu mutations delegate parsing to `lib/weekly-menu-validation.ts`; order option checks use `lib/menu-option-validation.ts`; settings use server-side business-rule helpers. Evidence: those helpers and their callers under `app/api/admin/`.

**Confirmed.** Price, availability, approval, allergens, scheduling, and weekly capacity are re-derived from database state during checkout. The client is an input device, not the commercial authority. Evidence: `app/api/orders/route.ts`.

**Confirmed.** Unsupported historical order-mutation endpoints for allergens and options explicitly return HTTP 410 instead of silently mutating immutable snapshots. Evidence: `app/api/admin/orders/[id]/allergens/route.ts` and `app/api/admin/orders/[id]/options/route.ts`.

### Error and response design

**Confirmed.** Error handling is local to each handler. Auth guards provide common 401/403 JSON responses, while most domain handlers catch errors and return a generic server error after logging. Evidence: `lib/auth-guards.ts` and `app/api/`.

**Tradeoff.** Local handlers keep behavior obvious but produce repetition and inconsistent response shapes. There is no shared error envelope, request correlation identifier, generated API schema, or OpenAPI contract.

### API concerns

- `POST /api/orders` is approximately the central application service but remains a single large handler. It should be decomposed behind the same HTTP contract.
- Rate limits cover order creation, service request creation, registration, password change, and setup operations, but are process-local. Evidence: `lib/rate-limit.ts`.
- Evidence is insufficient to claim idempotency for order or service-request submission. Network retries could therefore create duplicates.
- Evidence is insufficient to claim formal API compatibility guarantees; routes appear designed for the co-deployed UI.

## 8. UI Architecture

### Rendering model

**Confirmed.** The root layout supplies global fonts, styles, authentication context, header, and footer. Most data-list/detail pages are async Server Components that query Prisma directly. Forms, modals, filters, charts, and stateful controls are Client Components. Evidence: `app/layout.tsx`, `components/providers/AuthProvider.tsx`, pages under `app/admin/`, and interactive components under `components/`.

### State management

**Confirmed.** Zustand owns browser-local cart and checkout state. Both stores use persistence middleware and explicit schema versions. Cart migration intentionally clears old data; checkout persistence excludes/reset sensitive or transient acknowledgement state. Evidence: `store/cart-store.ts` and `store/checkout-store.ts`.

**Tradeoff.** Local persistence supports guests and recovery across reloads, but the cart is not a durable server-side object and may become stale. Server-side revalidation at order submission is therefore essential and is implemented.

### Component organization

**Confirmed.** Components are grouped by business surface (`account`, `admin`, `allergens`, `auth`, `cart`, `layout`, `menu`, `providers`, and `service-requests`). Shared styling is primarily Tailwind CSS 4 plus semantic utility compositions in `app/globals.css`. Evidence: `components/`, `app/globals.css`, `postcss.config.mjs`, and `package.json`.

### Accessibility and responsive design

**Confirmed.** The code includes semantic labels, keyboard focus styles, disabled states, responsive layouts, and image alt properties across primary surfaces. Existing QA documents record desktop and compact-mobile smoke passes. Evidence: `app/globals.css`, form components, `docs/pre-launch-qa-runbook.md`, and `docs/current-development-status.md`.

**Insufficient evidence.** There is no automated accessibility test configuration or committed audit output, so conformance to a specific WCAG level cannot be claimed.

### UI concerns

- `app/checkout/page.tsx` and the weekly menu administration page are large components with multiple responsibilities.
- The root layout wraps the full application in an authentication Client Provider. This is functional, but client-boundary size should be monitored. Evidence: `app/layout.tsx` and `components/providers/AuthProvider.tsx`.
- There is no Storybook or isolated component-test environment.
- Error/loading boundaries are not systematically present at every route segment; evidence is insufficient to claim a consistent route-level recovery UX.

## 9. Security Review

### Positive controls

**Confirmed.** Passwords are hashed with bcrypt cost 12. Authentication uses Auth.js credentials and JWT sessions. Evidence: `app/api/register/route.ts`, `app/api/account/password/route.ts`, and `auth.ts`.

**Confirmed.** Administrative authorization is centralized and re-reads the user's current database role, limiting stale JWT privilege after demotion. Admin pages return not-found to unauthorized signed-in users; APIs return 401/403. Owner-only guards are separate. Evidence: `lib/auth-guards.ts`.

**Confirmed.** Customer order detail uses ownership criteria tied to the signed-in customer rather than loading solely by order ID. Account service-request detail similarly checks ownership. Evidence: `app/orders/[id]/page.tsx` and `app/account/catering/[id]/page.tsx`.

**Confirmed.** Security headers apply globally: HSTS in production, content-type sniffing protection, referrer and permissions policies, frame restriction, and a baseline CSP restricting base URI, form action, framing, and objects. Evidence: `next.config.ts`.

**Confirmed.** Setup routes are unavailable when their secrets are absent/short, compare token digests using constant-time comparison, are rate-limited, disable caching, and instruct operators to remove the token after use. Evidence: `app/api/setup/promote-owner/route.ts` and `app/api/setup/seed-foundation/route.ts`.

**Confirmed.** Admin mutation coverage is recorded in `AdminAuditLog`; the helper intentionally avoids failing the business mutation if audit persistence fails. Evidence: `lib/admin-audit-log.ts`, admin handlers, and `docs/admin-audit-log.md`.

**Confirmed.** Uploads restrict declared MIME types, size, generated filename characters, and deletion paths. Local production writes are denied by default. Evidence: `lib/public-upload.ts`.

### Risks and gaps

- **High operational priority, confirmed:** process-local rate limiting does not provide a global limit across horizontal replicas and trusts proxy-derived IP headers. Deployments must normalize trusted proxy headers and use a shared rate-limit store before relying on this as the primary abuse control. Evidence: `lib/rate-limit.ts`.
- **Confirmed:** no MFA or step-up authentication exists for privileged users. Evidence: `auth.ts` and `docs/security-hardening-audit.md`.
- **Confirmed:** no password-reset workflow is implemented, although password change for authenticated users exists. Evidence: `app/api/account/password/route.ts` and `docs/password-management-review.md`.
- **Confirmed:** the CSP is intentionally minimal and does not constrain `default-src`, `script-src`, `style-src`, `img-src`, or `connect-src`. It provides useful targeted protections but is not a restrictive resource policy. Evidence: `next.config.ts`.
- **Likely:** Auth.js same-origin/session protections reduce CSRF exposure for normal form/API use, but the repository has no explicit application-wide Origin/Referer validation helper or CSRF token layer for custom mutation routes. Security behavior should be validated against the exact deployed Auth.js/Next.js version before making a stronger claim.
- **Confirmed:** file validation trusts the browser-provided MIME type and does not inspect image magic bytes or re-encode content. This is partly mitigated by download context, extension normalization, and CSP, but durable storage work should add content inspection.
- **Confirmed:** application errors are written to process logs without a structured logging/redaction layer. The reviewed code does not intentionally print configured secrets, and the environment checker explicitly avoids values, but operational log governance is not implemented in the repository.
- **Insufficient evidence:** there is no committed SAST/DAST workflow or CI configuration in scope. Git history documents dependency advisory fixes, but continuous scanning cannot be claimed.

No credentials, tokens, environment values, private URLs, or infrastructure identifiers were included in this review.

## 10. Deployment Review

### Build and release model

**Confirmed.** Standard commands are `next build` and `next start`. `prebuild` first generates Prisma Client and applies committed migrations with `prisma migrate deploy`. Evidence: `package.json`.

**Confirmed.** The application requires a Node.js runtime capable of running Next.js and filesystem/server code, plus a reachable MySQL-compatible database. The repository's runbook recommends an LTS Node line and explicitly treats other runtime output as needing review. Evidence: `package.json`, `lib/public-upload.ts`, and `docs/production-runbook.md`.

**Confirmed.** `scripts/check-production-env.mjs` provides a preflight check for required configuration, URL posture, email mode, upload posture, scheduling timezone, and setup settings without printing secret values. Evidence: that script and the `env:check` package command.

### External integrations

- **Database:** MySQL-compatible server via Prisma/MariaDB adapter.
- **Email:** Resend when configured; preview/dry-run/disabled modes otherwise. Evidence: `lib/email.ts`.
- **Payments:** manual/offline workflow only. No active gateway callbacks or webhooks are present.
- **Storage:** repository-local public filesystem in development; production use is denied by default and no durable adapter exists.

### Deployment risks

1. Running migrations automatically during every build couples artifact construction to database reachability and mutation. This may be acceptable for a simple single-environment host, but build and release responsibilities should be separated in mature CI/CD.
2. A read-only or ephemeral application filesystem cannot support enabled local uploads.
3. No container definition, infrastructure-as-code, CI workflow, health endpoint, readiness check, or telemetry backend is committed. Deployment automation and observability are therefore outside the verified repository design.
4. Email rendering failure is caught and does not roll back completed business operations. This favors order durability, but without a queue/outbox there is no guaranteed retry. Evidence: `lib/email.ts` and order/service handlers.

### Current verification status

The final lint and build results for this review are recorded in the Verification Record near the end of this document. No deployment was performed.

## 11. Engineering Decisions

The repository demonstrates the following decisions; descriptions of motivation are limited to what code or committed design records support.

1. **Modular monolith:** one Next.js application owns UI, API, authentication, and domain orchestration. **Confirmed** by repository structure.
2. **Server-first rendering:** database reads generally occur in Server Components, with client boundaries reserved for interaction. **Confirmed** by `app/` and `components/`.
3. **Server-authoritative commerce:** client prices and selections are revalidated against live data. **Confirmed** by `app/api/orders/route.ts`.
4. **Snapshot order history:** mutable menu data is copied into order-owned records. **Confirmed** by `prisma/schema.prisma`.
5. **Approval-first workflows:** orders and service requests carry approval state independently from fulfillment status. **Confirmed** by schema enums/models and admin routes.
6. **One shared service-request aggregate:** catering and personal-chef requests share storage and administration using a type discriminator. **Confirmed** by `CateringRequest.requestType`.
7. **Configurable scheduling with server resolution:** global and per-week defaults control ordering and fulfillment; customer scheduling can be disabled. **Confirmed** by `BusinessSettings`, `WeeklyMenuPeriod`, and scheduling helpers.
8. **Manual payment launch posture:** payment status is operationally recorded without automated capture. **Confirmed** by checkout/admin code and launch documentation.
9. **Fail-open audit and notification side effects:** core mutations are not undone solely because audit logging or email fails. **Confirmed** by `lib/admin-audit-log.ts` and `lib/email.ts` callers.
10. **Protected one-time setup endpoints:** operational bootstrap is configuration-gated and auditable. **Confirmed** by `app/api/setup/`.

Implementation history or the identity of decision makers is not inferred; repository evidence is insufficient.

## 12. Design Tradeoffs

| Choice | Benefit | Cost |
|---|---|---|
| Next.js modular monolith | Simple deployment and direct transactional access | UI/API/domain boundaries can blur; large route modules emerge |
| Server Components query Prisma directly | Low ceremony and limited client data exposure | Page logic couples rendering to persistence and complicates isolated tests |
| Zustand local cart | Guest-friendly, responsive, survives reload | Not cross-device; stale and user-editable; requires strong submission validation |
| Snapshot order data | Historical and financial stability | More schema complexity and duplicate values |
| JWT session plus DB role recheck | Fast identity transport with current authorization | Extra database query on protected access; session invalidation remains limited |
| Manual payment tracking | Enables operations without gateway risk | Reconciliation is manual; no immediate payment guarantee |
| Synchronous email after mutation | Simple implementation | Adds latency and lacks durable retry/outbox semantics |
| In-memory rate limiting | No external dependency | Per-process only, restart-sensitive, proxy-header dependent |
| Filesystem uploads | Easy local development | Unsuitable for ephemeral or multi-instance production hosts |
| Application-managed settings singleton | Easy retrieval and evolution | Singleton invariant is not enforced by the database |

## 13. Technical Debt

### Priority 1

- Add automated coverage for order pricing, weekly capacity/concurrency, scheduling windows, authorization/ownership, and service-request state transitions.
- Extract `POST /api/orders` into testable application services while retaining one transaction boundary and the existing HTTP contract.
- Replace process-local rate limiting with a shared, atomic store and trusted-proxy configuration.
- Implement durable object storage before enabling production uploads.

### Priority 2

- Introduce idempotency keys for order and service-request creation.
- Add an outbox/queue or retryable notification record for transactional email.
- Strengthen privileged access with MFA or step-up authentication and implement password reset.
- Expand CSP in report-only mode, measure violations, then enforce explicit resource directives.
- Add structured, redacted logs, request correlation, error monitoring, and health/readiness signals.
- Separate migration execution from artifact build when a deployment pipeline exists.

### Priority 3

- Remove legacy Stripe dependency, optional Stripe configuration, and disabled checkout state once payment-provider migration boundaries are finalized. Evidence: `package.json`, `env.ts`, and `app/checkout/page.tsx`.
- Consolidate the legacy `/api/profile` route with `/api/account/profile` and remove duplicate mark-paid route surfaces after compatibility analysis.
- Add a database-enforced singleton strategy or an explicit settings key.
- Standardize validation and error response envelopes, ideally with shared Zod schemas where useful.
- Split large checkout and weekly administration UI modules into smaller view-model and presentation units.
- Remove dormant/commented font experiments from `app/layout.tsx`.

## 14. Known Limitations

**Confirmed:**

- Automated online checkout is disabled; payment is manual/offline.
- Production-local uploads are disabled unless an explicit unsafe-for-most-hosts override is set; durable storage is absent.
- Password reset and MFA are absent.
- Cart and checkout state are local to one browser profile.
- Email has no durable retry mechanism.
- Rate limiting is local to one running process.
- Historical order allergen/option mutation endpoints return 410 by design.
- Customer-selected scheduling can be disabled and fixed fulfillment can omit a public time.
- Capacity is weekly order-slot based rather than total item/package quantity. Evidence: `WeeklyMenuPeriod` and ordering logic/documentation.
- No general automated test runner is configured in `package.json`.

**Insufficient evidence:** supported traffic volume, uptime target, recovery objectives, browser support policy beyond Next.js defaults, formal accessibility target, data-retention policy, privacy/compliance classification, and multi-region capability.

## 15. Lessons Learned

These are architectural lessons supported by the current design, not claims about past team intent.

1. Commerce clients must be treated as untrusted caches. The server-side repricing and option resolution in `app/api/orders/route.ts` is essential because Zustand state is editable and can be stale.
2. Historical records need snapshots. The weekly-plan snapshot hierarchy protects order meaning after catalogs are edited or deleted.
3. Authentication claims are not sufficient authorization state. `lib/auth-guards.ts` correctly rechecks persisted roles for privileged work.
4. Configurable time rules require timezone-aware, centralized helpers. The dedicated weekly and checkout scheduling modules avoid scattering calendar rules across UI and handlers.
5. Launch-safe degradation should be explicit. Email modes, disabled gateway UI, and production upload denial make incomplete integrations visible rather than silently pretending they are operational.
6. Thorough manual runbooks are valuable but do not replace executable regression coverage. The documentation is a strength; converting its most critical scenarios into tests is the next maturity step.

## 16. Future Roadmap

### Near term: reliability baseline

1. Establish unit tests for pure domain helpers and integration tests against an isolated MySQL-compatible database.
2. Add end-to-end tests for guest/authenticated checkout, weekly plans, ownership, admin approval/status/payment, and service requests.
3. Refactor order creation into parse, resolve, validate, price, persist, and notify phases.
4. Add shared rate limiting, idempotency, structured logs, and health/readiness checks.

### Launch infrastructure

1. Choose and implement durable image storage with content inspection and lifecycle management.
2. Create CI that runs lint, typecheck, tests, production environment checks in safe/report mode, and build.
3. Run migrations as an explicit release step with verified backup/restore procedures.
4. Configure production email and conduct the documented live-send and end-to-end QA processes.

### Product capability

1. Implement the selected payment providers as a dedicated phase with webhook verification, idempotency, reconciliation, refunds, and audited state transitions.
2. Add password reset and stronger administrator authentication.
3. Consider customer-visible notification history and delivery retries.

### Scale only when evidence requires it

Keep the modular monolith. Introduce separate workers first for durable notifications or image processing if those needs materialize. There is currently insufficient evidence to recommend microservices, multi-tenancy, or multi-region data architecture.

## 17. Repository Strengths

- Server-authoritative order validation and pricing.
- Transactional persistence and capacity updates.
- Rich immutable snapshots for complex weekly selections.
- Central persisted-role authorization guards.
- Clear `ADMIN` versus `OWNER` separation and last-owner protection.
- Broad administrative audit coverage.
- Thoughtful allergen acknowledgement and conflict snapshots.
- Centralized scheduling and business-rule helpers.
- Safe configuration-gated setup endpoints.
- Secure-by-default production upload posture.
- Versioned browser-state migrations.
- Extensive launch, security, operations, weekly-menu, and manual-QA documentation under `docs/`.
- Dependency pinning/overrides and recent Git history showing targeted advisory remediation.
- A production environment checker designed not to disclose secret values.

## 18. Recommendations

1. **Approve the current modular-monolith direction.** It matches the shared transactional domain and observed operating scope.
2. **Make regression automation the next engineering investment.** Start with the order transaction and authorization boundaries; these carry the greatest business risk.
3. **Refactor without changing behavior.** Extract the order handler behind characterization tests before adding payment functionality.
4. **Do not enable filesystem uploads in a typical production deployment.** Add durable storage first.
5. **Do not treat the current rate limiter as a distributed security boundary.** Replace it before horizontal scaling or meaningful hostile traffic.
6. **Design payment as a state machine and reconciliation system, not only a checkout button.** Preserve server-authoritative totals and immutable order snapshots.
7. **Add idempotency and durable notifications.** These close common retry/failure gaps without requiring service decomposition.
8. **Strengthen privileged identity.** Add password reset, MFA/step-up, and documented session revocation behavior.
9. **Create a release pipeline.** Run lint, typecheck, tests, migration validation, build, dependency/security checks, and environment validation with explicit promotion gates.
10. **Keep this EDR current.** Update it when data boundaries, payment, storage, authentication, or deployment topology change; derive narrower engineering records from those decisions.

## Repository Areas Reviewed

The review covered:

- Application routes, layouts, and pages: `app/`
- All Route Handlers: `app/api/`
- Shared UI and workflow components: `components/`
- Domain, security, persistence, email, upload, reporting, and scheduling helpers: `lib/`
- Browser state and hooks: `store/`, `hooks/`
- Prisma schema, nine committed migrations, seed, and promotion utilities: `prisma/`
- Email templates: `emails/`
- Types and static option/gallery data: `types/`, `data/`
- Build, TypeScript, lint, Next.js, Prisma, PostCSS, environment example, package, and ignore configuration
- Production/environment and focused QA scripts: `scripts/`
- Project documentation under `docs/` plus root documentation
- Recent Git history and the reviewed commit identity
- Public asset organization and upload paths, without treating binary/generated assets as application source
- The bundled Next.js 16 documentation relevant to Server/Client Components, Route Handlers, authentication, and deployment, as required by `AGENTS.md`

Excluded from design inspection: `node_modules` implementation, `.next`, build output, generated TypeScript build metadata, local logs, and secret-bearing environment files. The bundled Next.js documentation was read only to satisfy the repository's version-specific framework instruction.

## Verification Record

| Check | Result |
|---|---|
| Reviewed commit | `9e2ca66703e903890e2a14de1f1e7a3f6bfbfba5` |
| Working tree before documentation | Clean |
| `npm run lint` | Passed with no ESLint warnings or errors |
| `npm run build` | Passed; Prisma Client generated, all nine committed migrations were already applied, Next.js compiled, TypeScript completed, and 57 static pages were generated |
| Deployment | Not performed |

Build is expected to run the repository-defined `prebuild` hook, which generates Prisma Client and executes `prisma migrate deploy`. The recorded result must therefore be interpreted as validation against the configured review environment, not as proof that every future production environment is reachable or correctly configured.

The successful build emitted a Node.js deprecation warning for `module.register()` from the build toolchain. The repository evidence does not identify an application call site; treat this as a dependency/runtime compatibility warning to monitor rather than an application build failure.
