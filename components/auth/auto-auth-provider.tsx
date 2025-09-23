"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializeAutoAuth, ensureAuthenticated } from "@/lib/auto-auth";
import { getAuthToken } from "@/lib/auth";
import { toast } from "sonner";

interface AutoAuthProviderProps {
  children: React.ReactNode;
  loginPath?: string;
  enableAutoRedirect?: boolean;
}

/**
 * Automatic authentication provider for mobile apps
 * Handles token validation and automatic redirects
 */
export function AutoAuthProvider({ 
  children, 
  loginPath = "/login",
  enableAutoRedirect = true 
}: AutoAuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const handleAuthFailure = () => {
    console.log("[AUTO-AUTH-PROVIDER] Authentication failed");
    
    setIsAuthenticated(false);
    
    // Show user-friendly message
    toast.error("Oturum Süresi Doldu", {
      description: "Lütfen tekrar giriş yapın",
      duration: 3000,
    });
    
    // Redirect to login if enabled
    if (enableAutoRedirect) {
      router.push(loginPath);
    }
  };

  const checkInitialAuth = async () => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        console.log("[AUTO-AUTH-PROVIDER] No token found");
        setIsAuthenticated(false);
        setIsLoading(false);
        
        if (enableAutoRedirect) {
          router.push(loginPath);
        }
        return;
      }

      console.log("[AUTO-AUTH-PROVIDER] Checking initial authentication");
      const isValid = await ensureAuthenticated();
      
      setIsAuthenticated(isValid);
      setIsLoading(false);
      
      if (!isValid && enableAutoRedirect) {
        router.push(loginPath);
      }
    } catch (error) {
      console.error("[AUTO-AUTH-PROVIDER] Initial auth check failed:", error);
      setIsAuthenticated(false);
      setIsLoading(false);
      
      if (enableAutoRedirect) {
        router.push(loginPath);
      }
    }
  };

  useEffect(() => {
    // Initialize auto-auth system
    initializeAutoAuth(handleAuthFailure);
    
    // Check initial authentication
    checkInitialAuth();
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and auto-redirect is disabled, still show children
  // (useful for login/register pages)
  if (!isAuthenticated && !enableAutoRedirect) {
    return <>{children}</>;
  }

  // If not authenticated and auto-redirect is enabled, show nothing
  // (redirect will happen automatically)
  if (!isAuthenticated && enableAutoRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Giriş sayfasına yönlendiriliyor...</p>
        </div>
      </div>
    );
  }

  // Authenticated - show the app
  return <>{children}</>;
}

/**
 * Higher-order component version for easier usage
 */
export function withAutoAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    loginPath?: string;
    enableAutoRedirect?: boolean;
  } = {}
) {
  return function WrappedComponent(props: P) {
    return (
      <AutoAuthProvider {...options}>
        <Component {...props} />
      </AutoAuthProvider>
    );
  };
}
