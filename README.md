# Atlas

Private personal workspace rebuilt from the former Aziz OS prototype. It provides real server-backed records and scheduled coordination. The legacy browser-password dashboard is not part of this application.

## Implemented

- Owner-private hosted sign-in, with every API route checking trusted request identity.
- Independent Supabase Postgres project; private schema, default-deny RLS, server-only credential and identity-scoped gateway.
- Tasks with due times, priorities, completion and optimistic concurrency.
- Editable memory with explicit owner/inference provenance; goals, people and journal records.
- Income/expense recording in integer minor units, separate currency totals and monthly budgets.
- Private Supabase Storage vault: signed uploads, verified upload completion, short-lived downloads and file deletion.
- Minute scheduler, due reminders, morning/evening briefings, pause control, idempotent delivery and heartbeat.
- Assistant endpoint with bounded context retrieval, three specialist prompts, run history, timeout recovery and a 20-request rolling daily cap.

## Connection-dependent features

AI runs only when `OPENAI_API_KEY` is configured in the host secret store. No key is included in the repository. Without it the interface explicitly reports AI as disconnected. AI output is advisory and has no external action tools. Scheduled briefings are deterministic; they are not represented as AI-generated.

Phone push, wake-up alarms, bank feeds, email/calendar access, social publishing, autonomous research and device control are **not connected**. Self-modifying code is not enabled. Learning currently means editable persistent memory and feedback captured as notes, not retraining a model.

## Architecture

The owner-private Sites boundary authenticates the visitor. Server API routes take identity only from platform-provided headers, enforce same-origin JSON writes, validate payloads, and call a Supabase RPC using a secret held only on the server. Every gateway operation scopes records to that identity. Supabase raw tables are not exposed to client roles.

`supabase/schema.sql` is the initial schema. Apply `supabase/hardening.sql` afterward for complete export and serialized AI-run admission. The `atlas_private.gateway` function is deliberately privileged and lives in an unexposed schema; it verifies a high-entropy server credential before every operation. Its public wrapper is security-invoker. No browser receives that credential or a service-role key. The vault Edge Function authenticates the same bridge credential before it uses its platform-provided service role.

`pg_cron` runs `atlas_private.tick()` once per minute. State is durable in Postgres and does not depend on an open browser or a local laptop. Availability still depends on the Supabase project and hosting account remaining active. In-app notifications are not push notifications.

## Development and checks

Node 22.13+ is required. Use the committed npm lockfile.

```sh
npm ci
npx tsc --noEmit
node --test tests/*.test.mjs
npm run build
```

Run `tests/database.sql` against a development database. It wraps fixtures in a transaction and rolls them back. `tests/live-vault.py` prompts for the bridge credential without echoing it and exercises signed file upload/download/deletion with an isolated test identity. Never paste credentials into issues or source.

The Supabase Edge Function is under `supabase/vault/`; Deno deployment validates its module graph separately from the frontend TypeScript project.

## Runtime configuration

Configure these values through the hosting secret manager, then redeploy:

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` | URL of the independent personal project |
| `SUPABASE_PUBLISHABLE_KEY` | Public project identifier used by server requests |
| `ATLAS_BRIDGE_KEY` | Secret high-entropy gateway key; only its SHA-256 hash is stored in `atlas_private.config` |
| `OPENAI_API_KEY` | Optional AI-provider secret |
| `OPENAI_MODEL` | Optional model; defaults to `gpt-4.1-mini` |

Keep the Site owner-private. The hosted auth helper is not a standalone authentication system for arbitrary servers: another deployment host must implement real authentication before serving this app. Do not trust identity headers received directly from the internet.

## Operations and recovery

- Observe the heartbeat and execution history under System and Assistant.
- Pause routines under System; this preserves records.
- Export records before substantial changes; stored files are downloaded separately.
- Database snapshots and storage backups must be configured and restore-tested for the chosen paid/free plan before using this as the only copy of irreplaceable documents. This release does not claim an independently verified backup service.
- Rotate the bridge key by updating its database hash and host secret together, then deploy. Existing data remains intact.
- Roll back application code through the previous hosted version. Database changes require a reviewed migration or restore, not an automatic code rollback.
- No personal data is imported from the marketing project or the legacy prototype.

## Open-source research

See `docs/OPEN_SOURCE.md` for reviewed projects, design lessons, and actual dependencies. No copied third-party agent engine is claimed or concealed.

## Release verification

TypeScript, six unit tests, transactional database isolation/concurrency/reminder checks, and live vault upload/download/deletion checks passed. Production dependency audit reported zero known vulnerabilities at build time. Hosted sign-in was verified; authenticated browser workflows and iPhone behavior still require acceptance testing because the QA browser has no owner session and local preview outbound database requests failed. AI integration is not live-tested without a configured provider key.
