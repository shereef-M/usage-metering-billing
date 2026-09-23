# Build Log — Usage Metering & Billing

Chronological record of the build, including obstacles hit and how they were resolved kept honest rather than cleaned up, since the debugging process is part of the evidence of understanding the system.

## Planning

Scoped the full feature set upfront rather than building minimally and adding later: core metering + tiers/overage, rate limiting, multi-model pricing, pre-flight estimation, async pipeline, idempotency, quota alerts, dashboard, admin view, invoice export. Decided to build in layers get the simplest end-to-end flow working first (auth → Groq call → cost → record), then add protections and features on top rather than building every piece in isolationbefore anything ran.

## Setup

- Scaffolded Express + MongoDB + Redis project structure
- Chose Groq (OpenAI-compatible API) as the metered LLM provider, kept the whole
  project on free tiers (MongoDB Atlas, Upstash Redis, Groq free tier)
- **Obstacle:** initial model names (`llama-3.1-8b-instant`, `llama-3.3-70b-
  versatile`) were deprecated by Groq as of Aug 2026. Searched current Groq
  documentation, found the replacement GPT-OSS models (`openai/gpt-oss-20b`,
  `openai/gpt-oss-120b`) and their current pricing, updated the seed data.

## Core metering pipeline

Built the metered completion endpoint: auth middleware → Groq call → cost calculation from per-model pricing → usage record. Verified end-to-end via Thunder Client before adding any protections.

## Quota enforcement

Added the quota check ahead of the Groq call, so a blocked request doesn't waste a real API call. Tested all three overage policies (hard-block, grace-window, allow-overage) by temporarily lowering tier quotas in the database to trigger boundaries quickly rather than waiting to accumulate real usage.

- **Obstacle:** during allow-overage testing, results didn't match expectations (`willOverage: false` on requests that should have exceeded quota). Root cause turned out to be the worker process having crashed earlier on a network error, so most of the test requests were never actually written to the usage ledger the quota check was reading stale/incomplete data, not a logic bug. Restarting the worker and retesting confirmed the logic was correct all along.

## Rate limiting

Added Redis-backed fixed-window rate limiting per API key, checked before the quota check (cheapest, fastest rejection first). Verified by exceeding the Free tier's 5-requests/minute limit.

## Idempotency

Added client-supplied `Idempotency-Key` handling so retries return the cached result instead of double-billing. Verified by sending an identical request twice and confirming the second call didn't invoke Groq again.

## Async usage-recording pipeline

Moved the `UsageRecord.create()` write out of the request path into a BullMQ queue, consumed by a separate worker process decoupling billing writes from the client-facing response.

- **Obstacle:** the worker crashed on a transient `ETIMEDOUT` Redis error and never recovered, silently dropping all subsequent jobs. This surfaced later during overage testing (see above) before being caught directly. Fixed by adding an `ioredis` reconnect strategy with exponential backoff, plus top-level `worker.on('error')` and `unhandledRejection` handlers so a single transient failure doesn't take down the whole process.
- **Obstacle (environment, not code):** while installing `bullmq`/`ioredis`, the packages ended up installed in the wrong project entirely an unrelated OrgByte repo (`keepdots-address-verification/backend-api`), from having run `npm install` from the wrong terminal working directory. Diagnosed by checking that project's `package.json` for the stray dependencies, then removed them cleanly with `npm uninstall` rather than deleting `node_modules` wholesale (since that's a shared team project).

## Pre-flight cost estimation

Added tiktoken-based input token counting plus a heuristic output estimate (client-supplied `max_tokens` or a default), used to reject requests that would clearly blow remaining quota on a single call.

- **Obstacle:** initial implementation created a new tiktoken encoder on every request, adding several seconds of latency per call. Fixed by creating the encoder once at module load and reusing it across requests.
- **Note:** estimated vs. actual token counts diverge meaningfully (e.g. 7 estimated vs. 78 actual input tokens) due to tokenizer mismatch (cl100k_base approximating Groq's actual Llama/GPT-OSS tokenizer) and chat-format overhead not captured by raw prompt tokenization. Documented as an inherent limitation rather than treated as a bug to eliminate.

## Quota threshold alerts

Added 80%/100% threshold detection in the worker (after usage is recorded), using a compound unique index on the Alert model to prevent duplicate alerts for the same user/period/threshold. Verified via debug logging during testing, removed once confirmed working.

## Dashboard, admin view, invoice export

Built the remaining read-only reporting features on top of the existing UsageRecord data: a per-user dashboard with linear cost projection, an admin-key-gated aggregate summary across all users, and JSON/CSV invoice export. All verified against real accumulated test data across three tiers.

## Recurring practice throughout

Committed and pushed at every meaningful checkpoint rather than batching scaffold, auth, metering, quota, rate limiting, idempotency, async pipeline, worker resilience, pre-flight estimation, alerts, dashboard, admin view, and invoice export each have their own commit.