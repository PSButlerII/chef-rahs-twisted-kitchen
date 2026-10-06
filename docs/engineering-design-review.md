# Food Service Platform Engineering Design Review

## Document status and evidence convention

This internal Recon Dev document is the primary technical reference for the repository at commit `0698f173ecd30a835d2936e756bbd49e8a04bda2`, reviewed on 2026-10-06. It describes the implementation in that revision, not undocumented product intent.

The review intentionally excludes client identity, customer data, contact addresses, credentials, secret or configuration names, private URLs, infrastructure identifiers, and business-sensitive pricing. Client-specific rules are described only as generic food-service workflows.

Conclusions use these labels:

- **Confirmed** — demonstrated directly by application code, schema, configuration, scripts, committed documentation, or Git history.
- **Likely** — a bounded inference supported by multiple repository signals but not enforced as a formal contract.
- **Speculative** — plausible but unsupported; speculative items are not treated as facts or planned work.

Repository paths are the evidence citations. Executable code and schema take precedence where historical documentation differs from the current implementation.

## 1. Executive Summary

**Confirmed.** This repository implements a production-oriented food-service platform for meal plans, à la carte ordering, catering requests, and personal-chef requests. It combines a public storefront, customer accounts, guest and authenticated checkout, configurable scheduling, approval workflows, payments, transactional notifications, and an authenticated operations dashboard. Evidence: `app/`, `components/`, `app/api/`, and `prisma/schema.prisma`.

The system is a modular monolith built with Next.js 16, React 19, Auth.js, Prisma 7, and a MySQL-compatible database accessed through the MariaDB adapter. The repository does **not** implement PostgreSQL; that assumption is unsupported by the current schema and adapter. Browser-side Zustand stores hold cart and checkout drafts, while server routes remain authoritative for availability, pricing, scheduling, approval, payment, and persistence. Evidence: `package.json`, `prisma/schema.prisma`, `lib/prisma.ts`, `store/cart-store.ts`, and `store/checkout-store.ts`.

The strongest design properties are server-authoritative order construction, transactional persistence, immutable order snapshots, persisted-role authorization, payment idempotency and webhook reconciliation, explicit service-request states, configurable meal-plan scheduling, and broad administrative tooling. Evidence: `app/api/orders/route.ts`, `lib/auth-guards.ts`, `prisma/schema.prisma`, `app/api/webhooks/square/route.ts`, and `app/admin/`.

The main engineering risks are insufficient automated regression coverage, a large order orchestration handler, process-local rate limiting, synchronous best-effort email, filesystem-dependent uploads, extensive manual launch procedures, and documentation drift across a large operational document set. The codebase should remain a modular monolith; repository evidence does not justify microservices.

## 2. Project Purpose

**Confirmed.** The platform supports public discovery, direct ordering, quote-and-approval service requests, and administrative operations. Public pages cover menus, meal plans, gallery content, catering, and personal-chef services. Cart and checkout support purchases. Separate request flows support work that is not a direct catalog purchase. The dashboard manages menus, weekly plans, orders, kitchen work, service requests, customers, payments, gallery content, notifications, reports, settings, audit history, roles, and help content. Evidence: `app/`, `app/api/`, and `components/admin/`.

**Confirmed.** This is not merely a brochure site. It persists identity, catalog, weekly plans, orders, service requests, payment attempts, webhook events, retry tokens, business settings, gallery records, allergens, status history, and administrative audit records (`prisma/schema.prisma`).

**Likely.** The architecture targets one food-service business and a small operations team. The schema has no tenant boundary, menu and settings are global, and owner bootstrap is singleton-oriented (`prisma/schema.prisma`, `lib/business-settings.ts`, `app/api/setup/promote-owner/route.ts`).

**Speculative.** Multi-tenant, multi-brand, or multi-location operation is not established by repository evidence.

## 3. Intended Users

### Public visitors

**Confirmed.** Unauthenticated visitors can browse public content, active menus, weekly offerings, and gallery images, and can submit service requests (`app/`, `app/api/catering/route.ts`, `app/api/personal-chef/route.ts`).

### Guests and registered customers

**Confirmed.** Guest checkout is supported because order and service-request ownership is optional while contact snapshots are required. Registered customers can sign in, maintain profile and allergen preferences, change passwords, view orders and service requests, retry eligible payments, and reorder eligible items (`auth.ts`, `app/account/`, `app/api/account/`, `prisma/schema.prisma`).

