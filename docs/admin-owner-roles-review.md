# Admin And Owner Roles Review

Date: July 14, 2026

Branch: `review/admin-owner-roles`

This is a review and implementation plan only. No Prisma schema, authentication behavior, admin authorization, promotion script, package script, or environment handling changed during this work.

## 1. Executive Summary

The current data model already supports one `OWNER` and multiple `ADMIN` users. `OWNER` is present in the Prisma enum and the initial MySQL migration, and every shared admin guard treats `ADMIN` and `OWNER` as authorized admin roles. No Prisma migration is needed.

The current limitation is `prisma/promote-admin.ts`: it processes one `ADMIN_EMAIL` and one optional `ADMIN_ROLE` per run. It does not parse a list, distinguish owner configuration from admin configuration, enforce a one-owner policy, preflight a batch, provide dry-run output, or make the role update and audit record atomic.

For launch, `OWNER` should have all `ADMIN` permissions without adding owner-only screens or actions. The owner designation is useful for account hierarchy and future policy, but there is no current business requirement that justifies a separate permission matrix.

## 2. Current Role Model

`prisma/schema.prisma` defines:

```prisma
enum UserRole {
  CUSTOMER
  ADMIN
  OWNER
}
```

`User.role` uses that enum and defaults to `CUSTOMER`. The initial MySQL migration creates the matching `ENUM('CUSTOMER', 'ADMIN', 'OWNER')`, so existing MySQL/MariaDB databases already understand `OWNER`.

Current model findings:

- `OWNER` already exists; it does not need to be added.
- User email is unique, but role is not unique. The database can store at least four admins without a schema change.
- The schema does not enforce exactly one owner. Adding a unique constraint to `User.role` would be wrong because it would also limit the app to one admin.
- Public registration does not accept a role and relies on the `CUSTOMER` default. Privileged roles are assigned after account creation.
- `lib/prisma-enums.ts`, Auth.js user/session/JWT types, and Auth.js callbacks already include and preserve `OWNER`.
- Because sessions use JWTs, a newly promoted user should sign out and sign back in before testing the new role.

Recommendation: enforce the one-owner launch policy in the provisioning script, not with a Prisma migration. If a future requirement demands a database-level ownership invariant, design a dedicated singleton business-owner relation rather than making `User.role` unique.

## 3. Current Authorization Behavior

`lib/auth-guards.ts` defines `ADMIN_ROLES = ["ADMIN", "OWNER"]`. Both `requireAdminPage()` and `requireAdminApi()` therefore grant the same admin access to either role.

The review found:

- All 18 pages under `app/admin` call `requireAdminPage()`.
- All 33 routes under `app/api/admin` call `requireAdminApi()`.
- `app/api/orders/[id]/mark-paid` also uses `requireAdminApi()`.
- The site header shows the Admin link for both `ADMIN` and `OWNER`.
- No direct `ADMIN`-only authorization comparison was found.

Recommendation for launch: keep OWNER and ADMIN permissions equivalent. OWNER should be treated as an admin role with a higher organizational designation. Add owner-only authorization only when a concrete owner-only function exists, such as transferring ownership or managing administrator roles.

## 4. Current Promotion Script Behavior

`npm run admin:promote` runs `tsx prisma/promote-admin.ts`.

The current script:

- Requires one `ADMIN_EMAIL`.
- Accepts optional `ADMIN_ROLE`, defaulting to `ADMIN`.
- Allows `ADMIN_ROLE=ADMIN` or `ADMIN_ROLE=OWNER`.
- Normalizes the email to lowercase.
- Updates one existing user and fails if that email is not registered.
- Writes one `ADMIN_ROLE_PROMOTED` audit entry after the update.

Current limitations and risks:

- It cannot promote multiple admins in one run.
- It can create multiple owners across separate runs.
- It can accidentally demote an owner if the same email is rerun with `ADMIN_ROLE=ADMIN`.
- The role update and audit insert are separate operations, so an audit failure can occur after the role has changed.
- It writes an audit event even when the requested role is already present.
- It has no complete preflight or dry-run mode.
- `scripts/check-production-env.mjs`, `.env.example`, and launch docs only know about `ADMIN_EMAIL` and `ADMIN_ROLE`.

## 5. Recommended Environment Variable Design

Primary launch variables:

