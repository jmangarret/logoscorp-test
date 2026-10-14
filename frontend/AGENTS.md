<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Zoho CRM integration

- Keep Zoho OAuth credentials and API calls on the server. Never expose client secrets, refresh tokens, or access tokens in browser code or `NEXT_PUBLIC_*` variables.
- Users are saved as Zoho CRM `Contacts` through `POST` or `PUT /api/zoho/contacts`; map names to `First_Name`/`Last_Name`, and map email, phone, and company to `Email`, `Phone`, and `Company`.
- The edit modal lives in `app/users/EditUserModal.tsx`. It receives a user and save/close callbacks; persist edits server-side before updating the table state. For edits, find the existing contact by its original email and update by Zoho record ID; if it is not present yet, use Zoho upsert with Email as the duplicate check.
- Use `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, and `ZOHO_REFRESH_TOKEN` from the local environment. `ZOHO_ACCOUNTS_URL` and `ZOHO_API_DOMAIN` may be set for the Zoho data center; defaults are the US endpoints. Never commit populated secrets.
- Keep the selected-row UX, clear feedback for partial failures, and validate all data in the Route Handler before calling Zoho.
