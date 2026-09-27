import { auth } from "@clerk/nextjs/server";

import {
  createRequestId,
  errorResponse,
  jsonResponse,
} from "@/lib/api-response";
import type { SubscriptionTier } from "@/lib/domain";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const QUOTA_TOTALS: Readonly<Record<SubscriptionTier, number>> = {
  free: 5,
  starter: 100,
  pro: 300,
  agency: 500,
};

export async function GET() {
  const requestId = createRequestId();
  const { userId } = await auth();

  if (!userId) {
    return errorResponse(
      401,
      "Authentication required",
      "AUTH_REQUIRED",
      requestId,
    );
  }

  try {
    const { data, error } = await getSupabaseServiceRoleClient()
      .from("users")
      .select("quota_remaining, subscription_tier")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return errorResponse(
        404,
        "User not found",
        "USER_NOT_FOUND",
        requestId,
      );
    }

    const tier = data.subscription_tier as SubscriptionTier;

    return jsonResponse({
      quota_remaining: data.quota_remaining ?? 0,
      quota_total: QUOTA_TOTALS[tier] ?? QUOTA_TOTALS.free,
      subscription_tier: tier,
    });
  } catch (error: unknown) {
    console.error("Usage retrieval failed.", {
      requestId,
      reason: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });

    return errorResponse(
      500,
      "An unexpected error occurred.",
      "INTERNAL_ERROR",
      requestId,
    );
  }
}
