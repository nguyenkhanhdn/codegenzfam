# Supabase migration and user management

Target: `supabase-codegenzfam` (`tqnzlwkakeocxufznjfi`). Existing empty legacy tables are retained; the new app uses `codegenz_profiles` and `codegenz_documents`.

## Confirmed state of this change

- Applied schema history: `20261029070422_codegenz_supabase_accounts.sql` and `20261029090909_codegenz_document_guards.sql`. The latter filename matches the confirmed remote migration history.
- Deployed migration transport: `migrate-codegenz` version 1. No migration grant or user-data import has been performed.
- With the owner's explicit approval, `supabase/schema/document-guards.sql` was applied and `account-admin` version 1 was deployed ACTIVE with `verify_jwt=true` on 2026-10-29. Both document/profile guards are enabled. Unauthenticated and invalid-JWT requests return HTTP 401; production-origin CORS preflight returns HTTP 200.
- Source Firestore export returned HTTP 403. No real source data has been copied, no source records were deleted, and no demo accounts are treated as real registrations.
- Current source for the migration function includes paginated verification; deploy this version before running a real import.
- Keep this change on a feature branch until source access, import verification, administrator access, and deployed function tests pass.
- On 2026-10-29, the owner supplied the project URL and public anon key. These were configured in Vercel for production/development (configuration only, no cutover). The browser client and account endpoint share the same resolved configuration and support either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`.
- The earlier automatic approval block for the account-admin deployment and write guards was resolved by explicit owner approval. Remaining blockers are real source data/import reconciliation, Auth URL/email configuration, verified administrator provisioning and authenticated end-to-end checks. Supabase still has no real imported accounts or documents.

## Architecture and guarantees

Supabase Auth stores password hashes. Application profiles never contain passwords. Legacy user IDs remain stable in `legacy_id` and `data.id`; `auth_user_id` links each profile to Supabase Auth. All other collection documents retain their original IDs and JSON fields in a composite-key document table, avoiding accidental field loss during migration.

Database RLS reads current profile roles and account state; user-editable Auth metadata cannot promote an administrator. Sensitive access checks also require a matching row in `auth.sessions`, so revoked sessions lose data access even before their JWT expires. Private professional notes are stored separately from shared consultation records. Admins can manage accounts but cannot read private journals or consultations.

The `account-admin` Edge Function verifies the JWT with Auth, checks the live database session and current role, and then uses server-only service credentials. It supports list, create, edit, activate/disable, password reset and deletion. Self-disable/self-delete/self-demotion are blocked; a database guard protects the final active administrator. Reset passwords are never returned in response messages or audit logs. Created/reset/migrated accounts must change their temporary password before accessing application data.

Deletion disables and soft-deletes the Auth identity and hides its profile from the application while retaining a tombstone and historical references. This is intentional preservation of family/clinical records, not a claim to erase all related history.

## Deployment sequence

1. Keep the existing website live while preparing and validating a source export. Do not replace it with an empty Supabase dataset.
2. Completed: document guards applied after the accounts migration. The local Supabase CLI crashes with SIGTRAP in this workspace; applied migration filenames were copied from actual remote history, not invented.
3. Completed: deploy the reviewed `account-admin` from `supabase/functions`. Before importing, deploy the latest `migrate-codegenz` source (the currently deployed migration transport is still version 1). The account-admin endpoint must keep platform JWT verification enabled in addition to its handler checks; the migration endpoint uses its own short-lived migration grant. `SUPABASE_SERVICE_ROLE_KEY` stays inside Supabase Edge Functions; never add it to Vite or browser variables.
4. Configure Auth site URL and allowed redirect URLs to the production domain and intended previews. Enable email/password login, configure confirmation/recovery email delivery, and set the Auth password minimum to at least 10 characters.
5. Configure the two public `VITE_SUPABASE_*` values from `.env.example` in Vercel. They are safe publishable configuration, not admin credentials.
6. Complete the import and record verification below. Ensure at least one real, authorized active administrator can sign in and complete the required password change. Do not bootstrap an admin by allowing public signup to choose `admin`.
7. Run a preview smoke test using synthetic test accounts: registration, email verification, admin visibility, create/edit, pending approval, disable on a second device, enable, reset/password change, stale-session rejection, last-admin protection, deletion, and non-admin API denial.
8. Merge/release only after those checks. Source deletion or Firestore shutdown is not part of this migration and must not be performed automatically.

## Source export

`node scripts/export-firestore.mjs` exports the application's source collections to a private file outside the repository. If the source requires Google authentication, supply an authorized OAuth token through `FIREBASE_ACCESS_TOKEN` in the process environment. Do not put a token in a command argument or commit it. A native app JSON backup is also accepted by the importer, provided it contains the complete intended source records.

The exporter currently covers the 13 application collections declared by the old client. Before calling the migration complete, inventory any additional collections or subcollections in the source and include them as extra `collections` entries in the export; unknown collections are preserved as admin-only documents. Storage object URLs are preserved as document fields; copying Firebase Storage binary objects requires a separate source storage inventory and authorized export.

Browser-only registrations were never guaranteed to reach Firestore in the old app. They require exports from the browsers/devices holding them; there is no central API that can recover unsynchronized localStorage from other devices.

## Controlled import and verification

1. Set `MIGRATION_EXPORT` to a complete source snapshot and run `node scripts/import-supabase.mjs --dry-run`. This validates IDs and duplicate/missing account emails without writing data.
2. Create a one-time random token locally, retain the plaintext only in the migration process environment, and insert **only its SHA-256 hash** into `codegenz_migration_runs` with a short expiry. No migration grant is active by default.
3. Run `node scripts/import-supabase.mjs` with `MIGRATION_TOKEN`, `MIGRATION_EXPORT` and optional `MIGRATION_REPORT`. Accounts are created through the Auth Admin API, not by hand-writing Auth tables. Existing plaintext source passwords, when present, are passed over TLS only to Auth for hashing; they are excluded from profile documents and logs. Accounts without a usable source password receive a random one and need an authorized reset. Source email-verification state is preserved.
4. The importer compares every source record and field with the target. Private professional notes are verified against their separate target record. Only after successful comparison does it close the migration grant and optionally write a report containing counts and a source hash, not personal records.
5. Do not auto-fix duplicate emails or missing family ownership by silently discarding records. Resolve the mapping, retain the source and rerun the idempotent import.

## Validation performed before commit

`npm test` exercises the actual SQL schema and pending write guards in local PostgreSQL/WASM, plus the Edge handler with an Auth/database test adapter. It covers anonymous/non-admin denial, role escalation, private data isolation, ownership, account bans, forced password changes, session revocation, stale updates and last-admin protection. These are not a claim of a production authenticated end-to-end test. Backend deployment is now complete, with live HTTP denial/CORS checks and database privilege/trigger verification; real account flows still require a verified administrator and source import.

`npm run lint` and `npm run build` verify the frontend and local server. Browser application records are not restored from legacy caches; no default-password or account-switch bypass remains. The old local SQLite server and Firebase runtime are removed from the new path. Backups export only data permitted by RLS; restoring all Auth accounts from the browser is intentionally disallowed.

## Recovering browser-only registrations

The migration login screen can export the original application record caches from the same browser origin. It never treats a cached profile as authenticated, omits passwords and unrelated session storage, and refuses malformed/empty backups. Bring this snapshot into the controlled import workflow; accounts without migrated credentials need an authorized password reset. The small legacy-site recovery patch is tracked separately in PR #3; PR #3 is now merged and deployed, so its recovery export button is available on the production website. A lookup in Supabase does not establish whether an unsynchronized account exists on another device.

## Current authentication diagnostics

Post-deploy security advisors reported no ERROR/WARN findings; INFO notices cover intentionally inaccessible legacy tables and migration grants (RLS enabled, no browser policies).

The login form preserves the actual Auth/Edge failure instead of replacing it whenever an email is found in browser storage. Email confirmation, disabled users, rate limits, unavailable Auth, and a missing account-admin deployment have separate messages. A cached legacy profile is never a Supabase session. No account is silently recreated, promoted to admin, or assigned a known password. The first real administrator must be provisioned through an authorized server-side process after identity/email verification.
