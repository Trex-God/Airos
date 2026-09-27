jest.mock(
  "@clerk/nextjs/server",
  () => {
    return {
      createRouteMatcher: jest.fn(
        () => (request: { nextUrl: URL }) =>
          request.nextUrl.pathname.startsWith("/dashboard") ||
          request.nextUrl.pathname.startsWith("/api/run-task"),
      ),
      clerkMiddleware: jest.fn(
        (
          handler: (
            auth: (() => Promise<{ userId: string | null }>) & {
              protect: () => Promise<void>;
            },
            request: unknown,
          ) => Promise<Response>,
        ) =>
          async (request: {
            headers: Headers;
            nextUrl: URL;
            url: string;
          }) => {
            const userId = request.headers.get("x-test-clerk-user-id");
            const auth = Object.assign(
              jest.fn().mockResolvedValue({ userId }),
              {
                protect: jest.fn(async () => {
                  if (!userId) {
                    const error = new Error("Unauthenticated");
                    Object.assign(error, { code: "CLERK_UNAUTHENTICATED" });
                    throw error;
                  }
                }),
              },
            );

            try {
              return await handler(auth, request);
            } catch (error: unknown) {
              if (
                (error as { code?: string }).code !==
                "CLERK_UNAUTHENTICATED"
              ) {
                throw error;
              }

              const loginUrl = new URL("/login", request.url);
              loginUrl.searchParams.set(
                "callbackUrl",
                `${request.nextUrl.pathname}${request.nextUrl.search}`,
              );

              return new Response(null, {
                status: 307,
                headers: {
                  location: loginUrl.toString(),
                },
              });
            }
          },
      ),
    };
  },
  { virtual: true },
);

import middleware from "@/middleware";

function createRequest(
  path: string,
  {
    ip,
    unsignedToken,
    userId,
  }: {
    ip: string;
    unsignedToken?: string;
    userId?: string;
  },
): Parameters<typeof middleware>[0] {
  const url = new URL(`https://airos.example${path}`);
  const headers = new Headers({
    "x-forwarded-for": ip,
  });

  if (userId) {
    headers.set("x-test-clerk-user-id", userId);
  }

  if (unsignedToken) {
    headers.set("x-unsigned-session-token", unsignedToken);
  }

  return {
    headers,
    nextUrl: url,
    url: url.toString(),
  } as Parameters<typeof middleware>[0];
}

describe("middleware", () => {
  it("redirects unauthenticated dashboard requests to login", async () => {
    const response = await middleware(
      createRequest("/dashboard/tasks?filter=recent", {
        ip: "198.51.100.1",
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://airos.example/login?redirect_url=%2Fdashboard%2Ftasks%3Ffilter%3Drecent",
    );
  });

  it("allows a dashboard request when Clerk has a user", async () => {
    const response = await middleware(
      createRequest("/dashboard", {
        ip: "198.51.100.2",
        userId: "user_dashboard",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not treat an unsigned session token as Clerk auth", async () => {
    const response = await middleware(
      createRequest("/dashboard/settings", {
        ip: "198.51.100.6",
        unsignedToken: "header-only-token",
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?");
  });

  it("limits run-task to 30 requests per user per minute", async () => {
    const request = () =>
      createRequest("/api/run-task", {
        ip: "198.51.100.3",
        userId: "user_run_task",
      });

    for (let requestNumber = 0; requestNumber < 30; requestNumber += 1) {
      expect((await middleware(request())).status).toBe(200);
    }

    const response = await middleware(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    await expect(response.json()).resolves.toEqual({
      error: "Rate limit exceeded",
      code: "RATE_LIMITED",
    });
  });

  it("limits login page requests by IP", async () => {
    const request = () =>
      createRequest("/login", {
        ip: "198.51.100.4",
        userId: "user_auth_route",
      });

    for (let requestNumber = 0; requestNumber < 5; requestNumber += 1) {
      expect((await middleware(request())).status).toBe(200);
    }

    expect((await middleware(request())).status).toBe(429);
  });

  it("isolates checkout counters by Clerk user ID", async () => {
    for (let requestNumber = 0; requestNumber < 10; requestNumber += 1) {
      expect(
        (
          await middleware(
            createRequest("/api/billing/checkout", {
              ip: "198.51.100.5",
              userId: "user_checkout_a",
            }),
          )
        ).status,
      ).toBe(200);
    }

    expect(
      (
        await middleware(
          createRequest("/api/billing/checkout", {
            ip: "198.51.100.5",
            userId: "user_checkout_a",
          }),
        )
      ).status,
    ).toBe(429);

    expect(
      (
        await middleware(
          createRequest("/api/billing/checkout", {
            ip: "198.51.100.5",
            userId: "user_checkout_b",
          }),
        )
      ).status,
    ).toBe(200);
  });
});
