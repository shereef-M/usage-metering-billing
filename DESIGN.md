# Design — Usage Metering & Billing

## Overview

A backend usage-metering and billing system for a metered LLM API. It wraps Groq's chat completion API, meters every request by token usage, enforces tiered quotas with configurable overage behavior, and exposes usage/billing data via a dashboard,
an admin view, and exportable invoices.

Built as the third FlyRank AI Backend Engineering capstone, following the Multi- Platform Social Campaign Publisher and the Image Matching Engine.

## Architecture

Client
│ 
Express API (server.js)
│
├─ Auth middleware (API key lookup)
├─ Idempotency check (Redis marker → Mongo fallback)
├─ Rate limit check (Redis, fixed window per API key)
├─ Quota check (Mongo aggregation against Tier rules)
├─ Pre-flight cost estimate (tiktoken input count + heuristic output estimate)
├─ Groq API call (LLM completion)
├─ Cost calculation (Model pricing × actual token usage)
├─ Response returned to client
│
└─ Usage event enqueued (BullMQ / Redis)
│
Usage Worker (separate process)
├─ Writes UsageRecord to MongoDB
└─ Checks quota thresholds → creates Alert records


## Core data models

- **User** — name, email, API key, tier
- **Tier** — name, monthly token quota, rate limit/min, overage policy
  (`hard-block` / `grace-window` / `allow-overage`), overage price, grace window size
- **Model** — LLM model name, provider, input/output price per token
- **UsageRecord** — the ledger: one row per request, tokens, cost, billing period,
  request ID (unique, enforces idempotency at the DB level)
- **Alert** — quota threshold crossings (80%/100%), deduplicated via a compound
  unique index on (user, billingPeriod, threshold)

## Key design decisions

**Async usage recording.** The database write for each usage record is deferred to a background worker via a BullMQ queue, so the client's response isn't blocked on the DB. The worker runs as a separate Node process. A Redis connection retry strategy and top-level error handlers were added after an early test showed the worker crashing and not recovering from a transient network timeout a real production worker needs to survive connection blips, not just handle the happy path.

**Two-layer idempotency.** A client-supplied `Idempotency-Key` header is checked against a fast Redis marker first (set synchronously before the job is even enqueued), then against MongoDB as a fallback this closes the race window where a very fast retry could arrive before the async worker has finished writing the first request's record.

**Pre-flight cost estimation is a bounded approximation, not a prediction.** Input tokens are counted precisely via tiktoken (`cl100k_base`, an approximation of Groq's actual Llama/GPT-OSS tokenizer, since no exact public encoding exists for those models). Output tokens can't be known before the model generates a response, so they're estimated via a default assumption or a client-supplied `max_tokens` cap. This is a real constraint of LLM billing, not a bug documented here rather than hidden.

**Tiered overage policy, not a single global rule.** Each tier defines its own policy Free hard-blocks at quota, Pro allows a grace window before blocking, Enterprise allows unlimited overage configured per tier in the database, not hardcoded in application logic.

**Cost is locked in at request time.** `UsageRecord.cost` stores the computed dollar cost at the moment of the request, not just raw token counts. If model pricing changes later, past invoices remain accurate this mirrors how real billing systems avoid retroactively changing historical charges.

**Admin access is a flat shared-secret check**, not a full RBAC system an `x-admin-key` header checked against an env var. Appropriate scope for a capstone demonstrating the aggregation/reporting pattern without building a permissions system that isn't the point of the exercise.

## Stack

Node.js / Express, MongoDB (Atlas, free tier), Redis (Upstash, free tier) for both
REST-based rate limiting and BullMQ's queue mechanics, Groq API (OpenAI-compatible)
for the metered LLM calls, tiktoken for input token estimation.

## Known limitations

- Pre-flight output token estimation is a heuristic, not exact (see above)
- Rate limiting uses a fixed window, not a sliding window — simpler, with the
  standard boundary imprecision trade-off
- Admin auth is a shared secret, not per-admin accounts/roles
- Cost projection on the dashboard is linear extrapolation from days elapsed, not
  a more sophisticated forecast model