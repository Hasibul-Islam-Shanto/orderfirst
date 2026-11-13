export interface ApiErrorShape {
  message: string;
  code?: string;
  status?: number;
  fieldErrors?: Record<string, string[]>;
}

export class ApiError extends Error implements ApiErrorShape {
  code?: string;
  status?: number;
  fieldErrors?: Record<string, string[]>;

  constructor(error: ApiErrorShape) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = error.status;
    this.fieldErrors = error.fieldErrors;
  }
}

export const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

type RequestOptions = Omit<RequestInit, "body" | "method" | "signal"> & {
  body?: unknown;
  signal?: AbortSignal;
};

interface ErrorResponse {
  message?: string;
  code?: string;
  errors?: Array<{ field?: string; message?: string }>;
}

async function parseResponse(response: Response) {
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return null;
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-OrderFirst-Request": "1",
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError({
      message:
        "Unable to reach OrderFirst. Check your connection and try again.",
    });
  }
  const payload = await parseResponse(response);
  if (!response.ok) {
    const details = (payload ?? {}) as ErrorResponse;
    if (response.status === 401 && typeof window !== "undefined")
      window.dispatchEvent(new Event("orderfirst:unauthorized"));
    if (details.code === "EMAIL_NOT_VERIFIED" && typeof window !== "undefined")
      window.dispatchEvent(new Event("orderfirst:email-not-verified"));
    const fieldErrors = details.errors?.reduce<Record<string, string[]>>(
      (all, issue) => {
        const key =
          issue.field?.replace(/^(body|query|params)\./, "") || "form";
        (all[key] ??= []).push(issue.message || "Invalid value");
        return all;
      },
      {},
    );
    throw new ApiError({
      message:
        response.status === 403 && details.code !== "EMAIL_NOT_VERIFIED"
          ? "You do not have permission to perform this action."
          : details.message || `Request failed (${response.status})`,
      code: details.code,
      status: response.status,
      fieldErrors,
    });
  }
  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>("GET", path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export function queryString(
  values: Record<string, string | number | boolean | undefined>,
) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}
