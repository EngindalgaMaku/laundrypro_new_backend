import { cn } from "@/lib/utils";
import MARK from "@/lib/brand-mark.json";

// Brand colors (Berrak). Kept here so the logo renders the same outside the theme.
export const BRAND = {
  blue: "#0A5C99",
  teal: "#0B7A70",
  wave: "#7FD8CC",
} as const;

interface LogoMarkProps {
  className?: string;
  /** Drops the wave so the mark stays legible below ~24px */
  simple?: boolean;
  title?: string;
}

/** An L whose foot rests on a water wave, on a rounded brand-blue square (lib/brand-mark.json). */
export function LogoMark({ className, simple = false, title }: LogoMarkProps) {
  return (
    <svg
      viewBox={`0 0 ${MARK.viewBox} ${MARK.viewBox}`}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width={MARK.viewBox} height={MARK.viewBox} rx={MARK.radius} fill={BRAND.blue} />
      <path
        d={MARK.letter}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={simple ? MARK.letterWidthSimple : MARK.letterWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!simple && (
        <path d={MARK.wavePath} fill="none" stroke={BRAND.wave} strokeWidth={MARK.waveWidth} strokeLinecap="round" />
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
