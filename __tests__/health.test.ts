import { GET } from "@/app/api/health/route";

const ENVIRONMENT_KEYS = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "GEMINI_API_KEY",
  "STRIPE_SECRET_KEY",
  "SUPABASE_URL",
  "N8N_WEBHOOK_URL",
] as const;

describe("GET /api/health", () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it("returns 200 when every required service is configured", async () => {
    for (const key of ENVIRONMENT_KEYS) {
      process.env[key] = "configured";
    }

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.status).toBe("ok");
    expect(Object.values(body.services)).not.toContain(false);
  });

  it("returns 503 without exposing missing secret values", async () => {
    for (const key of ENVIRONMENT_KEYS) {
      delete process.env[key];
    }

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(JSON.stringify(body)).not.toContain("configured");
  });
});
