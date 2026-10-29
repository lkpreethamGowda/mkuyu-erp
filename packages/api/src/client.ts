// Low-level HTTP client for the MKUYU API.
// Success envelope { data, meta }; errors { error: { code, message } };
// bearer auth with a single-flight refresh on 401; idempotency on writes.

import { getApiConfig } from "./config";
import { tokenStore } from "./tokenStore";
import type { ApiList } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isNotImplemented(): boolean {
    return this.status === 501 || this.code === "not_implemented";
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.code === "unauthorized";
  }

  get isForbidden(): boolean {
    return this.status === 403 || this.code === "forbidden";
  }
}

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  auth?: boolean;
  idempotent?: boolean;
  signal?: AbortSignal;
}

export function uuid4(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function buildUrl(path: string, query?: Record<string, QueryValue>, idempotent?: boolean): string {
  const url = new URL(`${getApiConfig().baseUrl}${path}`);
  const activeCompanyId = getApiConfig().activeCompanyId;
  if (activeCompanyId && !path.startsWith("/auth/")) url.searchParams.set("company_id", String(activeCompanyId));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }
  if (idempotent) url.searchParams.set("idempotency_key", uuid4());
  return url.toString();
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${getApiConfig().baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!response.ok) {
          tokenStore.clear();
          return null;
        }
        const json = (await response.json()) as { data: { access_token: string; refresh_token: string } };
        tokenStore.setAccess(json.data.access_token);
        tokenStore.setRefresh(json.data.refresh_token);
        return json.data.access_token;
      } catch {
        tokenStore.clear();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function parseEnvelope(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { data: text };
  }
}

async function performRequest(url: string, options: RequestOptions): Promise<Response> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = {};
  const token = auth ? tokenStore.getAccess() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  return fetch(url, { method, headers, body: payload, signal: options.signal });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, options.query, options.idempotent);
  let response = await performRequest(url, options);
  if (response.status === 401 && options.auth !== false) {
    const token = await refreshAccessToken();
    if (token) response = await performRequest(url, options);
  }
  const envelope = await parseEnvelope(response);
  if (!response.ok) {
    const error = (envelope as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "server_error",
      error?.message ?? `Request failed with status ${response.status}.`,
      error?.details,
    );
  }
  return envelope as T;
}

export async function apiGet<T>(path: string, query?: Record<string, QueryValue>, signal?: AbortSignal): Promise<T> {
  const response = await apiRequest<{ data: T }>(path, { method: "GET", query, signal });
  return response.data;
}

export async function apiList<T>(path: string, query?: Record<string, QueryValue>, signal?: AbortSignal): Promise<ApiList<T>> {
  return apiRequest<ApiList<T>>(path, { method: "GET", query, signal });
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options: { query?: Record<string, QueryValue>; idempotent?: boolean; auth?: boolean } = {},
): Promise<T> {
  const response = await apiRequest<{ data: T }>(path, {
    method: "POST",
    body,
    query: options.query,
    idempotent: options.idempotent,
    auth: options.auth,
  });
  return response.data;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiRequest<{ data: T }>(path, { method: "PATCH", body });
  return response.data;
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  const url = buildUrl(path);
  let response = await performRequest(url, { method: "GET" });
  if (response.status === 401) {
    const token = await refreshAccessToken();
    if (token) response = await performRequest(url, { method: "GET" });
  }
  if (!response.ok) {
    const envelope = await parseEnvelope(response);
    const error = (envelope as { error?: { code?: string; message?: string } })?.error;
    throw new ApiError(response.status, error?.code ?? "server_error", error?.message ?? "Download failed.");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