### Administrators

**Confirmed.** Administrators operate menus, weekly periods and packages, orders, kitchen views, service requests, payments, reports, gallery content, notifications, settings, customer records, audit history, and help content (`app/admin/`, `components/admin/`).

### Owners

**Confirmed.** Owners have administrative capabilities plus role management. The system protects the final owner from demotion and provides configuration-gated bootstrap utilities for the first owner (`app/admin/role-manager/page.tsx`, `app/api/admin/users/[id]/role/route.ts`, `app/api/setup/promote-owner/route.ts`).

## 4. Business Workflow

### Standard and weekly ordering

1. Public menu pages load available catalog items and an eligible published weekly period (`app/menu/page.tsx`, `components/menu/WeeklyMenuSection.tsx`).
2. Customers configure ordinary item options or weekly meal-plan slots. Versioned Zustand state stores cart and checkout drafts locally (`components/menu/MenuItemModal.tsx`, `components/menu/WeeklyMenuOrderForm.tsx`, `store/cart-store.ts`).
3. Checkout collects fulfillment, contact, allergen acknowledgement, tip, and payment input. Account data may prefill and optionally update the authenticated profile (`app/checkout/page.tsx`, `store/checkout-store.ts`).
4. `POST /api/orders` treats browser input as untrusted. It reloads live menu and weekly records, validates current availability and options, enforces schedule and capacity rules, recalculates amounts, determines approval requirements, creates immutable snapshots, and persists the workflow transactionally (`app/api/orders/route.ts`, `lib/menu-option-validation.ts`, `lib/weekly-menu-validation.ts`, `lib/order-calculations.ts`).
5. Orders that do not require approval can enter configured online payment. Approval-required weekly orders remain awaiting approval and use a hosted payment request after approval (`app/api/orders/route.ts`, `app/api/admin/orders/[id]/payment-request/route.ts`, `lib/payment-config.ts`).
6. Administrators approve or deny, update fulfillment state, review kitchen work, reconcile payment, and process eligible refunds (`app/api/admin/orders/`, `app/admin/kitchen/page.tsx`, `app/api/admin/payments/[id]/refund/route.ts`).

### Catering and personal-chef requests

**Confirmed.** Both request types share one persisted service-request aggregate distinguished by a type discriminator. Public submissions create reviewable requests rather than direct catalog orders (`app/api/catering/route.ts`, `app/api/personal-chef/route.ts`, `prisma/schema.prisma`).

Administrators can approve or deny, add a quote, advance guarded workflow states, request a deposit and final balance, or record externally confirmed payments. Payment requests use the shared payment ledger (`app/api/admin/catering/`, `lib/service-request-workflow.ts`, `lib/service-request-payment-phase.ts`).

### Pickup, delivery, and scheduling

**Confirmed.** Checkout supports pickup and delivery. Contact and delivery information is snapshotted on the order. Customer-selected scheduling can be enabled, otherwise the server resolves a fixed fulfillment date from persisted settings. Weekly periods can override ordering-open, late-fee, ordering-close, and fixed-fulfillment values (`lib/checkout-fulfillment.ts`, `lib/server-business-rules.ts`, `lib/weekly-ordering-window.ts`, `prisma/schema.prisma`).

### Notifications

**Confirmed.** React Email templates cover order confirmation, approval, payment requests, payment receipt, cancellation for nonpayment, refunds, and service-request lifecycle events. Delivery supports live, dry-run, preview-file, and disabled modes (`emails/`, `lib/email.ts`, `lib/email-preview.ts`).

**Confirmed limitation.** Notification delivery is synchronous and fail-open relative to the core mutation; no durable outbox or retry queue is implemented.

## 5. System Architecture

### Architectural style

```text
Browser
  |-- Server-rendered pages
  |-- Client interaction components
  |-- Versioned local cart/checkout state
  v
Next.js modular monolith
  |-- App Router pages and Route Handlers
  |-- Auth.js authentication
  |-- Domain helpers and business rules
  |-- Payment and email adapters
  v
Prisma Client -> MariaDB adapter -> MySQL-compatible database
  |
  +-- Payment provider APIs and verified webhooks
  +-- Email provider
  +-- Configured filesystem image storage
```