```dotenv
OWNER_EMAIL=owner@example.com
ADMIN_EMAILS=admin1@example.com,admin2@example.com,admin3@example.com,admin4@example.com
ADMIN_PROMOTION_DRY_RUN=false
```

Compatibility variables:

```dotenv
ADMIN_EMAIL=
ADMIN_ROLE=ADMIN
```

Recommended rules:

1. `OWNER_EMAIL` is required for initial production provisioning, but optional for later runs that only add admins.
2. `ADMIN_EMAILS` is optional and accepts a comma-separated list with whitespace trimming, lowercase normalization, empty-entry removal, and case-insensitive deduplication.
3. Keep `ADMIN_EMAIL` and `ADMIN_ROLE` for backward compatibility. Treat the legacy pair as one additional promotion target.
4. If legacy `ADMIN_ROLE=OWNER` identifies a different email from `OWNER_EMAIL`, fail preflight because two owners were requested.
5. If the same email appears in `OWNER_EMAIL`, `ADMIN_EMAILS`, or the legacy pair, OWNER wins. Report the collision and never demote that account to ADMIN.
6. Require at least one promotion target across the new and legacy variables.
7. `ADMIN_PROMOTION_DRY_RUN=true` performs all parsing and database preflight but makes no role or audit-log writes.

Environment variables should be treated as requested promotion targets, not a continuous source of truth. Existing admins omitted from `ADMIN_EMAILS` must remain admins; removing or demoting privileged users should be a separate, explicit workflow.

## 6. Recommended Promotion Script Behavior

Implement the existing `npm run admin:promote` command as an idempotent batch operation:

1. Parse and normalize all new and legacy environment inputs.
2. Resolve one owner target and a deduplicated set of admin targets.
3. Apply OWNER precedence to duplicate entries and report what was normalized.
4. Load all target users and all current OWNER users before changing anything.
5. Fail once with the complete missing-email list if any target account has not registered. Do not skip missing users by default and do not partially promote the rest.
6. Fail if the database already has more than one owner.
7. If `OWNER_EMAIL` requests a different owner while another owner exists, fail and require a separate, explicit ownership-transfer procedure. Do not silently demote or replace the current owner.
8. If an existing owner appears only in `ADMIN_EMAILS`, keep the OWNER role and report the collision.
9. Print a plan containing each email, current role, target role, no-op status, and warnings.
10. Stop after the plan when `ADMIN_PROMOTION_DRY_RUN=true`.
11. In apply mode, update only users whose role must change.
12. Use one Prisma transaction for all role changes and their audit records so the batch is atomic.
13. Write one audit entry per changed user with previous role, new role, and a script actor marker. Do not write a promotion event for no-op users.
14. Print a final summary of changed, already-correct, and skipped-by-owner-precedence accounts.

The default missing-user behavior should be strict failure. It avoids a deployment appearing successful when only some administrators were provisioned. The output should tell operators to register every missing account normally, then rerun the dry run.

No additional package script is required. Keeping `npm run admin:promote` avoids operational churn; dry-run behavior can be controlled by `ADMIN_PROMOTION_DRY_RUN`.

## 7. Answers To Review Questions

1. **Does the app currently support OWNER?** Yes, in Prisma, the initial MySQL migration, generated role values, Auth.js session/JWT handling, shared guards, navigation, and the current promotion script.
2. **Should OWNER be added to the enum?** No. It already exists.
3. **Should OWNER have all ADMIN permissions?** Yes for launch. There is no current owner-only operation.
4. **Should ADMIN_EMAIL remain supported?** Yes, as a backward-compatible single-target input.
5. **Should ADMIN_EMAILS support comma-separated emails?** Yes, with trimming, lowercase normalization, empty-entry removal, and deduplication.
6. **Should OWNER_EMAIL be required?** Require it for initial launch provisioning, but allow it to be omitted on later admin-only runs when the database already has exactly one owner.
7. **What if OWNER_EMAIL also appears in ADMIN_EMAILS?** OWNER wins; remove it from the admin target set and report the collision.
8. **What if a listed user does not exist?** Fail the entire preflight with all missing emails and make no changes.
9. **Should dry-run output be supported?** Yes. It should query current roles, validate the one-owner policy, and print the exact plan without writing.
10. **What docs/env examples need updating?** `.env.example`, production and fresh-database launch guides, launch readiness docs, client launch information, pre-launch QA, and the admin dashboard guide. The environment checker should validate/report the new variables while recognizing the legacy pair.

