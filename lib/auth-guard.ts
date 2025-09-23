"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthToken, removeAuthToken, getUserData } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  error: string | null;
}

/**
 * Automatic authentication guard that handles token validation and cleanup
 */
export function useAuthGuard() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });
  
  const router = useRouter();
  const pathname = usePathname();

  const clearAuthAndRedirect = (reason: string = "Session expired") => {
    console.log(`[AUTH-GUARD] Clearing auth: ${reason}`);
    
    // Clear all authentication data
    removeAuthToken();
    
    // Show user-friendly message
    toast.error("Oturum Süresi Doldu", {
      description: "Lütfen tekrar giriş yapın",
      duration: 3000,
    });
    
    // Update state
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: reason,
    });
    
    // Redirect to login if not already there
    if (pathname !== "/login" && pathname !== "/register") {
      router.push("/login");
    }
  };

  const validateAuthentication = async () => {
    try {
      console.log("[AUTH-GUARD] Starting authentication validation");
      
      const token = getAuthToken();
      if (!token) {
        console.log("[AUTH-GUARD] No token found");
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: "No token",
        });
        return false;
      }

      console.log("[AUTH-GUARD] Token found, validating with server");

      // Try to get current user - this will automatically handle token refresh
      const response = await apiClient.get("/users/me", {
        showErrorToast: false, // We'll handle errors manually
      });

      if (response.user) {
        console.log("[AUTH-GUARD] Authentication successful");
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: response.user,
          error: null,
        });
        return true;
      } else {
        console.log("[AUTH-GUARD] Invalid response from server");
        clearAuthAndRedirect("Invalid server response");
        return false;
      }
    } catch (error: any) {
      console.error("[AUTH-GUARD] Authentication validation failed:", error);
      
      // Check if it's a 401/404 error (invalid token/user not found)
      if (error.status === 401 || error.status === 404) {
        clearAuthAndRedirect("Invalid or expired token");
      } else if (error.type === "network_error") {
        // Network error - don't clear token, just show loading state
        console.log("[AUTH-GUARD] Network error, retrying...");
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: "Network error",
        }));
      } else {
        // Other errors - clear token to be safe
        clearAuthAndRedirect("Authentication error");
      }
      
      return false;
    }
  };

  useEffect(() => {
    validateAuthentication();
  }, [pathname]);

  const retry = () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    validateAuthentication();
  };

  return {
    ...authState,
    retry,
    clearAuth: () => clearAuthAndRedirect("Manual logout"),
  };
}

/**
 * Higher-order component that protects routes with automatic authentication
 */
export function withAuthGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    redirectTo?: string;
    showLoadingSpinner?: boolean;
    allowUnauthenticated?: boolean;
  } = {}
) {
  const {
    redirectTo = "/login",
    showLoadingSpinner = true,
    allowUnauthenticated = false,
  } = options;

  return function AuthGuardedComponent(props: P) {
    const { isAuthenticated, isLoading, error, retry } = useAuthGuard();
    const router = useRouter();

    // Show loading spinner while checking authentication
    if (isLoading && showLoadingSpinner) {
      return React.createElement('div', { className: "flex items-center justify-center min-h-screen" },
        React.createElement('div', { className: "animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" })
      );
    }

    // Handle network errors with retry option
    if (error === "Network error") {
      return React.createElement('div', { className: "flex flex-col items-center justify-center min-h-screen p-4" },
        React.createElement('div', { className: "text-center" },
          React.createElement('h2', { className: "text-xl font-semibold mb-2" }, "Bağlantı Hatası"),
          React.createElement('p', { className: "text-gray-600 mb-4" }, 
            "İnternet bağlantınızı kontrol edin ve tekrar deneyin"
          ),
          React.createElement('button', {
            onClick: retry,
            className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          }, "Tekrar Dene")
        )
      );
    }

    // Redirect to login if not authenticated (unless explicitly allowed)
    if (!isAuthenticated && !allowUnauthenticated) {
      if (typeof window !== "undefined") {
        router.push(redirectTo);
      }
      return null;
    }

    // Render the protected component
    return React.createElement(WrappedComponent, props);
  };
}

/**
 * Hook for components that need to handle authentication state
 */
export function useAuth() {
  const authState = useAuthGuard();
  
  return {
    ...authState,
    logout: () => authState.clearAuth(),
  };
}
