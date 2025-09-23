"use client";

import { getAuthToken, removeAuthToken } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";

/**
 * Automatic authentication checker that runs silently in the background
 * Perfect for mobile apps that need seamless auth handling
 */
export class AutoAuth {
  private static instance: AutoAuth;
  private isChecking = false;
  private lastCheck = 0;
  private checkInterval = 5 * 60 * 1000; // Check every 5 minutes
  private onAuthFailed?: () => void;

  private constructor() {}

  static getInstance(): AutoAuth {
    if (!AutoAuth.instance) {
      AutoAuth.instance = new AutoAuth();
    }
    return AutoAuth.instance;
  }

  /**
   * Set callback for when authentication fails
   */
  onAuthenticationFailed(callback: () => void) {
    this.onAuthFailed = callback;
  }

  /**
   * Check if current token is valid
   */
  async validateToken(): Promise<boolean> {
    if (this.isChecking) {
      return false;
    }

    const token = getAuthToken();
    if (!token) {
      console.log("[AUTO-AUTH] No token found");
      return false;
    }

    this.isChecking = true;
    
    try {
      console.log("[AUTO-AUTH] Validating token...");
      
      // Try to access a protected endpoint
      await apiClient.get("/users/me", {
        showErrorToast: false,
        requiresAuth: true,
      });

      console.log("[AUTO-AUTH] Token is valid");
      this.lastCheck = Date.now();
      return true;
    } catch (error: any) {
      console.error("[AUTO-AUTH] Token validation failed:", error);
      
      // If it's a 401 or 404, the token is definitely invalid
      if (error.status === 401 || error.status === 404) {
        console.log("[AUTO-AUTH] Invalid token detected, clearing auth");
        this.clearAuthAndNotify("Token is invalid or expired");
        return false;
      }
      
      // For other errors (network, etc.), don't clear the token
      console.log("[AUTO-AUTH] Network or server error, keeping token");
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Clear authentication and notify the app
   */
  private clearAuthAndNotify(reason: string) {
    console.log(`[AUTO-AUTH] Clearing authentication: ${reason}`);
    
    // Clear the token
    removeAuthToken();
    
    // Notify the app
    if (this.onAuthFailed) {
      this.onAuthFailed();
    }
  }

  /**
   * Start automatic token validation
   */
  startAutoValidation() {
    console.log("[AUTO-AUTH] Starting automatic validation");
    
    // Initial check
    this.validateToken();
    
    // Set up periodic checks
    setInterval(() => {
      const now = Date.now();
      if (now - this.lastCheck > this.checkInterval) {
        this.validateToken();
      }
    }, this.checkInterval);
  }

  /**
   * Force a token validation check
   */
  async forceValidation(): Promise<boolean> {
    this.lastCheck = 0; // Reset last check time
    return await this.validateToken();
  }

  /**
   * Check if we should validate (based on time since last check)
   */
  shouldValidate(): boolean {
    const now = Date.now();
    return (now - this.lastCheck) > this.checkInterval;
  }
}

/**
 * Simple function to initialize auto-auth for mobile apps
 */
export function initializeAutoAuth(onAuthFailed: () => void) {
  const autoAuth = AutoAuth.getInstance();
  autoAuth.onAuthenticationFailed(onAuthFailed);
  autoAuth.startAutoValidation();
  
  return autoAuth;
}

/**
 * Validate authentication before making API calls
 * Returns true if authenticated, false if not (and handles cleanup)
 */
export async function ensureAuthenticated(): Promise<boolean> {
  const autoAuth = AutoAuth.getInstance();
  return await autoAuth.validateToken();
}

/**
 * Hook for React components to handle auto-auth
 */
export function useAutoAuth() {
  const autoAuth = AutoAuth.getInstance();
  
  return {
    validateToken: () => autoAuth.validateToken(),
    forceValidation: () => autoAuth.forceValidation(),
    shouldValidate: () => autoAuth.shouldValidate(),
  };
}
