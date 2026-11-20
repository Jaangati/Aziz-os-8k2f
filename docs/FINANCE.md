# Finance and Gmail receipts

Spending is a ledger of recorded movements, not a live bank balance. Each currency is separate. Refunds reduce spending; transfers do not count as income or expenses. Guardian remains a forecast of saved schedules and an explicitly dated cash position.

## Receipt flow

CBQ purchase alerts are parsed deterministically. Unknown, declined and reversal formats require review. Purchase amounts are extracted separately from remaining balances. Exact Gmail message IDs are deduplicated per owner. Review approval creates the linked transaction and updates its receipt atomically. Repeated approval returns the same transaction. Matching merchant/date/amount/currency is a warning, not proof of a duplicate.

## Connect Gmail

Open Spending → Gmail connection. Choose whether recognized purchases may be recorded automatically, then generate the private connector script. Create a Google Apps Script project in your own account, paste the script into Code.gs and replace appsscript.json with the supplied manifest, then run setupAtlas once. Google requires permission before the hourly trigger can run. The code only reads matching CBQ alerts and sends them to the Atlas receipt endpoint; it does not send, delete or label emails. The manifest grants read-only mailbox access. The code filters CBQ senders; it cannot send or delete mail.

The initial window is 30 days; batches resume at 50 messages per invocation. A 24-hour overlap catches late arrivals, with source-ID deduplication. Triggers run in Google, not on the work laptop. Execution and account quotas still apply. Atlas shows last received receipt, not a guarantee that a trigger ran with no matching messages.

The generated script contains a write-only connector token. Keep it private; do not commit it. Supabase stores only its SHA-256 hash. Rotate by generating a replacement and updating the script. Revoke in Atlas to stop imports; saved records remain. No AI model or paid API is needed for this parser.

## Deployment

Apply supabase/finance.sql once after the existing Atlas migrations. Deploy atlas-pages-api from supabase/pages-api and atlas-receipt-ingest from supabase/receipt-ingest. The ingest function has verify_jwt=false because it requires X-Atlas-Connector; only service_role can call its database RPC. Owner finance RPCs independently verify the authenticated, verified owner. Never place service-role credentials or private connector tokens in GitHub Pages.

## Verification

npm run typecheck; npm test; npm run build; npm run build:pages. tests/finance.sql is a rolled-back integration check for duplicate delivery, atomic approval, auto-import, uncertain matches, export, revocation and non-owner rejection. Browser preview fixtures are synthetic and must never ship.
