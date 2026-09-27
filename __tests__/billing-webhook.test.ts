import { POST } from "@/app/api/billing/webhook/route";

describe("POST /api/billing/webhook", () => {
  it("reads the raw body and rejects a missing signature", async () => {
    const text = jest.fn().mockResolvedValue('{"type":"test"}');
    const request = {
      headers: new Headers(),
      text,
    } as unknown as Request;

    const response = await POST(request);

    expect(text).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing Stripe signature.",
      code: "MISSING_SIGNATURE",
    });
  });

  it("rejects an invalid Stripe signature", async () => {
    const originalEnvironment = { ...process.env };
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    process.env.STRIPE_SECRET_KEY = "sk_test_validation";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_validation";

    try {
      const request = new Request(
        "http://localhost/api/billing/webhook",
        {
          method: "POST",
          headers: {
            "stripe-signature": "invalid",
          },
          body: '{"type":"test"}',
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Invalid Stripe signature.",
        code: "INVALID_SIGNATURE",
      });
    } finally {
      consoleError.mockRestore();
      process.env = originalEnvironment;
    }
  });
});
