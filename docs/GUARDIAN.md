# Finance Guardian v1

Separate module under Finance. The owner saves an opening cash position per currency, start-of-day date, minimum cash floor and savings percentage. Recurring schedules persist; monthly dates clamp to month end; weekly and one-off schedules and optional end dates are supported. Pause a schedule to stop forecasting it.

The forecast includes schedules from the opening-balance date through today +30 days. Past unconfirmed occurrences remain flagged. Confirming an occurrence changes its status only; it stays in the forecast until reconciled through a newer opening-balance date. No transaction is created in Money and no bank balance is inferred. Enter a new **start-of-day** balance to reconcile. Other everyday spending is not automatically included; update the balance when needed.

Conservative spend estimate = max(0, opening cash minus scheduled expenses minus floor minus savings allocation). The savings allocation is the owner percentage multiplied by scheduled income. Expected income does not increase this spend estimate. Projected closing cash does include expected income, and the chart includes a minimum-balance warning. Currencies never mix. Stale balances (>7 days) are flagged. Figures are estimates limited to the supplied data.

Flexible-expense scenario changes calculations only and never saved amounts. There is no universal recommended percentage, investment recommendation, bank integration, autonomous money movement, new web retrieval or AI. Rules run when Guardian renders/refreshed; no separate background Guardian push service is enabled. Rule version and review date are shown. Amounts and dates are editable, while calculation safety rules are code-reviewed/versioned.

Source for the general cash-flow and prioritizing-bills concepts: CFPB Your Money, Your Goals toolkit, reviewed 2026-11-10:
https://www.consumerfinance.gov/consumer-tools/educator-tool/your-money-your-goals/toolkit/

The guardian record kind uses the existing private owner-scoped entries path, version checks and full backup/export. A unique index allows one cash-position record per owner/currency. Security-definer RPC authorization remains unchanged. Tests cover monthly clamping, currency isolation, unconfirmed income, confirmed occurrence accounting, scenarios, and rolled-back owner CRUD/export/isolation.
