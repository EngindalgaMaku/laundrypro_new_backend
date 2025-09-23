"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy Loading Image Component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          error && "hidden",
          className
        )}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
          Görsel yüklenemedi
        </div>
      )}
    </div>
  );
}

// Skeleton Loader Component
interface SkeletonProps {
  className?: string;
  rows?: number;
}

export function Skeleton({ className, rows = 1 }: SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-muted rounded animate-pulse"
          style={{
            width: `${Math.random() * 40 + 60}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
  text = "Yükleniyor...",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && (
        <span className="text-sm text-muted-foreground font-medium">
          {text}
        </span>
      )}
    </div>
  );
}

// Error Boundary Component
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-destructive/5 border border-destructive/20 rounded-xl">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">⚠️</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Bir hata oluştu
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {error.message ||
              "Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin."}
          </p>
        </div>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors focus-ring"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}

// Intersection Observer Hook for Lazy Loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  threshold = 0.1
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, threshold]);

  return isIntersecting;
}

// Debounced Search Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Performance monitoring (simplified without web-vitals dependency)
export function usePerformanceMonitor() {
  useEffect(() => {
    // Monitor basic performance metrics
    if (typeof window !== "undefined" && "performance" in window) {
      // Log navigation timing
      window.addEventListener("load", () => {
        const navigation = performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming;
        if (navigation) {
          console.log("Page Load Performance:", {
            domContentLoaded:
              navigation.domContentLoadedEventEnd -
              navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            totalPageLoad: navigation.loadEventEnd - navigation.fetchStart,
          });
        }
      });

      // Monitor resource loading
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "resource" && entry.duration > 1000) {
            console.warn("Slow resource loading:", entry.name, entry.duration);
          }
        }
      });

      observer.observe({ entryTypes: ["resource"] });

      return () => observer.disconnect();
    }
  }, []);
}
