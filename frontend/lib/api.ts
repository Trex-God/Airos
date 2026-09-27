import type { AgentDefinition } from "@/lib/agents";
import type { Database } from "@/lib/database.types";
import type {
  BillingPlan,
  MemoryCategory,
  SubscriptionTier,
  TaskStatus,
  UserType,
} from "@/lib/domain";

export interface ApiError {
  error: string;
  code: string;
  request_id?: string;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export type Task = Database["public"]["Tables"]["tasks"]["Row"];

export type MemoryItem = Pick<
  Database["public"]["Tables"]["memory_items"]["Row"],
  | "id"
  | "category"
  | "content"
  | "summary"
  | "tags"
  | "importance"
  | "source_task_id"
  | "created_at"
  | "updated_at"
>;

export interface RunTaskResponse {
  task_id: string;
  status: TaskStatus;
  task_type: string;
  agent_used: string;
  output_text: string;
  file_url: string | null;
  quota_remaining: number;
  duration_ms: number;
}

export interface UsageResponse {
  quota_remaining: number;
  quota_total: number;
  subscription_tier: SubscriptionTier;
}

interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

interface MemoryListResponse {
  memory_items: MemoryItem[];
  total: number;
}

interface AgentListResponse {
  agents: AgentDefinition[];
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiError
    | null;

  if (!response.ok) {
    const apiError = payload as ApiError | null;

    throw new ApiClientError(
      apiError?.error ?? "The request could not be completed.",
      apiError?.code ?? "REQUEST_FAILED",
      response.status,
      apiError?.request_id,
    );
  }

  return payload as T;
}

export function runTask(input: {
  input_text: string;
  user_type: UserType;
  output_format?: "markdown" | "docx";
}) {
  return requestJson<RunTaskResponse>("/api/run-task", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function fetchTasks(page = 1, limit = 20) {
  return requestJson<TaskListResponse>(
    `/api/tasks?page=${page}&limit=${limit}`,
  );
}

export function fetchMemory(category?: MemoryCategory) {
  const searchParams = new URLSearchParams({ limit: "50" });

  if (category) {
    searchParams.set("category", category);
  }

  return requestJson<MemoryListResponse>(
    `/api/memory?${searchParams.toString()}`,
  );
}

export function deleteMemory(memoryId: string) {
  return requestJson<{ deleted: true }>(`/api/memory/${memoryId}`, {
    method: "DELETE",
  });
}

export function fetchAgents(userType: UserType) {
  return requestJson<AgentListResponse>(
    `/api/agents?user_type=${userType}`,
  );
}

export function fetchUsage() {
  return requestJson<UsageResponse>("/api/billing/usage");
}

export function createCheckout(
  plan: BillingPlan,
  userType?: UserType,
) {
  return requestJson<{ checkout_url: string }>(
    "/api/billing/checkout",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan,
        user_type: userType,
      }),
    },
  );
}