**Confirmed.** Server Components are the default; Client Components are used for forms, local state, drag-and-drop, payment SDK interaction, and other browser behavior. Route Handlers provide the HTTP boundary (`app/`, `components/`, `store/`).

### Module boundaries

- `app/`: pages, layouts, route composition, and 57 Route Handler modules.
- `components/`: public, account, menu, checkout, allergen, and administration UI.
- `lib/`: domain rules, authorization, persistence, scheduling, payment, refunds, email, uploads, reporting, audit, and cache revalidation.
- `store/`: versioned browser cart and checkout state.
- `prisma/`: schema, 10 committed migrations, seeds, and role-promotion utilities.
- `emails/`: transactional email components.
- `scripts/`: environment checks, focused QA, maintenance, and payment recovery.
- `docs/`: design, security, launch, operations, QA, and handoff records.

### Runtime boundaries

**Confirmed.** Database and authorization modules are server-only. Privileged routes recheck persisted roles instead of trusting only token claims (`lib/auth-guards.ts`). Cache invalidation for mutable menu content is explicit (`lib/menu-revalidation.ts`, `lib/weekly-menu-revalidation.ts`).

**Likely.** One deployment remains appropriate because ordering, catalog, approval, payment, and customer workflows share a single transactional data model. Separate services would add coordination cost without evidence of independent scale or team ownership.

## 6. Data Architecture

### Persistence technology

**Confirmed.** Prisma models a MySQL data source and the runtime uses the MariaDB adapter. The repository contains a MySQL-family migration baseline, not PostgreSQL (`prisma/schema.prisma`, `lib/prisma.ts`, `prisma/migrations/`).

### Domain aggregates

1. **Identity:** users, Auth.js accounts/sessions, verification tokens, roles, and allergen preferences.
2. **Catalog:** categories, items, allergens, option groups, and option choices.
3. **Weekly planning:** periods, packages, offerings, allowed options, schedules, and capacity.
4. **Orders:** contact/fulfillment snapshots, item snapshots, weekly slot snapshots, option snapshots, approval, and status history.
5. **Service requests:** shared catering/personal-chef request workflow and approval/quote/deposit state.
6. **Payments:** attempts, provider identity, purpose, idempotency keys, webhook events, retry tokens, status timestamps, and refund lineage.
7. **Operations:** business settings, gallery images, and administrative audit logs.

Evidence: `prisma/schema.prisma`.

### Historical integrity

**Confirmed.** Orders snapshot names, prices, package shape, offering details, selected options, allergens, and fulfillment/contact information. Optional catalog relationships use `SetNull` while snapshots survive, preserving historical meaning after catalog changes (`prisma/schema.prisma`, `app/api/orders/route.ts`).

### Monetary and payment data

**Confirmed.** Catalog and order amounts use fixed-precision database decimals. Payment attempts store integer minor units, currency, provider identifiers, idempotency keys, purpose, website/provider state, and timestamps. Webhook event IDs are unique per provider, enabling duplicate delivery handling (`prisma/schema.prisma`, `app/api/webhooks/square/route.ts`).

### Integrity and concurrency

**Confirmed.** The schema uses unique constraints and indexes across identity, catalog joins, weekly configurations, payment identifiers, webhook events, and retry tokens. Order creation and payment reconciliation use database transactions (`prisma/schema.prisma`, `app/api/orders/route.ts`, `app/api/webhooks/square/route.ts`).

**Known concern.** `BusinessSettings` has no database-enforced singleton key; singleton behavior is application-managed (`lib/business-settings.ts`, `prisma/schema.prisma`).

## 7. API Architecture

### Route organization

**Confirmed.** The application has 57 App Router route modules. They are co-deployed application APIs, not a separately versioned public platform API.

- Authentication and registration: `app/api/auth/`, `app/api/register/`.
- Customer profile and allergens: `app/api/account/`.
- Orders and service requests: `app/api/orders/`, `app/api/catering/`, `app/api/personal-chef/`.
- Public-safe settings and payment configuration: `app/api/business-settings/`, `app/api/payments/`.
- Administrative operations: `app/api/admin/`.
- Operational bootstrap/jobs: `app/api/setup/`, `app/api/jobs/`.
- Provider callbacks: `app/api/webhooks/`.

### Validation and authority

