import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

// In-memory access token — never stored in localStorage or a cookie
// that JS can read, so it can't be stolen by XSS. Lives only for the
// lifetime of this page session. Restored on every page load by the
// silent refresh in AuthContext.
let _accessToken: string | null = null;
let _sessionExpiredHandler: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function registerSessionExpiredHandler(handler: () => void) {
  _sessionExpiredHandler = handler;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends the HttpOnly refresh cookie on /auth/refresh
});

// Attach the current access token to every outgoing request.
apiClient.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// On 401, attempt a silent token refresh, then retry the original request
// once. If the refresh also fails (expired / revoked refresh token), clear
// state and let the user flow back to the login page.
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry refresh calls themselves — that would loop forever.
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');
    if (error.response?.status !== 401 || isRefreshCall || originalRequest._retried) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    if (isRefreshing) {
      // Another request is already refreshing — queue this one and wait.
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) return reject(error);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    try {
      const res = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
      const newToken: string = res.data.accessToken;
      setAccessToken(newToken);
      flushQueue(newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch {
      setAccessToken(null);
      flushQueue(null);
      _sessionExpiredHandler?.();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
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
