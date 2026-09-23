type ServiceError = { code?: unknown; message?: unknown; status?: unknown };

export function describeServiceError(cause: unknown, fallback: string): string {
  if (!cause || typeof cause !== "object") return fallback;
  const error = cause as ServiceError;
  const status = typeof error.status === "number" ? error.status : undefined;
  const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
  const message = typeof error.message === "string" ? error.message : "";
  const normalized = message.toLowerCase();

  if (code === "25006" || /read.only transaction|database.*read.only/.test(normalized)) {
    return "Team changes are unavailable because the database is read-only. The project owner must free database space or upgrade the plan.";
  }
  if (status === 402 || /quota exceeded|exceeded.*quota|billing limit/.test(normalized)) {
    return "The service quota has been reached. Try again after it resets or contact the project owner.";
  }
  if (status === 429 || /rate limit|too many requests/.test(normalized)) {
    return "Too many requests. Wait a moment, then try again.";
  }
  if (code === "project_paused" || /project.*paused|project.*inactive/.test(normalized)) {
    return "The service is paused. The project owner must resume it in Supabase before saved teams and sign-in work again.";
  }
  if ((status !== undefined && status >= 500) || /failed to fetch|networkerror|network request failed/.test(normalized)) {
    return "The service is temporarily unavailable. Check your connection and try again; the calculator can still use loaded data.";
  }
  return message || fallback;
}
