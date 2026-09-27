import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import {
  createRequestId,
  errorResponse,
  jsonResponse,
} from "@/lib/api-response";
import { USER_TYPES } from "@/lib/domain";
import { PaginationSchema } from "@/lib/schemas";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const querySchema = PaginationSchema.extend({
  user_type: z.enum(USER_TYPES).optional(),
});

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const validation = querySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    user_type: url.searchParams.get("user_type") ?? undefined,
  });

  if (!validation.success) {
    return errorResponse(
      422,
      "Invalid request. Check your input.",
      "VALIDATION_ERROR",
      requestId,
    );
  }

  const { page, limit, user_type: userType } = validation.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = getSupabaseServiceRoleClient()
      .from("tasks")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (userType) {
      query = query.eq("user_type", userType);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return jsonResponse({
      tasks: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (error: unknown) {
    console.error("Task history retrieval failed.", {
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
