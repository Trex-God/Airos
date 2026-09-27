import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

interface RateLimit {
  max: number;
  windowMs: number;
  identity: "user" | "ip";
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMITS: Readonly<Record<string, RateLimit>> = {
  "/api/run-task": {
    max: 30,
    windowMs: 60_000,
    identity: "user",
  },
  "/login": {
    max: 5,
    windowMs: 900_000,
    identity: "ip",
  },
  "/api/billing/checkout": {
    max: 10,
    windowMs: 3_600_000,
    identity: "user",
  },
};

const DEFAULT_RATE_LIMIT: RateLimit = {
  max: 100,
  windowMs: 60_000,
  identity: "ip",
};

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isProtectedApiRoute = createRouteMatcher(["/api/run-task(.*)"]);

const rateLimitStore = new Map<string, RateLimitEntry>();
let requestCount = 0;

function getIpAddress(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",", 1)[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function getRateKey(
  request: NextRequest,
  path: string,
  limit: RateLimit,
  userId: string | null,
): string {
  const identity =
    limit.identity === "user" && userId
      ? userId
      : getIpAddress(request);

  return `${identity}:${path}`;
}

function cleanStore(now: number): void {
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function rateLimitResponse(
  limit: RateLimit,
  resetAt: number,
  now: number,
): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));

  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit.max),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const now = Date.now();
  const path = request.nextUrl.pathname;

  if (isDashboardRoute(request) && !userId) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set(
      "redirect_url",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedApiRoute(request) && !userId) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const limit = RATE_LIMITS[path] ?? DEFAULT_RATE_LIMIT;
  const key = getRateKey(request, path, limit, userId);

  requestCount += 1;

  if (requestCount % 1000 === 0) {
    cleanStore(now);
  }

  const currentEntry = rateLimitStore.get(key);

  if (!currentEntry || currentEntry.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + limit.windowMs,
    });
  } else if (currentEntry.count >= limit.max) {
    return rateLimitResponse(limit, currentEntry.resetAt, now);
  } else {
    currentEntry.count += 1;
  }

  return NextResponse.next();
}, {
  signInUrl: "/login",
  signUpUrl: "/login",
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
