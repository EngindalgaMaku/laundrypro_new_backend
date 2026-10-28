import { Composition } from "remotion";
import { Promo, promoDuration } from "./Promo";
import { FPS } from "./timing";

export function Root() {
  return (
    <>
      {/* Vertical: Play Store, Instagram/WhatsApp status */}
      <Composition id="Promo" component={Promo} durationInFrames={promoDuration()} fps={FPS} width={1080} height={1920} />
    </>
  );
}