**Confirmed.** The server re-derives catalog availability, selection validity, pricing, tips, fees, approval, scheduling, and capacity from persisted state. Client prices and browser state are not accepted as commercial authority (`app/api/orders/route.ts`). Weekly-menu and option validation are delegated to focused helpers (`lib/weekly-menu-validation.ts`, `lib/menu-option-validation.ts`).

### Payment API behavior

**Confirmed.** Payment readiness fails closed when required configuration is incomplete. Payment attempts use unique idempotency keys. Verified webhooks deduplicate events, match amount/currency/location to the ledger, reconcile payment/refund state, and update linked orders or service requests transactionally (`lib/square-readiness.ts`, `lib/square.ts`, `app/api/webhooks/square/route.ts`).

Hosted payment-request routes safely create or reuse active requests for approved orders and service-request phases. A protected job expires eligible pending attempts, and recovery scripts exist for a narrowly documented refund incident (`app/api/admin/orders/[id]/payment-request/route.ts`, `app/api/admin/catering/`, `app/api/jobs/expire-pending-payments/route.ts`, `scripts/reconcile-affected-square-refund.ts`).

### API limitations

- Error handling and response shapes remain local to handlers; there is no shared error contract or OpenAPI description.
- Order creation remains a large orchestration module.
- Evidence is insufficient to claim idempotency for initial order and service-request submissions.
- Route compatibility appears designed for the co-deployed UI; no external stability contract is documented.

## 8. UI Architecture

### Rendering and state

**Confirmed.** Public, account, and admin pages use Server Components for initial reads. Client Components own interactive forms, modal state, sortable gallery operations, cart, checkout, payment SDK usage, and admin actions (`app/`, `components/`).

Zustand stores persist cart and checkout drafts with versioned migrations. Checkout deliberately resets and reloads identity-sensitive contact data to avoid cross-user leakage (`store/cart-store.ts`, `store/checkout-store.ts`, `app/checkout/page.tsx`).

### Shared components

The UI is organized by domain: account, admin, allergens, authentication, cart, checkout, gallery, layout, menu, providers, and service requests (`components/`). Administrative help content is searchable in-app and contextual links connect operational pages to relevant guidance (`components/admin/AdminHelpCenter.tsx`, `data/admin-help.ts`, `app/api/admin/help/`).

### Administrative dashboard

**Confirmed.** The dashboard provides operational entry points and summaries, while dedicated pages handle orders, kitchen work, service requests, customers, payments, reports, notifications, menu configuration, gallery, settings, audit history, help, and roles (`app/admin/`).

### Accessibility

**Confirmed strengths.** Native controls, explicit labels, keyboard-aware sortable gallery interactions, semantic status messaging, focus treatments, responsive layouts, and Next.js image handling are present across major paths (`components/`, `app/globals.css`).

**Insufficient evidence.** No formal accessibility conformance target, automated accessibility suite, or assistive-technology test record is established repository-wide.

## 9. Security Review

### Confirmed controls

- Passwords are hashed and verified with bcrypt through Auth.js credentials authentication (`auth.ts`, `app/api/register/route.ts`).
- Admin/owner authorization rechecks the persisted role on privileged access (`lib/auth-guards.ts`).
- Customer-owned records are queried and mutated with ownership constraints (`app/account/`, `app/api/account/`, `app/orders/[id]/page.tsx`).
- Setup routes are configuration-gated, token-protected, rate-limited, and designed to disable after use (`app/api/setup/`).
- Server-authoritative repricing prevents browser cart manipulation from setting commercial amounts (`app/api/orders/route.ts`).
- Payment creation fails closed; provider webhooks require signature verification and ledger matching (`lib/square-readiness.ts`, `app/api/webhooks/square/route.ts`).
- Uploads are admin-only, size-limited, content-signature checked, UUID-named, context-isolated, and fail closed until durable storage is configured (`app/api/admin/uploads/route.ts`, `lib/uploads/filesystem-storage.ts`).
- Global headers include CSP, HSTS in production, framing, MIME-sniffing, referrer, and permissions controls (`next.config.ts`).
- Administrative mutations broadly emit audit records (`lib/admin-audit-log.ts`, `app/admin/audit/page.tsx`).

### Confirmed risks and gaps

