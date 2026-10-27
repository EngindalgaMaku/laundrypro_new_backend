import { cn } from "@/lib/utils";

// Brand colors (Berrak). Kept here so the logo renders the same outside the theme.
export const BRAND = {
  blue: "#0A5C99",
  teal: "#0B7A70",
  wave: "#7FD8CC",
} as const;

interface LogoMarkProps {
  className?: string;
  /** Drops the wave and dot so the mark stays legible below ~24px */
  simple?: boolean;
  title?: string;
}

/** Washing-machine door with a water wave, on a rounded brand-blue square. */
export function LogoMark({ className, simple = false, title }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 72 72"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="72" height="72" rx="18" fill={BRAND.blue} />
      <circle cx="36" cy="38" r="20" fill="none" stroke="#FFFFFF" strokeWidth={simple ? 7 : 5} />
      {!simple && (
        <>
          <path
            d="M24 42c4-4 8-4 12 0s8 4 12 0"
            fill="none"
            stroke={BRAND.wave}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="20" cy="15" r="3" fill="#FFFFFF" />
        </>
      )}
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markClassName?: string;
  /** Wordmark color on dark backgrounds */
  inverted?: boolean;
}

/** Mark plus the "LaundryPro" wordmark. */
export function Logo({ className, markClassName, inverted = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("h-9 w-9", markClassName)} />
      <span
        className={cn(
          "text-lg font-bold tracking-tight",
          inverted ? "text-white" : "text-foreground"
        )}
      >
        Laundry<span className={inverted ? "text-[#7FD8CC]" : "text-secondary"}>Pro</span>
      </span>
    </span>
  );
}
