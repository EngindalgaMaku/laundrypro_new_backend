// Renders the @capacitor/assets sources in assets/ from lib/brand-mark.json:
//   icon-only.png, icon-foreground.png, icon-background.png (1024²) and
//   splash.png, splash-dark.png (2732²).
// Then: npx capacitor-assets generate --android   (writes every Android density)
// Run: node scripts/render-brand-assets.mjs   (uses the video project's puppeteer-core + local Chrome)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const require = createRequire(path.join(root, "video", "package.json"));
const puppeteer = require("puppeteer-core");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const m = JSON.parse(readFileSync(path.join(root, "lib/brand-mark.json"), "utf8"));
const font = readFileSync(path.join(root, "node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2")).toString("base64");

const marks = `<path d="${m.letter}" fill="none" stroke="#fff" stroke-width="${m.letterWidth}" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${m.wavePath}" fill="none" stroke="${m.wave}" stroke-width="${m.waveWidth}" stroke-linecap="round"/>`;
const page = (size, bg, body) => `<!doctype html><html><head><style>
@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900}
html,body{margin:0;width:${size}px;height:${size}px;background:${bg};overflow:hidden}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:70px;font-family:Geist}
.word{font-size:150px;font-weight:700;letter-spacing:-3px;color:#fff}.word span{color:${m.wave}}
</style></head><body>${body}</body></html>`;

const outputs = [
  // Legacy (pre-adaptive) launcher icon: full-bleed blue with the mark
  ["icon-only.png", 1024, m.blue, `<svg width="1024" height="1024" viewBox="-10 -10 92 92">${marks}</svg>`],
  // Adaptive icon: the 72-unit artwork in the inner 72 of a 108 canvas (Android's safe zone)
  ["icon-foreground.png", 1024, "transparent", `<svg width="1024" height="1024" viewBox="-18 -18 108 108">${marks}</svg>`],
  ["icon-background.png", 1024, m.blue, ""],
  ["splash.png", 2732, m.blue, `<svg width="520" height="520" viewBox="0 0 72 72">${marks}</svg><div class="word">Laundry<span>Pro</span></div>`],
  ["splash-dark.png", 2732, "#073D68", `<svg width="520" height="520" viewBox="0 0 72 72">${marks}</svg><div class="word">Laundry<span>Pro</span></div>`],
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const tab = await browser.newPage();
for (const [file, size, bg, body] of outputs) {
  await tab.setViewport({ width: size, height: size });
  await tab.setContent(page(size, bg, body), { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: path.join(root, "assets", file), omitBackground: bg === "transparent" });
  console.log("wrote assets/" + file);
}
await browser.close();