1. **Process-local rate limiting.** Counters are memory-resident, reset on restart, do not coordinate across replicas, and trust proxy-supplied address headers (`lib/rate-limit.ts`).
2. **No MFA or password-reset workflow.** Credentials authentication lacks a recovery flow and stronger privileged authentication (`auth.ts`, `app/`).
3. **Email is not durable.** Notification failures are logged but do not enter a retryable outbox (`lib/email.ts`).
4. **Filesystem upload dependency.** Durability and backup depend on host-mounted storage outside the application/database transaction (`lib/uploads/filesystem-storage.ts`).
5. **CSP uses inline-script/style allowances.** The policy is materially stronger than no CSP but retains allowances required by the current UI/provider integration (`next.config.ts`).
6. **Security policy document is boilerplate.** `SECURITY.md` lists unrelated version examples and does not provide an actionable disclosure policy.
7. **Test coverage is incomplete.** Security-critical ownership, authorization, payment reconciliation, and concurrency paths are not covered by a general automated test runner (`package.json`, `scripts/`).

### Privacy posture

**Confirmed.** The system stores customer contact, fulfillment, allergen, order, request, and payment metadata. The EDR does not reproduce those values. Repository evidence is insufficient to establish a complete retention, deletion, privacy-request, or compliance program.

## 10. Deployment Review

### Build and release model

**Confirmed.** The production build runs Prisma client generation and committed migration deployment before Next.js compilation (`package.json`). The production process is a standard Next.js server; static export is incompatible with authenticated, database, payment, and mutation workflows.

### Persistence and migrations

Ten migrations are committed. Migration execution during `prebuild` couples build success to database reachability and mutates the configured schema during artifact creation. This is operationally simple but weaker than a separate, controlled release phase (`package.json`, `prisma/migrations/`).

### External services

The application depends on a MySQL-compatible database, an email provider, a payment provider, and configured durable filesystem storage for admin uploads. Exact account, endpoint, credential, and infrastructure details are intentionally omitted (`lib/prisma.ts`, `lib/email.ts`, `lib/square.ts`, `lib/uploads/filesystem-storage.ts`).

### Operational tooling

**Confirmed.** The repository includes production-environment validation, launch/readiness checklists, fresh-database rehearsal, payment configuration dry-runs, payment/refund QA, upload QA, release validation, and recovery scripts (`scripts/`, `docs/`).

### Deployment limitations

- No committed CI workflow enforces lint, typecheck, tests, migration validation, and build.
- Build-time migration deployment increases rollback and concurrent-deploy risk.
- Backup/restore objectives and automated recovery are not encoded in the repository.
- Filesystem uploads require independent backup and a stable writable mount.
- Documentation records manual deployment and smoke-test steps, but their execution is not automatically evidenced.

## 11. Engineering Decisions

1. **Modular monolith:** UI, API, authentication, payments, and domain orchestration share one Next.js deployment.
2. **MySQL-compatible persistence through Prisma:** schema and runtime use the MariaDB adapter, not PostgreSQL.
3. **Server-authoritative commerce:** current database state controls prices, options, availability, fees, schedules, approval, and payment amounts.
4. **Immutable order snapshots:** mutable catalog details are copied into order-owned history.
5. **Approval separated from fulfillment:** commercial approval and operational order status evolve independently.
6. **Shared service-request aggregate:** catering and personal-chef workflows use one model with a type discriminator.
7. **Configurable scheduling:** global defaults and weekly overrides determine ordering and fulfillment windows.
8. **Payment ledger before provider state:** attempts, purposes, idempotency, events, and refunds are persisted independently of display fields.
9. **Verified webhook reconciliation:** provider callbacks update internal state only after signature and ledger checks.
10. **Fail-open side effects:** audit/email failures generally do not reverse the primary business mutation.
11. **Persisted-role authorization:** privileged access does not rely solely on JWT role claims.
12. **Fail-closed uploads and payments:** incomplete production configuration disables the feature rather than silently degrading.

Motivation is stated only where current code or committed design documentation supports it; decision-maker identity is not inferred.

## 12. Design Tradeoffs

