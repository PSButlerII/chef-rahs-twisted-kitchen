# Service Request Production Submission Evidence

- Date/time: August 27, 2026, approximately 8:44 AM EDT
- Tester/operator: Codex with owner authorization and an owner-controlled QA account
- Production URL: `https://rahstwistedkitchen.com`
- Overall result: Pass

## Catering submission

- Result: Pass
- Production request ID: `cmtbilndq001d0u3pc9gf0k88`
- QA marker: `Production QA Catering Test`
- The public form rendered and enforced its required contact/date pairing.
- A safe future event date, time, and guest count were accepted.
- Submission redirected to the catering thank-you page.
- The production database and admin queue show request type `Catering`, status
  `New`, approval `Pending`, and payment `Payment Not Ready`.
- The admin detail displays the saved contact, event, and QA-note fields
  accurately. Sensitive contact/location values are intentionally omitted here.

## Personal-chef submission

- Result: Pass
- Production request ID: `cmtbim02h001e0u3p7swhioa7`
- QA marker: `Production QA personal-chef submission test`
- The public form rendered and enforced its required contact/date pairing.
- A safe future service date, time, and guest count were accepted.
- Submission redirected to the personal-chef thank-you page.
- The production database and admin queue show request type `Personal Chef`,
  status `New`, approval `Pending`, and payment `Payment Not Ready`.
- The admin detail displays the saved contact, event, and QA-note fields
  accurately. Sensitive contact/location values are intentionally omitted here.

## Email evidence

- Catering customer subject configured and attempted: `Catering Request Received`
- Personal-chef customer subject configured and attempted:
  `Personal Chef Request Received`
- Recipient: owner-controlled QA mailbox; address omitted from this document
- Content: both use the branded service-request template with the request type,
  event summary, and account request link.
- Inbox delivery result: Pass. The owner confirmed receipt of both messages on
  August 27, 2026. Exact delivery timestamps were not recorded.
- Separate admin notification email: not implemented by either production
  submission route. Admin visibility is provided by the shared service-request
  queue.

## Admin workflow evidence

- `/admin/catering` showed both records immediately and reported two results.
- Catering and Personal Chef type filters each returned the correct record.
- Submitted dates displayed as August 27, 2026; event dates and type labels
  matched the saved QA data.
- Customer contact information was readable on list and detail views.
- Approval and denial controls rendered for both requests and were not used.
- Deposit and final-payment request buttons were disabled with instructions to
  approve the request first.
- No payment mismatch warning appeared because no payment exists.
- Read-only database verification found zero `PaymentAttempt` rows for both
  requests.
- Request creation is not currently an admin audit-log event; no audit entry was
  expected or added.

## Cleanup decision

Both requests remain in production as clearly marked QA evidence. They were not
approved, denied, cancelled, or deleted. The owner can later mark them as test
or cancel them through the normal admin workflow.

## Issues and remaining blockers

- No functional submission or admin-detail defect was found.
- There is no separate admin notification email for new service requests.
- The final owner decision on the Square production payment gate remains open.
- No service payment link or provider payment was created.
