import scenes from "./scenes.json";
import durations from "./voice-durations.json";

export const FPS = 30;
/** Silence before the voice starts in each scene, and after it ends */
export const LEAD_IN = 0.35;
export const TAIL = 0.75;
/** Frames two neighbouring scenes overlap for the cross-fade */
export const CROSSFADE = 10;

export type Scene = (typeof scenes)[number];

export const SCENES = scenes as Scene[];

export function sceneFrames(id: string): number {
  const voice = (durations as Record<string, number>)[id] ?? 3;
  return Math.ceil((LEAD_IN + voice + TAIL) * FPS);
}