| Choice | Benefit | Cost |
| --- | --- | --- |
| Next.js modular monolith | One deployment and shared transaction boundary | UI, API, and domain boundaries can blur |
| Server Components query Prisma | Low ceremony and limited client exposure | Rendering couples directly to persistence |
| Zustand browser cart | Fast guest experience and reload persistence | Editable, stale, and device-local state |
| Order snapshots | Stable historical and financial meaning | More tables and duplicated values |
| JWT sessions plus role recheck | Efficient identity with current authorization | Extra database read; limited token revocation |
| Approval-first weekly workflow | Avoids charging unapproved requests | Adds hosted-payment and expiration states |
| Synchronous email | Simple operational path | Adds latency and lacks durable retry |
| In-memory rate limits | No external dependency | Not distributed or restart-safe |
| Filesystem uploads | Compatible with a durable single host | Requires host-specific storage and backup |
| Build-time migration deploy | Simple hosting workflow | Couples schema mutation to builds |
| Rich manual runbooks | Strong operator guidance | Can drift and does not execute itself |

## 13. Technical Debt

### Priority 1

- Add automated unit, integration, and end-to-end coverage for order pricing, weekly capacity, scheduling, authorization, approval, payment reconciliation, refunds, and service-request transitions.
- Decompose `POST /api/orders` into testable parse, resolve, validate, price, persist, payment, and notify services without changing its transaction semantics.
- Replace process-local rate limiting with a shared atomic store and verified trusted-proxy configuration.
- Add durable notification delivery or an outbox for customer-visible lifecycle events.

### Priority 2

- Add idempotency for initial order and service-request creation.
- Separate migration deployment from artifact build when the hosting pipeline permits.
- Implement MFA or step-up authentication and a secure password-reset workflow.
- Add structured redacted logging, request correlation, error monitoring, and health/readiness endpoints.
- Establish automated backup/restore rehearsal for database and uploaded files.
- Replace the boilerplate security policy with a project-specific disclosure and supported-version policy.

### Priority 3

- Remove residual legacy provider configuration/dependencies after confirming no rollback path requires them (`env.ts`, `package.json`).
- Consolidate duplicate/legacy profile and payment mutation surfaces after compatibility analysis.
- Enforce the business-settings singleton in the database.
- Standardize request schemas and API error envelopes.
- Break large checkout and weekly-menu components into smaller view-model and presentation layers.
- Reconcile stale operational documents with the current payment and upload implementation.

## 14. Known Limitations

**Confirmed:**

- Rate limiting is local to one process.
- Email has no durable retry queue.
- Password reset and MFA are absent.
- Cart and checkout drafts are local to one browser profile.
- Filesystem uploads require explicitly configured durable storage and separate backup.
- Initial order and service-request submissions have no demonstrated idempotency contract.
- Business settings rely on an application-managed singleton.
- No general automated test runner is configured.
- Migration deployment occurs during prebuild.
- Capacity is represented at the weekly-order level rather than as total prepared-item inventory.

**Insufficient evidence:** sustained traffic capacity, uptime and recovery objectives, formal browser support, accessibility conformance target, data-retention policy, privacy/compliance classification, multi-region operation, and disaster-recovery guarantees.

## 15. Lessons Learned

These lessons are derived from the implemented design and committed reviews, not invented history:

1. Browser commerce state must be treated as an untrusted draft; live server resolution is required before persistence.
2. Historical orders need snapshots because menus, prices, offerings, and options change.
3. Authentication claims are not sufficient authorization state; privileged roles should be rechecked against persistence.
4. Weekly meal plans need a separate scheduling/capacity model rather than overloading ordinary menu items.
5. Approval-required orders need a distinct post-approval payment phase rather than premature capture.
6. Payment integration is a ledger and reconciliation problem, not only a checkout widget.
7. Webhook event uniqueness and provider idempotency keys are necessary for retry-safe payment state.
8. Time rules should be centralized and timezone-aware; customer-facing schedules must not expose internal fallback times.
9. Fail-closed provider and upload configuration makes incomplete deployment visible.
10. Manual runbooks are valuable operational memory but do not replace executable regression tests.

## 16. Future Roadmap

### Confirmed or directly supported near-term work

1. Establish automated regression coverage around ordering, authorization, payment, refunds, and service requests.
2. Refactor order orchestration behind characterization tests.
3. Move rate limiting to shared infrastructure.
4. Add durable notification delivery and request idempotency.
5. Formalize backup/restore procedures for both database and uploads.
6. Keep payment/refund reconciliation and production-readiness documentation aligned with the implemented provider workflow.

### Operational maturity

