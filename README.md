# AI-ROS

AI Research Operating System is a secure SaaS workspace for different ai-powered
agents serving freelancers, founders, and creators.

## Current Status

The production foundation and core application workflow are implemented:

- Next.js 14 App Router frontend with the pinned dependency set
- Clerk authentication and Supabase user provisioning
- Protected dashboard with task execution, agent status, history, and memory
- Prompt-injection scanning, sanitization, leakage checks, and rate limiting
- n8n-routed task execution with atomic quota consumption
- Stripe Checkout, signed idempotent webhooks, and atomic entitlements
- Complete Supabase schema, indexes, RLS policies, triggers, and RPC functions
- Standalone non-root Docker image and Vercel deployment workflow

Real end-to-end agent, OAuth, billing, and database verification requires the
project's external service credentials and deployed n8n workflows.

## Local Verification

From `frontend/`:

```bash
npm ci
npm run verify
npm run build
npm run dev
```

The application runs at `http://localhost:3000`; health status is available at
`http://localhost:3000/api/health`.

On Windows, verify local tooling from the project root:

```powershell
.\scripts\verify-setup.ps1
```

## Security

- Environment files and credentials are ignored.
- Authentication uses Clerk.
- Server secrets are read from `process.env`.
- All user data routes authenticate and scope database access by user ID.
- Supabase RLS is enabled on every application table.
- Stripe verifies the raw webhook body before processing.
- Client responses never include stack traces.
