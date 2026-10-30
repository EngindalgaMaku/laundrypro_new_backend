import { cn } from "@/lib/utils";
import MARK from "@/lib/brand-mark.json";

// Brand colors (LaundryPro Modern). Kept here so the logo renders the same outside the theme.
export const BRAND = {
  blue: "#0284C7",
  teal: "#0284C7",
  wave: "#38BDF8",
} as const;

export interface LogoMarkProps {
  className?: string;
  /** Drops the wave so the mark stays legible below ~24px */
  simple?: boolean;
  title?: string;
}

/** Küçük Logo / İkon: Modern çamaşır makinesi tamburu ve temiz su döngüsü (lib/brand-mark.json). */
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
        opacity={0.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!simple && (
        <path d={MARK.wavePath} fill="none" stroke={BRAND.wave} strokeWidth={MARK.waveWidth} strokeLinecap="round" />
      )}
    </svg>
  );
}

export interface LogoProps {
  className?: string;
  markClassName?: string;
  /** Koyu temalar ve afişler için beyaz yazılı */
  inverted?: boolean;
  /** Alt başlık (örn: "Akıllı Çamaşırhane & Halı Yıkama") */
  subtitle?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

/** Büyük Logo: İkon + "LaundryPro" (Laundry beyaz/koyu, Pro parlak mavi) + Opsiyonel Kurumsal Alt Başlık */
export function Logo({
  className,
  markClassName,
  inverted = false,
  subtitle,
  size = "md",
}: LogoProps) {
  const sizeMap = {
    sm: { mark: "h-7 w-7", text: "text-base", sub: "text-[9px]" },
    md: { mark: "h-9 w-9", text: "text-lg", sub: "text-[10px]" },
    lg: { mark: "h-11 w-11", text: "text-2xl", sub: "text-xs" },
    xl: { mark: "h-14 w-14", text: "text-3xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <LogoMark className={cn(currentSize.mark, "shadow-sm", markClassName)} />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-black tracking-tight",
            currentSize.text,
            inverted ? "text-white" : "text-foreground"
          )}
        >
          Laundry<span className="text-[#0284C7] dark:text-[#38BDF8]">Pro</span>
        </span>
        {subtitle && (
          <span
            className={cn(
              "font-bold uppercase tracking-wider mt-1",
              currentSize.sub,
              inverted ? "text-slate-300" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

export default Logo;
