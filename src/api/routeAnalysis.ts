import type { RouteAnalysis, RouteAnalysisRequest } from "../types/analysis";

type ApiErrorBody = { error?: { message?: string; details?: unknown } };
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class RouteAnalysisApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "RouteAnalysisApiError";
    this.status = status;
    this.details = details;
  }
}

export async function createRouteAnalysis(
  request: RouteAnalysisRequest,
  signal: AbortSignal,
): Promise<RouteAnalysis> {
  const response = await fetch(`${apiBaseUrl}/api/v1/route-analyses/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody | RouteAnalysis;
  if (!response.ok) {
    const error = body as ApiErrorBody;
    throw new RouteAnalysisApiError(
      formatErrorMessage(error),
      response.status,
      error.error?.details,
    );
  }
  return body as RouteAnalysis;
}

function formatErrorMessage(body: ApiErrorBody): string {
  const details = body.error?.details;
  if (details && typeof details === "object") {
    const messages = Object.entries(details as Record<string, unknown>).flatMap(([field, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values
        .filter((item): item is string => typeof item === "string")
        .map((message) => `${field.replaceAll("_", " ")}: ${message}`);
    });
    if (messages.length > 0) {
      return messages.join(" ");
    }
  }
  return body.error?.message ?? "The route analysis could not be completed.";
}
