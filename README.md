# AIROS (AI-ROS)

**AI Research Operating System** — a secure, multi-tenant SaaS workspace that gives freelancers, founders, and creators a team of specialized AI agents for the work that actually runs their business.

## What it does

AIROS routes a task in plain English to one of 15 purpose-built agents, executes it through an orchestrated n8n workflow, and returns a structured, ready-to-use result — with authentication, billing, quotas, and memory handled end to end.

| User type | Agents |
|---|---|
| **Freelancer** | Client Acquisition, Proposal & Sales, Delivery, Communication, Admin & Finance |
| **Founder** | Strategy, Research, Build, Growth, Operations |
| **Creator** | Content Strategy, Script, Repurpose, Monetise, Community |

Tasks are auto-classified from the input text (with an explicit override available) and routed to the matching agent's n8n workflow for execution.

## Current status

The production foundation and core application workflow are implemented:

- Next.js 14 App Router frontend with a pinned dependency set
- Clerk authentication and Supabase user provisioning
- Protected dashboard: task execution, agent status, history, and memory
- Prompt-injection scanning, input sanitization, leakage checks, and rate limiting
- n8n-routed task execution with atomic quota consumption
- Stripe Checkout, signed idempotent webhooks, and atomic entitlements
- Complete Supabase schema, indexes, RLS policies, triggers, and RPC functions
- Standalone non-root Docker image and a Vercel deployment workflow

Real end-to-end agent, OAuth, billing, and database verification requires the project's external service credentials and deployed n8n workflows.

## Architecture

```
frontend/           Next.js 14 App Router app (UI + server API routes)
  app/api/            agents · billing · clerk · health · memory · run-task · tasks
  lib/                 agent registry, task routing/classification, Gemini client,
                       Supabase/Stripe clients, security (sanitization, env guards)
n8n-workflows/       Orchestration graphs — one per agent function (f1–f5),
                     plus memory-save, memory-retrieve, execution-logger,
                     and output-normaliser
infrastructure/      Supabase schema/migrations, Clerk user-id migration,
                     docker-compose for local services
scripts/             Setup and verification scripts (bash + PowerShell)
```

**Request flow:** Clerk-authenticated request → sanitization & prompt-injection checks → task classified/routed to an agent → n8n workflow executes the task (calling Gemini as needed) → result normalized and returned → task history and memory persisted in Supabase (RLS-scoped per user).

**Stack:** Next.js 14 · React 18 · TypeScript · Tailwind CSS · Clerk · Supabase (Postgres) · n8n · Google Gemini · Stripe · Zod · Jest

## Getting started

From `frontend/`:

```bash
npm ci
npm run verify   # type-check + lint + tests
npm run build
npm run dev
```

The app runs at `http://localhost:3000`; health status is available at `http://localhost:3000/api/health`.

On Windows, verify local tooling from the project root:

```powershell
.\scripts\verify-setup.ps1
```

### Required environment variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
N8N_WEBHOOK_URL
N8N_WEBHOOK_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_API_URL
STRIPE_PRICE_PAY_TASK
STRIPE_PRICE_STARTER
STRIPE_PRICE_PRO
STRIPE_PRICE_AGENCY
STRIPE_PRICE_STARTER_ANNUAL
STRIPE_PRICE_PRO_ANNUAL
```

Database setup: apply `infrastructure/supabase-migration.sql` and `infrastructure/clerk-user-id-migration.sql` to your Supabase project. `infrastructure/docker-compose.yml` is available for local services.

## Deployment

- **Docker:** `frontend/Dockerfile` builds a multi-stage, non-root, standalone-output image.
- **CI/CD:** `.github/workflows/deploy-frontend.yml` handles deployment.
- **Vercel:** supported directly via the standalone Next.js build.

## Security

- Environment files and credentials are gitignored.
- Authentication uses Clerk; server secrets are read only from `process.env`.
- All user data routes authenticate and scope database access by user ID.
- Supabase Row-Level Security (RLS) is enabled on every application table.
- Inputs are scanned for prompt injection and sanitized (DOMPurify) before agent execution.
- Stripe verifies the raw webhook body before processing.
- Client responses never include stack traces.

