import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import {
  createRequestId,
  errorResponse,
  jsonResponse,
} from "@/lib/api-response";
import { MEMORY_CATEGORIES } from "@/lib/domain";
import { PaginationSchema, SaveMemorySchema } from "@/lib/schemas";
import {
  detectPromptInjection,
  sanitizeInput,
} from "@/lib/security";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const memoryQuerySchema = PaginationSchema.pick({ limit: true }).extend({
  category: z.enum(MEMORY_CATEGORIES).optional(),
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
  const validation = memoryQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
  });

  if (!validation.success) {
    return errorResponse(
      422,
      "Invalid request. Check your input.",
      "VALIDATION_ERROR",
      requestId,
    );
  }

  try {
    let query = getSupabaseServiceRoleClient()
      .from("memory_items")
      .select(
        "id,category,content,summary,tags,importance,source_task_id,created_at,updated_at",
        { count: "exact" },
      )
      .eq("user_id", userId);

    if (validation.data.category) {
      query = query.eq("category", validation.data.category);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .limit(validation.data.limit);

    if (error) {
      throw error;
    }

    return jsonResponse({
      memory_items: data ?? [],
      total: count ?? 0,
    });
  } catch (error: unknown) {
    console.error("Memory retrieval failed.", {
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

export async function POST(req: Request) {
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

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return errorResponse(
      422,
      "Invalid request. Check your input.",
      "VALIDATION_ERROR",
      requestId,
    );
  }

  const validation = SaveMemorySchema.safeParse(body);

  if (!validation.success) {
    return errorResponse(
      422,
      "Invalid request. Check your input.",
      "VALIDATION_ERROR",
      requestId,
    );
  }

  if (detectPromptInjection(validation.data.content)) {
    return errorResponse(
      400,
      "Input rejected for security reasons",
      "INJECTION_BLOCKED",
      requestId,
    );
  }

  const content = sanitizeInput(validation.data.content);
  const tags = validation.data.tags?.map(sanitizeInput);

  try {
    const { data, error } = await getSupabaseServiceRoleClient()
      .from("memory_items")
      .insert({
        user_id: userId,
        category: validation.data.category,
        content,
        summary: content.slice(0, 240),
        tags,
      })
      .select(
        "id,category,content,summary,tags,importance,source_task_id,created_at,updated_at",
      )
      .single();

    if (error) {
      throw error;
    }

    return jsonResponse({ memory_item: data }, 201);
  } catch (error: unknown) {
    console.error("Memory storage failed.", {
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
