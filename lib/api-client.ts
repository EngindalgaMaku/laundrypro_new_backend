"use client";

import { toast } from "sonner";
import {
  fetchWithErrorHandling,
  NETWORK_ERRORS,
  handleNetworkError,
} from "@/lib/network";
import { getAuthToken, setAuthToken, removeAuthToken } from "@/lib/auth";

export interface ApiError {
  message: string;
  type:
    | "network_error"
    | "server_error"
    | "database_connection"
    | "validation_error";
  status?: number;
}

export class ApiClientError extends Error {
  public type: ApiError["type"];
  public status?: number;

  constructor(message: string, type: ApiError["type"], status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.type = type;
    this.status = status;
  }
}

/**
 * Enhanced API client with network error handling and Turkish messages
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseUrl: string = "", defaultHeaders: HeadersInit = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...defaultHeaders,
    };
  }

  /**
   * Get authorization headers with current token
   */
  private getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      };
    }
    return {};
  }

  /**
   * Attempt to refresh the authentication token
   */
  private async refreshToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<string> {
    const currentToken = getAuthToken();
    if (!currentToken) {
      throw new Error("No token to refresh");
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      const newToken = data.token;

      if (newToken) {
        setAuthToken(newToken);
        return newToken;
      } else {
        throw new Error("No token in refresh response");
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Clear invalid token and redirect to login
      removeAuthToken();
      window.location.href = "/login";
      throw error;
    }
  }

  /**
   * Make an API request with comprehensive error handling and automatic token refresh
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit & {
      showErrorToast?: boolean;
      showSuccessToast?: boolean;
      successMessage?: string;
      requiresAuth?: boolean;
    } = {}
  ): Promise<T> {
    const {
      showErrorToast = true,
      showSuccessToast = false,
      successMessage,
      requiresAuth = true,
      ...requestOptions
    } = options;

    const url = `${this.baseUrl}${endpoint}`;

    // Add auth headers if required
    const authHeaders = requiresAuth ? this.getAuthHeaders() : {};

    try {
      const response = await fetchWithErrorHandling(url, {
        ...requestOptions,
        headers: {
          ...this.defaultHeaders,
          ...authHeaders,
          ...requestOptions.headers,
        },
      });

      // Check for 401 and attempt token refresh
      if (response.status === 401 && requiresAuth) {
        console.log("[API] Received 401, attempting token refresh...");
        
        try {
          await this.refreshToken();
          
          // Retry the request with new token
          const newAuthHeaders = this.getAuthHeaders();
          const retryResponse = await fetchWithErrorHandling(url, {
            ...requestOptions,
            headers: {
              ...this.defaultHeaders,
              ...newAuthHeaders,
              ...requestOptions.headers,
            },
          });

          // Parse retry response
          const contentType = retryResponse.headers.get("content-type");
          let data: T;

          if (contentType && contentType.includes("application/json")) {
            data = await retryResponse.json();
          } else {
            data = (await retryResponse.text()) as unknown as T;
          }

          if (showSuccessToast && successMessage) {
            toast.success("Başarılı", {
              description: successMessage,
            });
          }

          return data;
        } catch (refreshError) {
          console.error("[API] Token refresh failed:", refreshError);
          // Clear token and let auth guard handle redirect
          removeAuthToken();
          throw new ApiClientError(
            "Session expired. Please login again.",
            "validation_error",
            401
          );
        }
      }

      // Check for 404 on user/business endpoints (stale token with non-existent user)
      if (response.status === 404 && requiresAuth && 
          (endpoint.includes('/users/me') || endpoint.includes('/business/me'))) {
        console.log("[API] Received 404 on auth endpoint - stale token detected");
        removeAuthToken();
        throw new ApiClientError(
          "User account not found. Please login again.",
          "validation_error",
          404
        );
      }

      // Parse response
      const contentType = response.headers.get("content-type");
      let data: T;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      // Show success toast if requested
      if (showSuccessToast && successMessage) {
        toast.success("Başarılı", {
          description: successMessage,
        });
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);

      // Handle network errors
      const networkError = handleNetworkError(error);
      let apiError: ApiClientError;

      // Check if it's a server response with error details
      if (error instanceof Response) {
        try {
          const errorData = await error.json();

          // Use server-provided Turkish error message if available
          const message = errorData.error || networkError.message;
          const type =
            errorData.type ||
            (networkError.type === "internet"
              ? "network_error"
              : networkError.type === "database"
              ? "database_connection"
              : "server_error");

          apiError = new ApiClientError(message, type, error.status);
        } catch {
          // Fallback to network error - map network error types to API error types
          const errorType: ApiError["type"] =
            networkError.type === "internet"
              ? "network_error"
              : networkError.type === "database"
              ? "database_connection"
              : "server_error";

          apiError = new ApiClientError(networkError.message, errorType);
        }
      } else {
        // Map network error types to API error types
        const errorType: ApiError["type"] =
          networkError.type === "internet"
            ? "network_error"
            : networkError.type === "database"
            ? "database_connection"
            : "server_error";

        apiError = new ApiClientError(networkError.message, errorType);
      }

      // Show error toast with appropriate Turkish message
      if (showErrorToast) {
        this.showErrorToast(apiError);
      }

      throw apiError;
    }
  }

  /**
   * Show appropriate error toast based on error type
   */
  private showErrorToast(error: ApiClientError) {
    let title: string;
    let description: string;
    let action: { label: string; onClick: () => void } | undefined;

    switch (error.type) {
      case "network_error":
        title = NETWORK_ERRORS.INTERNET_CONNECTION.title;
        description =
          error.message || NETWORK_ERRORS.INTERNET_CONNECTION.message;
        action = {
          label: NETWORK_ERRORS.INTERNET_CONNECTION.action,
          onClick: () => window.location.reload(),
        };
        break;

      case "database_connection":
        title = NETWORK_ERRORS.DATABASE_CONNECTION.title;
        description =
          error.message || NETWORK_ERRORS.DATABASE_CONNECTION.message;
        action = {
          label: NETWORK_ERRORS.DATABASE_CONNECTION.action,
          onClick: () => window.location.reload(),
        };
        break;

      case "server_error":
        title = "Sunucu Hatası";
        description =
          error.message || "Bir sunucu hatası oluştu. Lütfen tekrar deneyin.";
        action = {
          label: "Tekrar Dene",
          onClick: () => window.location.reload(),
        };
        break;

      case "validation_error":
        title = "Doğrulama Hatası";
        description = error.message || "Girilen bilgileri kontrol ediniz.";
        break;

      default:
        title = "Hata";
        description = error.message || "Beklenmeyen bir hata oluştu.";
        action = {
          label: "Tekrar Dene",
          onClick: () => window.location.reload(),
        };
    }

    toast.error(title, {
      description,
      action,
      duration:
        error.type === "network_error" || error.type === "database_connection"
          ? Infinity
          : 10000,
    });
  }

  // Convenience methods
  async get<T = any>(
    endpoint: string,
    options?: Omit<Parameters<typeof this.request>[1], "method">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<Parameters<typeof this.request>[1], "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<Parameters<typeof this.request>[1], "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(
    endpoint: string,
    options?: Omit<Parameters<typeof this.request>[1], "method">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<Parameters<typeof this.request>[1], "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Default API client instance
export const apiClient = new ApiClient("/api");

/**
 * Hook to use API client with network context
 */
export function useApiClient() {
  return apiClient;
}

/**
 * Higher-order function to wrap API calls with loading states
 */
export function withLoading<T extends any[], R>(
  apiCall: (...args: T) => Promise<R>,
  setLoading?: (loading: boolean) => void
) {
  return async (...args: T): Promise<R> => {
    try {
      setLoading?.(true);
      return await apiCall(...args);
    } finally {
      setLoading?.(false);
    }
  };
}

/**
 * Retry wrapper for API calls
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: ApiClientError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as ApiClientError;

      // Don't retry validation errors
      if (lastError.type === "validation_error") {
        break;
      }

      if (attempt === maxRetries) {
        break;
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }

  throw (
    lastError ||
    new ApiClientError("API call failed after retries", "server_error")
  );
}
