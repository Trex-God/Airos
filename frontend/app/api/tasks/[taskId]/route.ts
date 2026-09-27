import { auth } from "@clerk/nextjs/server";

import {
  createRequestId,
  errorResponse,
  jsonResponse,
} from "@/lib/api-response";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface TaskRouteContext {
  params: {
    taskId: string;
  };
}

export async function GET(
  _req: Request,
  { params }: TaskRouteContext,
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
      .from("tasks")
      .select("*")
      .eq("id", params.taskId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return errorResponse(
        404,
        "Task not found",
        "TASK_NOT_FOUND",
        requestId,
      );
    }

    return jsonResponse({ task: data });
  } catch (error: unknown) {
    console.error("Task retrieval failed.", {
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
