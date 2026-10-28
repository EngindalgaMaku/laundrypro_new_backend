import { continueRender, delayRender, staticFile } from "remotion";

// Berrak palette (docs/BRAND.md in the app)
export const C = {
  blue: "#0A5C99",
  blueDark: "#073D68",
  teal: "#0B7A70",
  wave: "#7FD8CC",
  ink: "#0E1A24",
  page: "#F6F9FB",
  muted: "#5B6B78",
  border: "#DCE4EA",
};

export const FONT = "Geist, 'Segoe UI', sans-serif";

// The app's own font (copied from node_modules/geist); rendering waits until it is loaded
const fontHandle = delayRender("Geist font");
new FontFace("Geist", `url(${staticFile("fonts/Geist-Variable.woff2")}) format("woff2")`, { weight: "100 900" })
  .load()
  .then((face) => {
    document.fonts.add(face);
    continueRender(fontHandle);
  })
  .catch(() => continueRender(fontHandle));

/** Same mark as components/brand/logo.tsx; `wave` 0..1 draws the water line in */
export function LogoMark({ size, wave = 1 }: { size: number; wave?: number }) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      <rect width="72" height="72" rx="18" fill={C.blue} />
      <circle cx="36" cy="38" r="20" fill="none" stroke="#FFFFFF" strokeWidth={5} />
      <path
        d="M24 42c4-4 8-4 12 0s8 4 12 0"
        fill="none"
        stroke={C.wave}
        strokeWidth="5"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - wave}
      />
      <circle cx="20" cy="15" r="3" fill="#FFFFFF" opacity={wave} />
    </svg>
  );
}

export function Wordmark({ size, onDark = false }: { size: number; onDark?: boolean }) {
  return (
    <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: size, letterSpacing: "-0.02em", color: onDark ? "#FFFFFF" : C.ink }}>
      Laundry<span style={{ color: onDark ? C.wave : C.teal }}>Pro</span>
    </span>
  );
}
