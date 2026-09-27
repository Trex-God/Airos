import { NextResponse } from "next/server";

export async function GET() {
  const services = {
    nextjs: true,
    clerk_publishable_key_present: Boolean(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    ),
    clerk_secret_key_present: Boolean(process.env.CLERK_SECRET_KEY),
    gemini_key_present: Boolean(process.env.GEMINI_API_KEY),
    stripe_key_present: Boolean(process.env.STRIPE_SECRET_KEY),
    supabase_url_present: Boolean(process.env.SUPABASE_URL),
    n8n_webhook_present: Boolean(process.env.N8N_WEBHOOK_URL),
  };
  const healthy = Object.values(services).every(Boolean);

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      environment:
        process.env.NODE_ENV === "production" ? "production" : "development",
      services,
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
