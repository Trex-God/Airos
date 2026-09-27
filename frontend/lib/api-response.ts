import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

export interface ApiErrorBody {
  error: string;
  code: string;
  request_id: string;
}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

export function createRequestId(): string {
  return randomUUID();
}

export function jsonResponse<T>(
  body: T,
  status = 200,
): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export function errorResponse(
  status: number,
  error: string,
  code: string,
  requestId = createRequestId(),
): NextResponse<ApiErrorBody> {
  return jsonResponse(
    {
      error,
      code,
      request_id: requestId,
    },
    status,
  );
}