1. Add CI gates for lint, typecheck, tests, migration validation, environment validation, and build.
2. Move migrations to an explicit release phase with rollback compatibility checks.
3. Add health/readiness, structured logs, alerting, and production error monitoring.
4. Add stronger privileged authentication and account recovery.

### Scale only when evidence requires it

Retain the modular monolith. Introduce a worker first for durable notifications or background reconciliation if needed. There is insufficient evidence to recommend microservices, multi-tenancy, or multi-region persistence.

## 17. Repository Strengths

- Server-authoritative pricing, availability, selection, and schedule validation.
- Transactional order persistence and weekly capacity handling.
- Rich immutable snapshots for complex weekly selections.
- Persisted-role authorization and clear administrator/owner separation.
- Last-owner protection and configuration-gated bootstrap paths.
- Payment ledger with explicit purpose, idempotency, provider state, retry tokens, and refund lineage.
- Verified and deduplicated webhook reconciliation.
- Broad administrative audit coverage.
- Central scheduling and business-rule helpers.
- Thoughtful allergen preferences, conflict warnings, and acknowledgement snapshots.
- Fail-closed payment and upload readiness.
- Versioned browser-state migrations.
- Accessible sortable gallery management and searchable in-app administrator help.
- Extensive operational, security, payment, launch, handoff, and QA documentation.
- Dependency overrides and Git history showing active advisory remediation.
- Production-environment checks designed to avoid printing secret values.

## 18. Recommendations

1. **Approve the modular-monolith direction.** It matches the shared transactional domain and current operating scope.
2. **Make regression automation the next major investment.** Begin with the order transaction, authorization, payment webhooks, and refunds.
3. **Refactor order creation without changing behavior.** Characterize it first, then extract application services behind the existing route contract.
4. **Treat rate limiting as a distributed security control.** Replace memory counters before horizontal scaling or material hostile traffic.
5. **Add idempotency and durable notifications.** These close the largest retry/failure gaps without requiring service decomposition.
6. **Separate schema migration from compilation.** Use an explicit release phase with backup and rollback gates.
7. **Strengthen privileged identity.** Add recovery, MFA or step-up authentication, and documented revocation behavior.
8. **Operationalize recovery.** Test database and upload restore, payment reconciliation, and rollback procedures.
9. **Replace boilerplate security guidance.** Publish an accurate internal disclosure and supported-version policy without exposing client or infrastructure details.
10. **Keep this EDR current.** Update it whenever payment, storage, authentication, scheduling, or deployment boundaries change.

## Repository Areas Reviewed

- Application routes, layouts, and pages: `app/`
- All Route Handlers: `app/api/`
- Public, customer, checkout, and administration components: `components/`
- Domain, authorization, persistence, scheduling, payment, refund, email, upload, reporting, and audit helpers: `lib/`
- Browser state and hooks: `store/`, `hooks/`
- Prisma schema, 10 committed migrations, seed, and role utilities: `prisma/`
- Transactional email templates: `emails/`
- Shared types and static data: `types/`, `data/`
- Build, TypeScript, lint, Next.js, Prisma, PostCSS, package, and example configuration
- Environment validation, QA, import, maintenance, and recovery scripts: `scripts/`
- Engineering, security, payment, launch, operations, QA, and handoff documentation: `docs/`, `handoff/`
- Current `SECURITY.md`, README, root notes, and relevant Git history
- Bundled Next.js 16 documentation for Server/Client Components, Route Handlers, authentication, and deployment, as required by `AGENTS.md`

Excluded from substantive review: `node_modules` implementation, `.next`, generated output, local logs, secret-bearing environment files, customer records, and binary handoff artifacts. Binary handoff files were inventoried but not mined for private content.

## Verification Record

| Check | Result |
| --- | --- |
| Reviewed commit | `0698f173ecd30a835d2936e756bbd49e8a04bda2` |
| Documentation change | `docs/engineering-design-review.md` only |
| `npm run lint` | Passed with zero errors and one existing Next.js navigation warning in `components/account/AccountPasswordForm.tsx` |
| `npm run build` | Passed; Prisma generation and migration checks, Next.js compilation, TypeScript validation, static generation, and build tracing completed successfully |
| Deployment | Not performed |

The repository-defined build runs Prisma generation and migration deployment before Next.js compilation. A successful build therefore validates the configured review environment but does not prove that every future production environment is reachable, correctly configured, or safely recoverable.
