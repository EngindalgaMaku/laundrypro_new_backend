import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, FONT, LogoMark, Wordmark } from "./brand";
import { CROSSFADE, FPS, LEAD_IN, SCENES, type Scene, sceneFrames } from "./timing";

export function promoDuration(): number {
  return SCENES.reduce((sum, s) => sum + sceneFrames(s.id), 0) - CROSSFADE * (SCENES.length - 1);
}

export function Promo() {
  let start = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: C.page, fontFamily: FONT }}>
      {SCENES.map((scene) => {
        const from = start;
        const frames = sceneFrames(scene.id);
        start += frames - CROSSFADE;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={frames} name={scene.id}>
            <Fade frames={frames}>{renderScene(scene)}</Fade>
            <Sequence from={Math.round(LEAD_IN * FPS)}>
              <Audio src={staticFile(`voice/${scene.id}.wav`)} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

function renderScene(scene: Scene) {
  switch (scene.id) {
    case "problem":
      return <ProblemScene lines={scene.title.split("\n")} />;
    case "logo":
      return <LogoScene subtitle={scene.subtitle ?? ""} />;
    case "outro":
      return <OutroScene subtitle={scene.subtitle ?? ""} cta={scene.cta ?? ""} />;
    default:
      return <ScreenScene title={scene.title} screen={scene.screen ?? ""} />;
  }
}

/** Cross-fade in and out over CROSSFADE frames */
function Fade({ frames, children }: { frames: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, CROSSFADE, frames - CROSSFADE, frames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

function useRise(delay: number, distance = 60) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
}

function ProblemScene({ lines }: { lines: string[] }) {
  // Each phrase drops in, then gets struck through: the old way of working
  const frame = useCurrentFrame();
  const phrases = lines.join(" ").split(/(?<=\.)\s+/);
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, justifyContent: "center", padding: "0 110px" }}>
      {phrases.map((text, i) => {
        const delay = 8 + i * 30;
        const strike = interpolate(frame, [delay + 22, delay + 34], [0, 100], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <Rise key={text} delay={delay}>
            <div style={{ position: "relative", display: "inline-block", margin: "18px 0" }}>
              <span style={{ color: "#FFFFFF", fontSize: 80, fontWeight: 700, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{text}</span>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "54%",
                  height: 10,
                  width: `${strike}%`,
                  background: "#E5484D",
                  borderRadius: 5,
                }}
              />
            </div>
          </Rise>
        );
      })}
    </AbsoluteFill>
  );
}

function Rise({ delay, children }: { delay: number; children: ReactNode }) {
  return <div style={useRise(delay)}>{children}</div>;
}

function LogoScene({ subtitle }: { subtitle: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const wave = interpolate(frame, [12, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${C.blueDark} 0%, #05294A 100%)`,
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
      }}
    >
      <div style={{ transform: `scale(${0.4 + pop * 0.6})`, opacity: pop }}>
        <MarkOnDark size={300} wave={wave} />
      </div>
      <div style={useRise(14)}>
        <Wordmark size={130} onDark />
      </div>
      <div style={{ ...useRise(24), color: "rgba(255,255,255,0.8)", fontSize: 48 }}>{subtitle}</div>
    </AbsoluteFill>
  );
}

/** Title on top, the real app screen in a phone frame that rises and slowly zooms */
function ScreenScene({ title, screen }: { title: string; screen: string }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 90 } });
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.04]);
  const PHONE_W = 760;
  const PHONE_H = Math.round(PHONE_W * (2532 / 1170)) + 36;
  return (
    <AbsoluteFill style={{ backgroundColor: C.page, alignItems: "center" }}>
      {/* soft brand shape behind the phone */}
      <div
        style={{
          position: "absolute",
          top: 520,
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.blue}1F 0%, ${C.blue}00 65%)`,
        }}
      />
      <div style={{ ...useRise(0, 40), marginTop: 150, padding: "0 90px", textAlign: "center" }}>
        <div style={{ fontSize: 78, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{title}</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 430,
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: 96,
          background: C.ink,
          padding: 18,
          boxShadow: "0 40px 90px -20px rgba(14,26,36,0.35)",
          transform: `translateY(${(1 - enter) * 500}px) scale(${zoom})`,
          transformOrigin: "50% 20%",
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: 80, overflow: "hidden", background: "#FFFFFF" }}>
          <Img src={staticFile(`screens/${screen}`)} style={{ width: "100%", display: "block" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** The blue mark on a dark-blue background: a light outline and shadow keep its shape visible */
function MarkOnDark({ size, wave = 1 }: { size: number; wave?: number }) {
  return (
    <div
      style={{
        borderRadius: size * 0.25,
        boxShadow: "0 0 0 4px rgba(255,255,255,0.18), 0 30px 60px -10px rgba(0,0,0,0.45)",
        lineHeight: 0,
      }}
    >
      <LogoMark size={size} wave={wave} />
    </div>
  );
}

function OutroScene({ subtitle, cta }: { subtitle: string; cta: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.015;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${C.blueDark} 0%, #05294A 100%)`,
        alignItems: "center",
        justifyContent: "center",
        gap: 44,
      }}
    >
      <div style={{ transform: `scale(${0.6 + pop * 0.4})`, opacity: pop }}>
        <MarkOnDark size={220} />
      </div>
      <div style={useRise(8)}>
        <Wordmark size={120} onDark />
      </div>
      <div style={{ ...useRise(16), color: "rgba(255,255,255,0.8)", fontSize: 44 }}>{subtitle}</div>
      <div style={{ ...useRise(28), marginTop: 40 }}>
        <div
          style={{
            transform: `scale(${pulse})`,
            background: "#FFFFFF",
            color: C.blue,
            fontSize: 54,
            fontWeight: 700,
            padding: "34px 70px",
            borderRadius: 24,
          }}
        >
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
}
