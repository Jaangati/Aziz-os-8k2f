# Consolidated foundation validation

## Passed in the executor / database

- TypeScript compilation and production GitHub Pages build.
- Nine automated unit tests, including exact binary backup roundtrip and corruption detection.
- Six module create/export/edit/delete workflows against Postgres, using rolled-back fixtures.
- Anonymous and cross-subject request denial; owner-only JWT binding.
- Document deletion reservation, stale versions, idempotent retry and metadata restoration.
- Restore insertion, duplicate skip, conflict rejection and anonymous denial.
- Scheduler delivery-window and existing database isolation tests.
- Live HTTP requests without credentials rejected by both Edge endpoints.

## Remaining acceptance gates

- Owner signs in to the GitHub Pages build and exercises file upload, complete backup, delete and restore with disposable content; cloud QA has no owner session.
- Real iPhone upload/download, keyboard, session renewal and recovery flow.
- Supabase Auth Site URL and allowed redirect list must include the GitHub Pages address; the connector cannot update these settings. Leaked-password protection remains a provider setting warning.
- Test unattended backup scheduling / offsite retention separately. The implemented complete archive is user-triggered and unencrypted, with a 100 MB binary limit.
- Keep temporary hosting until acceptance passes, then disable it and retire its bridge credential. No data should be destroyed during cutover.

## Operational boundaries

AI and external integrations are disconnected. Background cron operates only in-app reminders and briefings. Storage retry recovery is visible and owner-triggered, not an autonomous cleanup worker. History is archived but not replayed on restore. Backups do not overwrite existing records. Independent hosting and paid AI spending remain deferred.
