# Post-Launch Backlog And Production Notes

This document preserves confirmed production findings and deferred work. It does not authorize non-blocking feature development before launch.

## A. Confirmed Production Notes

- Hostinger's `DATABASE_URL` must use `127.0.0.1` instead of `localhost` for Prisma/MySQL.
- Use this production URL format:

  ```text
  mysql://DB_USER:URL_ENCODED_PASSWORD@127.0.0.1:3306/DB_NAME
  ```

- Keep the foundation seed endpoint and owner bootstrap endpoint disabled unless they are temporarily needed for their documented setup workflows.
- Hostinger upload storage feasibility was confirmed: filesystem write, filesystem read, and public serving all worked.
- The confirmed writable/public directory is `/home/u275661575/domains/rahstwistedkitchen.com/public_html/image_uploads`.
- The confirmed public URL base is `https://rahstwistedkitchen.com/image_uploads`.
- The temporary upload storage probe endpoint and its token/configuration were removed after the test.

## B. Durable Uploads — Implemented, Production Configuration Pending

- Direct filesystem uploads are viable on the current Hostinger deployment.
- The admin-only filesystem upload implementation is complete. Configure production with:

  ```dotenv
  UPLOAD_STORAGE_DRIVER=filesystem
  UPLOAD_FILESYSTEM_DIR=/home/u275661575/domains/rahstwistedkitchen.com/public_html/image_uploads
  NEXT_PUBLIC_UPLOAD_BASE_URL=https://rahstwistedkitchen.com/image_uploads
  ```

- Uploads validate the 5 MB limit, MIME type, and JPEG/PNG/WebP magic bytes; SVG and unknown binaries are rejected.
- Safe UUID filenames are generated and original filenames are never used as storage paths.
- Menu item, weekly offering, option-choice edit, and gallery forms support uploads while retaining manual public URL entry.
- The idempotent built-in gallery import makes `/gallery/webp` entries fully manageable database records. Production dry-run/apply and upload cleanup rehearsal remain deployment handoff steps.
- Meal Plans is the current gallery terminology. Run the documented category rename dry-run/apply during production handoff for records imported before the terminology update.
- Production upload QA is still required after the environment values are deployed; implementation validation used a temporary directory only.
- Keep allowed image types limited to JPEG, PNG, and WebP unless requirements change.
- Store public image paths or URLs in the database.
- FTP/SFTP is not currently needed for app-controlled uploads.
- If SFTP is ever needed, use a dedicated limited account instead of the main hosting account.

## C. Payment Processing Roadmap

- The client wants both Square and PayPal eventually.
- Implement Square first, then PayPal, unless the client changes priority.
- Regular menu and weekly orders that do not require approval should be paid at checkout.
- Orders requiring approval should not collect payment at checkout.
- Approval-required orders should request payment only after admin approval.
- Catering and personal chef requests always require approval before payment.
- Approved catering and personal chef requests require a 50% deposit.
- The remaining balance is handled through an admin-created payment link sent by email.
- Menu items and options can require approval based on owner/admin configuration.
- The Square and PayPal accounts are already created and vetted.

## D. Deferred Security/Auth Improvements

- Add a forgot-password/reset-by-email flow.
- Use reset tokens with expiration and single-use behavior.
- Consider an `authVersion` or equivalent session-invalidation mechanism to end all sessions after a password change.
- The current launch version supports logged-in password changes only.

## E. Deferred Feature Enhancements

- Production rehearsal of durable admin image uploads and backup/restore verification.
- Payment provider integration.
- Payment webhooks and reconciliation.
- Final-balance payment support inside the website.
- Optional marketing email and template improvements.
- More detailed reporting and export tools.

## F. Launch Freeze Rule

- Do not add non-blocking features before launch.
- Before release, only fix production blockers or client-requested launch corrections.
