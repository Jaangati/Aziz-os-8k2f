# Independent Atlas migration decision

Status: preparation only. No new hosting, server, AI provider or subscription is authorized now.

## User constraints

- No ChatGPT account dependency in the finished runtime.
- Windows laptop is employer-owned; no admin access, installations or system changes.
- iPhone/browser is the primary access path.
- Hosting and AI spending are deferred until explicit user approval.

## Current state

Source lives in this GitHub repository. The running application is still hosted on chatgpt.site, with its own owner-verified Supabase login. Database, storage and minute scheduler use the separate Atlas Personal Supabase project. AI is disconnected. The existing deployment is temporary; saving this decision does not migrate it or promise existing services are free.

## Target architecture

An independently owned application host runs the frontend and backend. Supabase retains authentication, records, files and scheduled routines. An interchangeable inference adapter connects to a hosted open-weight model later. No inference runs on the work laptop. GitHub stores code; GitHub Pages alone cannot execute this application's server routes.

## Required work before cutover

1. Fix and test authentication confirmation URLs, resend, password recovery, session renewal and server-side sign-out.
2. Fix briefing delivery windows and storage deletion reconciliation; implement complete exports and test restoration of database plus files.
3. Add CI, integration tests and documented release/rollback procedures.
4. Remove runtime assumptions and unused helpers specific to Sites/ChatGPT. Verify a build and deployed runtime on the chosen independent host; a copy of source is not evidence of portability.
5. Select hosting only after quoting costs and obtaining approval. Keep secrets in that host's secret manager, never GitHub source or the phone frontend.
6. Select a specific open-weight model after license review and Arabic/English task evaluation. Measure latency, action extraction and costs. Do not enable paid requests or create AI credentials without approval.
7. Test the new domain on Windows and iPhone: login, renewal, logout, record isolation, uploads/downloads, reminders and export.
8. Cut over links and email URLs only after verification. Retire the temporary deployment after the replacement is working and data recovery is verified.

## Immediate boundary

No server is purchased, no external host provisioned, no paid AI enabled and no work-device installation performed by this decision. Voice, automatic capture, phone push and device control remain unimplemented. The system cannot supply an always-available model brain until a suitable computing service or personal machine is provided.
