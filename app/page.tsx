"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { LogoMark } from "@/components/brand/logo";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");

    if (token && user) {
      // User is authenticated, redirect to dashboard
      setIsAuthenticated(true);
      router.push("/dashboard");
    } else {
      // User is not authenticated
      setIsAuthenticated(false);

      // Check if they've seen onboarding before
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }

    setIsLoading(false);
  }, [router]);

  const handleOnboardingComplete = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LogoMark className="mx-auto mb-4 h-14 w-14" />
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show onboarding for new users
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Show login form for existing users or after onboarding
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-first container - Compact */}
      <div className="flex min-h-screen flex-col px-4 py-6">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center sm:max-w-md">
          <div className="mb-6 text-center">
            <LogoMark className="mx-auto mb-3 h-12 w-12" />
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Laundry<span className="text-primary">Pro</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Temizlik işinizi dijitalleştirin
            </p>
          </div>

          <LoginForm />

          {/* Compact onboarding button */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Uygulamayı tanıyın
            </button>
          </div>
        </div>

        {/* Minimal footer */}
        <div className="text-center mt-2">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} LaundryPro</p>
        </div>
      </div>
    </div>
  );
}
