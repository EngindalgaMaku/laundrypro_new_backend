"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-400">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">🧼</span>
          </div>
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
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
    <div className="min-h-screen gradient-hero relative overflow-hidden">
      {/* Mobile-first background effects */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Responsive background particles */}
      <div className="absolute top-5 left-5 w-20 h-20 sm:top-10 sm:left-10 sm:w-40 sm:h-40 bg-white/10 rounded-full blur-2xl sm:blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-5 right-5 w-32 h-32 sm:bottom-10 sm:right-10 sm:w-60 sm:h-60 bg-white/5 rounded-full blur-2xl sm:blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      ></div>
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-96 sm:h-96 bg-white/5 rounded-full blur-2xl sm:blur-3xl animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>

      {/* Mobile-optimized floating particles */}
      <div
        className="hidden sm:block absolute top-1/4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-bounce"
        style={{ animationDelay: "0.5s" }}
      ></div>
      <div
        className="hidden sm:block absolute top-3/4 left-3/4 w-1 h-1 bg-white/40 rounded-full animate-bounce"
        style={{ animationDelay: "1.5s" }}
      ></div>
      <div
        className="hidden sm:block absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce"
        style={{ animationDelay: "2.5s" }}
      ></div>

      {/* Mobile-first container - Compact */}
      <div className="flex flex-col h-screen p-3 sm:p-4 relative z-10">
        <div className="flex-1 flex flex-col justify-center max-w-sm sm:max-w-md mx-auto w-full">
          {/* Ultra compact header */}
          <div className="text-center mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-2xl ring-1 ring-white/20">
              <div className="text-lg sm:text-xl">🧼</div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 tracking-tight">
              Laundry<span className="text-white/80">Pro</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/80 font-medium">
              Temizlik işinizi dijitalleştirin
            </p>
          </div>

          <LoginForm />

          {/* Compact onboarding button */}
          <div className="text-center mt-3 sm:mt-4">
            <button
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs rounded-lg border border-white/20 hover:border-white/30 backdrop-blur-sm transition-all duration-300"
            >
              <span>🎥</span>
              <span>Tanıtım</span>
            </button>
          </div>
        </div>

        {/* Minimal footer */}
        <div className="text-center mt-2">
          <p className="text-white/50 text-xs">© 2025 LaundryPro</p>
        </div>
      </div>
    </div>
  );
}
