import { auth } from "@clerk/nextjs/server";

import {
  createRequestId,
  errorResponse,
  jsonResponse,
} from "@/lib/api-response";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface MemoryRouteContext {
  params: {
    memoryId: string;
  };
}

export async function DELETE(
  _req: Request,
  { params }: MemoryRouteContext,
) {
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
      .from("memory_items")
      .delete()
      .eq("id", params.memoryId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return errorResponse(
        404,
        "Memory item not found",
        "MEMORY_NOT_FOUND",
        requestId,
      );
    }

    return jsonResponse({ deleted: true });
  } catch (error: unknown) {
    console.error("Memory deletion failed.", {
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
