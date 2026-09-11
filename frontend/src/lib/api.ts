// frontend/src/lib/api.ts
//
// Axios instance per the project context doc: access token held in memory
// (never localStorage — mitigates XSS token theft), refresh token lives in
// the HttpOnly/Secure/SameSite=strict cookie set by the backend and is
// never touched directly here. On a 401, a single in-flight refresh call is
// shared across every request that hit the 401 at the same time, so a burst
// of concurrent requests after token expiry triggers exactly one refresh,
// not one per request.
//
// AuthContext.tsx is expected to call setAccessToken()/clearAccessToken()
// on login/logout and on the silent-refresh-on-mount session restore.

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// ---- In-memory access token ------------------------------------------------
// Deliberately module-level state, not React state: the axios interceptor
// needs synchronous read access on every request, outside of any component.

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

// ---- Axios instance ---------------------------------------------------------

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends the HttpOnly refresh cookie on /api/auth/refresh
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---- Single-flight refresh-on-401 -------------------------------------------

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshInFlight: Promise<string> | null = null;

/**
 * Calls the refresh endpoint at most once per burst of concurrent 401s.
 * Any request that arrives while a refresh is already in flight awaits the
 * same promise instead of issuing its own refresh call.
 */
function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = apiClient
      .post<{ accessToken: string }>("/api/auth/refresh")
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Called by AuthContext on logout / a failed refresh, so components that
 * care (e.g. a route guard redirecting to /login) can react without polling.
 */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function registerSessionExpiredHandler(handler: SessionExpiredHandler): void {
  onSessionExpired = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    const isAuthEndpoint = originalRequest?.url?.startsWith("/api/auth");
    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retried &&
      !isAuthEndpoint;

    if (!shouldAttemptRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAccessToken();
      onSessionExpired?.();
      return Promise.reject(refreshError);
    }
  }
);

/**
 * Extracts a human-readable error message from an Axios error response.
 * Falls back gracefully if the shape is unexpected.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.error?.message === 'string') return data.error.message;
    if (typeof data?.message === 'string') return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}