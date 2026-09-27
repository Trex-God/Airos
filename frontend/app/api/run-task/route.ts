import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createRequestId,
  errorResponse,
  jsonResponse,
  type ApiErrorBody,
} from "@/lib/api-response";
import type { TaskStatus } from "@/lib/domain";
import { requireServerEnv } from "@/lib/env";
import { RunTaskSchema } from "@/lib/schemas";
import {
  detectOutputLeakage,
  detectPromptInjection,
  sanitizeInput,
} from "@/lib/security";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";
import { classifyTaskLocally } from "@/lib/task-routing";

export const dynamic = "force-dynamic";

const N8N_TIMEOUT_MS = 60_000;
const SAFE_OUTPUT_FALLBACK =
  "The AI response was withheld because it failed a security check. Please rephrase your request and try again.";

const n8nResponseSchema = z
  .object({
    output_text: z.string().min(1),
    file_url: z.string().url().nullable().optional(),
    task_id: z.string().uuid(),
    agent_used: z.string().min(1),
  })
  .passthrough();

interface RunTaskResponse {
  task_id: string;
  status: TaskStatus;
  task_type: string;
  agent_used: string;
  output_text: string;
  file_url: string | null;
  quota_remaining: number;
  duration_ms: number;
}

export async function POST(
  req: Request,
): Promise<NextResponse<ApiErrorBody | RunTaskResponse>> {
  const startTime = Date.now();
  const requestId = createRequestId();

  try {
    // 1. Authentication check
    const { userId } = await auth();

    if (!userId) {
      return errorResponse(
        401,
        "Authentication required",
        "AUTH_REQUIRED",
        requestId,
      );
    }

    // 2. Parse request body
    let requestBody: unknown;

    try {
      requestBody = await req.json();
    } catch {
      return errorResponse(
        422,
        "Invalid request. Check your input.",
        "VALIDATION_ERROR",
        requestId,
      );
    }

    // 3. Zod validation
    const validationResult = RunTaskSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return errorResponse(
        422,
        "Invalid request. Check your input.",
        "VALIDATION_ERROR",
        requestId,
      );
    }

    const validatedInput = validationResult.data;

    // 4. Prompt injection detection
    if (detectPromptInjection(validatedInput.input_text)) {
      return errorResponse(
        400,
        "Input rejected for security reasons",
        "INJECTION_BLOCKED",
        requestId,
      );
    }

    // 5. Sanitize input
    const sanitizedInput = sanitizeInput(validatedInput.input_text);

    // 6. Look up user from Supabase
    const supabase = getSupabaseServiceRoleClient();
    const { data: user, error: userLookupError } = await supabase
      .from("users")
      .select("id, quota_remaining")
      .eq("id", userId)
      .maybeSingle();

    if (userLookupError) {
      throw userLookupError;
    }

    if (!user) {
      return errorResponse(
        404,
        "User not found",
        "USER_NOT_FOUND",
        requestId,
      );
    }

    // 7. Check quota
    if ((user.quota_remaining ?? 0) <= 0) {
      return errorResponse(
        402,
        "Monthly task quota exhausted. Please upgrade.",
        "QUOTA_EXHAUSTED",
        requestId,
      );
    }

    // 8. Forward to n8n
    const classifiedTaskType = classifyTaskLocally(sanitizedInput);
    let n8nResponse: Response;

    try {
      n8nResponse = await fetch(requireServerEnv("N8N_WEBHOOK_URL"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": requireServerEnv("N8N_WEBHOOK_SECRET"),
        },
        body: JSON.stringify({
          user_id: userId,
          input_text: sanitizedInput,
          task_type: classifiedTaskType,
          user_type: validatedInput.user_type,
          memory_context: "",
        }),
        signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
      });
    } catch (error: unknown) {
      console.error("n8n task request failed.", {
        requestId,
        reason:
          error instanceof DOMException && error.name === "TimeoutError"
            ? "TIMEOUT"
            : "NETWORK_ERROR",
      });

      return errorResponse(
        503,
        "AI service temporarily unavailable. Try again.",
        "AGENT_FAILED",
        requestId,
      );
    }

    // 9. Handle n8n non-200 response
    if (!n8nResponse.ok) {
      const responseBody = await n8nResponse.text();

      console.error("n8n task request returned a non-200 response.", {
        requestId,
        status: n8nResponse.status,
        body: responseBody,
      });

      return errorResponse(
        503,
        "AI service temporarily unavailable. Try again.",
        "AGENT_FAILED",
        requestId,
      );
    }

    // 10. Parse n8n response
    let n8nPayload: unknown;

    try {
      n8nPayload = await n8nResponse.json();
    } catch {
      console.error("n8n task response was not valid JSON.", {
        requestId,
      });

      return errorResponse(
        503,
        "AI service temporarily unavailable. Try again.",
        "AGENT_FAILED",
        requestId,
      );
    }

    const parsedN8nResponse = n8nResponseSchema.safeParse(n8nPayload);

    if (!parsedN8nResponse.success) {
      console.error("n8n task response failed schema validation.", {
        requestId,
      });

      return errorResponse(
        503,
        "AI service temporarily unavailable. Try again.",
        "AGENT_FAILED",
        requestId,
      );
    }

    const agentResult = parsedN8nResponse.data;

    // 11. Check output for leakage
    const outputLeakageDetected = detectOutputLeakage(
      agentResult.output_text,
    );
    const outputText = outputLeakageDetected
      ? SAFE_OUTPUT_FALLBACK
      : agentResult.output_text;
    const taskStatus: TaskStatus = outputLeakageDetected
      ? "partial"
      : "complete";

    if (outputLeakageDetected) {
      console.error("AI output failed leakage detection.", {
        requestId,
        taskId: agentResult.task_id,
      });
    }

    const durationMs = Date.now() - startTime;
    const fileUrl = agentResult.file_url ?? null;

    // 12-13. Atomically decrement quota and insert the task record
    const { data: quotaRemaining, error: quotaError } = await supabase.rpc(
      "complete_task",
      {
        p_agent_used: agentResult.agent_used,
        p_completed_at: new Date().toISOString(),
        p_duration_ms: durationMs,
        p_file_url: fileUrl,
        p_input_text: sanitizedInput,
        p_output_text: outputText,
        p_status: taskStatus,
        p_task_id: agentResult.task_id,
        p_task_type: classifiedTaskType,
        p_user_id: userId,
        p_user_type: validatedInput.user_type,
      },
    );

    if (quotaError) {
      throw quotaError;
    }

    if (quotaRemaining === null) {
      return errorResponse(
        402,
        "Monthly task quota exhausted. Please upgrade.",
        "QUOTA_EXHAUSTED",
        requestId,
      );
    }

    // 14. Return response
    return jsonResponse(
      {
        task_id: agentResult.task_id,
        status: taskStatus,
        task_type: classifiedTaskType,
        agent_used: agentResult.agent_used,
        output_text: outputText,
        file_url: fileUrl,
        quota_remaining: quotaRemaining,
        duration_ms: durationMs,
      },
    );
  } catch (error: unknown) {
    console.error("Task execution failed unexpectedly.", {
      requestId,
      reason: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      message:
        error instanceof Error ? error.message : "Unknown server error",
    });

    return errorResponse(
      500,
      "An unexpected error occurred.",
      "INTERNAL_ERROR",
      requestId,
    );
  }
}
