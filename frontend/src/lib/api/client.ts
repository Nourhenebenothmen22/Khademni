import { ApiResponse } from "@/types/backend";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

let accessToken: string | null = null;
let csrfToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/csrf`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const json: ApiResponse<{ csrfToken: string }> = await res.json();
  if (json.data?.csrfToken) {
    csrfToken = json.data.csrfToken;
    return csrfToken;
  }
  return "";
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  retry = true,
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = new Headers(options.headers || {});
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (csrfToken && options.method && options.method !== "GET") {
    headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || "include",
  });

  if (response.status === 401 && retry && !endpoint.includes("/auth/refresh") && !endpoint.includes("/auth/login")) {
    // Attempt automatic refresh token rotation
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (refreshRes.ok) {
        const refreshJson: ApiResponse<{ accessToken: string }> = await refreshRes.json();
        if (refreshJson.data?.accessToken) {
          accessToken = refreshJson.data.accessToken;
          return apiRequest<T>(endpoint, options, false);
        }
      }
    } catch {
      accessToken = null;
    }
  }

  const data = await response.json().catch(() => ({
    success: false,
    message: "Failed to parse JSON response from server",
  }));

  if (!response.ok) {
    return {
      success: false,
      message: data.message || data.error || `HTTP error ${response.status}`,
      error: data.error || `HTTP ${response.status}`,
    };
  }

  return data;
}
