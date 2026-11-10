# Open-source review

Reviewed primary repositories during implementation:

| Project | Licence reported by upstream | Design lesson used |
| --- | --- | --- |
| [LangGraph](https://github.com/langchain-ai/langgraph) | MIT | Durable state and explicit execution status; keep consequential actions outside unrestricted agent loops. |
| [Mem0](https://github.com/mem0ai/mem0) | Apache-2.0 | Separate persistent memory from transient conversations; retain provenance and allow correction. |
| [Trigger.dev](https://github.com/triggerdotdev/trigger.dev) | Apache-2.0 | Background work should have idempotency, execution records and visible failure handling. |

These are architecture references, not bundled dependencies or claims that Atlas runs their engines. This release uses a smaller Postgres-backed coordinator and request-bounded specialist prompts, avoiding extra hosted services and unnecessary access to personal data. A full durable AI worker remains a later integration when provider access is available.

Actual dependencies include React, Vinext, Zod, Lucide React, the platform Sites starter and the pinned Supabase SDK in the vault function. The npm lockfile records the complete application dependency graph. Upstream copyright and licence information in dependencies is retained. No repositories were bulk copied.
