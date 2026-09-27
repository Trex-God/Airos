# AI-ROS Frontend

Next.js 14 App Router frontend and server API layer for AI-ROS.

## Commands

```bash
npm run dev
npm run type-check
npm run lint
npm test
npm run verify
npm run build
npm run security:audit
```

Production builds use standalone output for the multi-stage, non-root Docker
image.

## Required Runtime Environment

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_API_URL`
- `STRIPE_PRICE_PAY_TASK`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_AGENCY`
- `STRIPE_PRICE_STARTER_ANNUAL`
- `STRIPE_PRICE_PRO_ANNUAL`
