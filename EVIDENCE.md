# Evidence — Usage Metering & Billing

This documents what was built and verified, with the actual test results observed during development.

## 1. Core metering pipeline

**Test:** POST `/api/completions` with a valid API key, model, and prompt.
**Result:** 200 OK. Groq call succeeded, actual input/output tokens captured, cost calculated from per-model pricing, usage recorded.

```json
{
  "response": "Hello!",
  "usage": {
    "inputTokens": 78,
    "outputTokens": 60,
    "cost": 0.00002385,
    "willOverage": false
  }
}
```

## 2. Quota enforcement — hard-block (Free tier)

**Test:** Lowered Free tier quota to 20 tokens, sent a request.
**Result:** 429, request correctly blocked once quota exceeded.

```json
{ "error": "Quota exceeded", "usedTokens": 1189, "quota": 20 }
```

## 3. Quota enforcement — grace-window (Pro tier)

**Test:** Lowered Pro tier quota to 20 tokens with a 200-token grace window, sent two requests.
**Result:** First request allowed normally; second request (now over quota, within grace) allowed with `willOverage: true`.

## 4. Quota enforcement — allow-overage (Enterprise tier)

**Test:** Lowered Enterprise tier quota to 20 tokens (no grace window unlimited overage), sent two requests.
**Result:** Both requests allowed; second returned `willOverage: true` with no upper block, confirming the policy has no cap.

## 5. Rate limiting

**Test:** Free tier seeded at 5 requests/minute. Sent 6 requests in quick succession.
**Result:** 6th request returned 429 rate-limit exceeded; first 5 succeeded.

## 6. Idempotency

**Test:** Sent the same request twice with an identical `Idempotency-Key` header.
**Result:** First request processed normally and billed. Second request returned the exact same cached response and cost, with `"idempotent": true`, confirmed Groq was not called a second time.

## 7. Async usage-recording pipeline

**Test:** Ran the main API server and a separate worker process simultaneously, Sent a completion request and watched the worker terminal.
**Result:** Client received its response immediately; the worker logged `Usage recorded: <requestId>` shortly after, confirming the DB write was successfully decoupled from the request path.

**Worker resilience test:** Worker crashed on a transient `ETIMEDOUT` network error mid-session and did not recover, silently dropping subsequent jobs. Added a Redis reconnect strategy (exponential backoff) and top-level error handlers. Re-tested: worker survived a full session without crashing afterward.

## 8. Pre-flight cost estimation

**Test:** Sent a completion request and inspected the `preflightEstimate` field alongside the actual usage.
**Result:** Estimate returned successfully (7 estimated input tokens vs. 78 actual documented as an expected approximation gap due to tokenizer mismatch and chat-format overhead not captured by a raw prompt-only token count; see DESIGN.md's Known Limitations).

## 9. Quota threshold alerts

**Test:** Lowered Pro tier quota to 100 tokens, sent a request that pushed cumulative usage to 397 tokens (397% of quota).
**Result:** Both 80% and 100% threshold alerts created:

Alert created: user 6ab2634d5b00443d0a595d8c crossed 80% (397/100)
Alert created: user 6ab2634d5b00443d0a595d8c crossed 100% (397/100)

Confirmed the compound unique index prevents duplicate alerts for the same user/period/threshold on repeated crossings.

## 10. Usage dashboard

**Test:** GET `/api/dashboard` with a user's API key.
**Result:**

```json
{
  "billingPeriod": "2026-09", "tier": "free", "quota": 50000,
  "usedTokens": 2758, "remainingTokens": 47242, "percentUsed": 5.5,
  "totalCost": 0.0004764, "projectedCost": 0.00064963..., "requestCount": 20
}
```

## 11. Admin aggregate view

**Test:** GET `/api/admin/summary` with the admin key, after generating usage across three tiers (Free, Pro, Enterprise).
**Result:** Correct total revenue, total requests/tokens, and top users ranked by cost across all three test accounts.

## 12. Invoice export

**Test:** GET `/api/dashboard/invoice` in both JSON and CSV formats.
**Result:** JSON returned full line-item history with accurate totals. CSV returned properly formatted rows with a summary footer (Total Requests, Total Tokens, Total Cost) — verified byte-for-byte consistent with the JSON totals.

## Cost

Built entirely on free tiers: MongoDB Atlas (free cluster), Upstash Redis (free tier), Groq API (free tier). No paid infrastructure used during development.
