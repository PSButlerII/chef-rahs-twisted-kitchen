# Admin Help System

The authenticated admin area includes a searchable **Help & Guide** page at `/admin/help`. It uses the same Admin/Owner authorization as the dashboard.

## Content and maintenance

- Help content, keywords, page anchors, and contextual tips live in `data/admin-help.ts`.
- Add page links with `AdminPageHelpLink` and use `AdminHelpPopover` for concise guidance beside controls.
- Keep destructive and financial warnings visible; never hide essential safety guidance only in a popover.
- Role Manager guidance is Owner Only, and its direct action is shown only to Owners.
- Update the help version and date whenever guidance materially changes.

## Protected documents

The handbook and quick-reference PDFs are served by `/api/admin/help/[document]`. Authentication occurs before an allowlisted slug is resolved. The route never accepts a filesystem path and sends private, no-store responses.

Run `node --import tsx scripts/qa-admin-help.ts` after changing help content or document names.
