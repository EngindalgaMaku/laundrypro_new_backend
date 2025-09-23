"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

// Screen Reader Only Text Component
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  className?: string;
}

export function ScreenReaderOnly({
  children,
  className,
}: ScreenReaderOnlyProps) {
  return (
    <span
      className={cn(
        "sr-only absolute -inset-1 w-px h-px p-0 m-0 overflow-hidden whitespace-nowrap border-0",
        className
      )}
    >
      {children}
    </span>
  );
}

// Skip to Main Content Link
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg transition-all duration-200"
    >
      Ana içeriğe geç
    </a>
  );
}

// Focus Management Hook
export function useFocusManagement() {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(
    null
  );
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  };

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener("keydown", handleTabKey);

    // Focus first element initially
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      container.removeEventListener("keydown", handleTabKey);
    };
  };

  return {
    saveFocus,
    restoreFocus,
    trapFocus,
    focusedElement,
    setFocusedElement,
  };
}

// Enhanced Button with Full Accessibility
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  className,
  ariaLabel,
  ariaDescribedBy,
  isLoading = false,
  loadingText = "Yükleniyor...",
}: AccessibleButtonProps) {
  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline:
      "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
    ghost: "text-primary hover:bg-primary/10",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-ring touch-target",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        "hover:scale-[1.02] active:scale-[0.98]",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {isLoading && (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <ScreenReaderOnly>{loadingText}</ScreenReaderOnly>
        </>
      )}
      <span aria-hidden={isLoading}>{children}</span>
    </button>
  );
}

// Enhanced Input with Full Accessibility
interface AccessibleInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
}

export function AccessibleInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  className,
}: AccessibleInputProps) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="gerekli alan">
            *
          </span>
        )}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={cn(helpText && helpId, error && errorId)}
        className={cn(
          "w-full px-3 py-2 border-2 rounded-lg transition-all duration-200",
          "focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none",
          "disabled:bg-muted disabled:cursor-not-allowed",
          error
            ? "border-destructive focus:border-destructive focus:ring-destructive/20"
            : "border-input hover:border-primary/50",
          className
        )}
      />

      {helpText && (
        <p id={helpId} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-destructive font-medium"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// Announcement Component for Screen Readers
interface AnnouncementProps {
  message: string;
  priority?: "polite" | "assertive";
}

export function Announcement({
  message,
  priority = "polite",
}: AnnouncementProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// High Contrast Mode Detection
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkHighContrast = () => {
        const mediaQuery = window.matchMedia("(prefers-contrast: high)");
        setIsHighContrast(mediaQuery.matches);
      };

      checkHighContrast();

      const mediaQuery = window.matchMedia("(prefers-contrast: high)");
      mediaQuery.addEventListener("change", checkHighContrast);

      return () => {
        mediaQuery.removeEventListener("change", checkHighContrast);
      };
    }
  }, []);

  return isHighContrast;
}

// Reduced Motion Detection
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }
  }, []);

  return prefersReducedMotion;
}

// Keyboard Navigation Helper
export function useKeyboardNavigation() {
  const [isUsingKeyboard, setIsUsingKeyboard] = useState(false);

  useEffect(() => {
    const handleMouseDown = () => setIsUsingKeyboard(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        setIsUsingKeyboard(true);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Add or remove focus-visible class based on keyboard usage
  useEffect(() => {
    if (isUsingKeyboard) {
      document.body.classList.add("keyboard-navigation");
    } else {
      document.body.classList.remove("keyboard-navigation");
    }
  }, [isUsingKeyboard]);

  return isUsingKeyboard;
}

// Color Contrast Checker
export function checkColorContrast(
  foreground: string,
  background: string
): {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
} {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const rLinear =
      rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLinear =
      gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLinear =
      bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  };

  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) {
    return { ratio: 0, wcagAA: false, wcagAAA: false };
  }

  const fgLuminance = getLuminance(fg.r, fg.g, fg.b);
  const bgLuminance = getLuminance(bg.r, bg.g, bg.b);

  const ratio =
    (Math.max(fgLuminance, bgLuminance) + 0.05) /
    (Math.min(fgLuminance, bgLuminance) + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    wcagAA: ratio >= 4.5,
    wcagAAA: ratio >= 7,
  };
}
