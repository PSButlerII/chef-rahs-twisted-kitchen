# Square Production Configuration Dry-Run

Date: August 3, 2026

Status: completed without provider calls. Production payments remain disabled.

## Scope and safety boundary

This procedure validates only local application configuration and fail-closed
behavior. It must not tokenize a card, call a Square payment/refund/payment-link
API, create a hosted link, or send a real Square webhook. Use synthetic values
locally; keep production credentials in the deployment secret store.

## Required production environment

| Variable                             | Expected production shape                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `SQUARE_ENVIRONMENT`                 | Production environment selection.                                                 |
| `SQUARE_PRODUCTION_PAYMENTS_ENABLED` | Keep disabled throughout this dry-run. Enable only after explicit owner approval. |
| `SQUARE_CSP_MODE`                    | `production`, after the CSP allowlist is reviewed and approved.                   |
| `SQUARE_APPLICATION_ID`              | Production application identifier; never commit the real value.                   |
| `SQUARE_LOCATION_ID`                 | Production location identifier; never commit the real value.                      |
| `SQUARE_ACCESS_TOKEN`                | Production server secret; never expose or commit.                                 |
| `SQUARE_WEBHOOK_SIGNATURE_KEY`       | Production server secret; never expose or commit.                                 |
| `SQUARE_WEBHOOK_NOTIFICATION_URL`    | `https://rahstwistedkitchen.com/api/webhooks/square` exactly.                     |
| `NEXT_PUBLIC_APP_URL`                | Valid HTTPS canonical application URL.                                            |

The production readiness result must remain blocked while the production gate
is disabled, even when every other value has a valid production shape. Sandbox
readiness remains independent of the production gate.

## Dry-run procedure

1. Use local synthetic placeholders for every identifier and secret. Do not use
   production credentials.
2. Select the production environment and production CSP mode, but keep the
   production payment gate disabled.
3. Inspect `/admin/payments` while authenticated. Confirm it shows environment
   `production`, CSP mode `production`, gate `Disabled`, payment actions
   `Blocked`, no missing variables, and only the gate blocking reason. Confirm
   no secret values appear.
4. Open `/api/payments/square/config`. Confirm `enabled` is false, application
   and location IDs are null, and `disabledReason` is the generic customer
   message.
5. Open `/checkout`. Confirm live Square fields do not initialize and the page
   reports online payment is temporarily unavailable. Do not submit card data.
6. Confirm standard order payment creation returns the generic unavailable
   response. Confirm authenticated deposit, final-balance, and refund routes
   return sanitized readiness diagnostics. Their readiness guards execute before
   ledger writes or Square client calls.
7. Send an unsigned, empty POST to `/api/webhooks/square`. Expect a signature or
   configuration failure, not a payment-gate failure. This proves route
   reachability without weakening verification or sending an event.
8. Remove one required synthetic variable. Confirm readiness remains blocked and
   reports only that variable name, never its value.
9. Return local settings to Sandbox defaults after testing.

## Pass/fail checklist

- [x] Sandbox configuration reports ready with its existing core credentials.
- [x] Production-shaped configuration with the gate disabled is blocked only by
      the gate.
- [x] CSP mode is included in the structured readiness result and admin panel.
- [x] Removing one required variable reports its name without a value.
- [x] Public config returns generic unavailable copy and no Square identifiers
      while blocked.
- [x] Standard checkout, deposit link, final-balance link, and refund creation
      are guarded before provider calls.
- [x] The webhook route remains independent of the payment-creation gate and
      continues to enforce its signature.
- [x] No production credentials were used or committed.
- [x] No live Square call, card charge, refund, or hosted link was created.

## Result and next step

The application-side configuration dry-run passed. This is not authorization to
enable production payments. The next payment step is a controlled, low-value
production rehearsal only after explicit owner approval, production credentials
and account ownership are verified, the CSP and wallet setup are approved, the
production webhook subscription is confirmed, and rollback monitoring is ready.
