import { auth } from "@clerk/nextjs/server";

import {
  createRequestId,
  errorResponse,
  jsonResponse,
} from "@/lib/api-response";
import { AGENTS } from "@/lib/agents";
import { USER_TYPES, type UserType } from "@/lib/domain";

export const dynamic = "force-dynamic";

function isUserType(value: string | null): value is UserType {
  return (
    value !== null &&
    (USER_TYPES as readonly string[]).includes(value)
  );
}

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

  const userType = new URL(req.url).searchParams.get("user_type");

  if (userType !== null && !isUserType(userType)) {
    return errorResponse(
      422,
      "Invalid request. Check your input.",
      "VALIDATION_ERROR",
      requestId,
    );
  }

  return jsonResponse({
    agents: userType
      ? AGENTS.filter((agent) => agent.userType === userType)
      : AGENTS,
  });
}
