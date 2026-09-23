# Usage Metering & Billing

A backend usage-metering and billing system for a metered LLM API. Built as the third FlyRank AI Backend Engineering capstone, following the Multi-Platform Social Campaign Publisher and the Image Matching Engine.

Wraps Groq's chat completion API, meters every request by actual token usage, enforces tiered quotas (Free/Pro/Enterprise) with configurable overage policies, and exposes usage/billing data via a dashboard, an admin aggregate view, and exportable invoices.

See `DESIGN.md` for architecture and design decisions, `EVIDENCE.md` for tested behavior with real results, and `BUILDLOG.md` for the chronological build narrative including obstacles and how they were resolved.

## Features

- Metered LLM completion endpoint (Groq, OpenAI-compatible)
- Multi-model cost-aware pricing
- Tiered monthly quotas with configurable overage policy
  (hard-block / grace-window / allow-overage)
- Per-API-key rate limiting (Redis)
- Pre-flight cost estimation before calling the LLM
- Idempotent request handling via `Idempotency-Key`
- Async usage-recording pipeline (BullMQ/Redis), decoupled from the request path
- Quota threshold alerts (80%/100%)
- User-facing usage dashboard with cost projection
- Admin aggregate view (revenue, top users)
- Invoice export (JSON/CSV)

## Stack

Node.js, Express, MongoDB (Mongoose), Redis (Upstash — REST client for rate
limiting, ioredis for BullMQ), Groq API, tiktoken.

## Setup

1. Clone the repo, `cd server`, run `npm install`
2. Create a `.env` file with:

PORT=5000
MONGO_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
GROQ_BASE_URL=https://api.groq.com/openai/v1
UPSTASH_REDIS_REST_URL=your_upstash_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
REDIS_URL=your_upstash_redis_protocol_url
ADMIN_API_KEY=your_own_admin_secret

3. Seed reference data: `node src/utils/seed.js`
4. Start the API: `npm run dev`
5. Start the usage worker (separate terminal): `node src/queues/usageWorker.js`

Both the API server and the worker need to be running for usage recording, alerts, and billing data to work.

## Key endpoints

| Method | Endpoint                                  | Auth          | Purpose                          |
| ------ | ----------------------------------------- | ------------- | -------------------------------- |
| POST   | `/api/users`                              | —             | Create a user, returns API key   |
| POST   | `/api/completions`                        | `x-api-key`   | Metered LLM completion           |
| GET    | `/api/dashboard`                          | `x-api-key`   | Current usage & quota summary    |
| GET    | `/api/dashboard/invoice?format=json\|csv` | `x-api-key`   | Billing statement                |
| GET    | `/api/admin/summary`                      | `x-admin-key` | Cross-user revenue/usage summary |

## Cost

Built entirely on free tiers MongoDB Atlas, Upstash Redis, and Groq's free tier. No paid infrastructure required to run or evaluate this project.

**Live:** https://usage-metering-billing.onrender.com  
(Note: free-tier instance may take 30–50 seconds to wake up on first request after inactivity.)