## 8. Prisma Migration Decision

No Prisma migration is needed for the requested launch behavior.

Reasons:

- `OWNER` is already part of `UserRole` in both schema and MySQL migration history.
- Multiple ADMIN rows are already valid.
- The requested one-owner rule can be safely enforced by the controlled promotion workflow for launch.
- A role-level unique constraint would break the multiple-admin requirement.

Residual limitation: direct database edits could still create multiple owners. That is acceptable only if privileged role changes remain restricted to the audited script. A future in-app role-management feature should repeat the same invariant in its server-side transaction.

## 9. Files Likely Needed For Implementation

Required:

- `prisma/promote-admin.ts`: parse batch inputs, preflight, enforce owner policy, add dry-run behavior, and transact role/audit changes.
- `.env.example`: document `OWNER_EMAIL`, `ADMIN_EMAILS`, dry-run mode, and legacy compatibility.
- `scripts/check-production-env.mjs`: recognize the owner/admin list configuration and report missing launch provisioning inputs accurately.

Documentation:

- `docs/production-runbook.md`
- `docs/fresh-db-deployment-rehearsal.md`
- `docs/launch-readiness-checklist.md`
- `docs/launch-readiness-review.md`
- `docs/client-launch-information-needed.md`
- `docs/pre-launch-qa-runbook.md`
- `docs/admin-dashboard-user-guide.md`
- `docs/current-development-status.md` if it remains the active handoff record

Likely unchanged:

- `prisma/schema.prisma`
- `package.json`
- `auth.ts`
- `lib/auth-guards.ts`
- Admin pages and API routes

## 10. Risks And Edge Cases

- Multiple existing owners: fail and require manual remediation before any batch update.
- Ownership transfer: do not infer it from changed environment values; use a future explicit transfer command with clear old/new owner confirmation.
- Missing registered accounts: fail preflight before any writes.
- Duplicate or mixed-case emails: normalize and deduplicate case-insensitively.
- Owner listed as admin: retain OWNER and report the conflict.
- Legacy and new variables request different owners: fail as ambiguous.
- Existing admins omitted from the list: leave unchanged to avoid accidental lockout.
- Active JWT sessions: require promoted users to sign out and back in before role verification.
- Partial audit history: use a transaction so role changes and audit entries succeed or fail together.
- Repeated runs: treat already-correct roles as successful no-ops and avoid duplicate promotion audit entries.
- Secrets/logging: emails may be printed for provisioning, but never print `DATABASE_URL`, passwords, auth secrets, or provider keys.

## 11. QA Checklist

- Register one owner candidate and at least four admin candidates through the normal registration flow.
- Run dry-run mode and confirm one OWNER plus four ADMIN targets are reported with no writes.
- Apply the batch and confirm exactly one OWNER and at least four ADMIN users exist.
- Confirm one audit record exists for each changed role and includes previous/new role metadata.
- Rerun the same batch and confirm it is an idempotent no-op without duplicate promotion audit entries.
- Confirm OWNER can access `/admin`, every admin page, and protected admin API operations.
- Confirm each ADMIN has the same launch admin access.
- Confirm CUSTOMER users cannot access admin pages or APIs.
- Confirm promoted users must sign out and back in before the JWT session reflects the new role.
- Include the owner email in `ADMIN_EMAILS` and confirm OWNER wins with a clear warning.
- Include duplicate/mixed-case admin emails and confirm they normalize to one target.
- Include a nonexistent email and confirm the whole batch fails before any role or audit write.
- Configure two different owner candidates across new/legacy variables and confirm preflight fails.
- Test against a database with an existing different owner and confirm no silent ownership transfer occurs.
- Verify legacy `ADMIN_EMAIL` plus `ADMIN_ROLE=ADMIN` still promotes one user.
- Verify legacy `ADMIN_EMAIL` plus `ADMIN_ROLE=OWNER` works only when it does not conflict with the one-owner policy.

## 12. Recommended Implementation Branch

Use `feature/admin-owner-role-provisioning` for the implementation.

Keep the first pass limited to the promotion script, environment validation/examples, targeted script tests or a small QA harness, and operational docs. Do not add an in-app role-management UI or owner-only permission split until those requirements are explicitly defined.
