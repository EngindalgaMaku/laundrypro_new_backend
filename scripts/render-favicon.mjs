// app/favicon.ico from lib/brand-mark.json: 16, 32 and 48 px PNGs packed into one ICO
// (the simple mark below 48 px, as app/icon.tsx does). Run: node scripts/render-favicon.mjs
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const require = createRequire(path.join(root, "video", "package.json"));
const puppeteer = require("puppeteer-core");
const m = JSON.parse(readFileSync(path.join(root, "lib/brand-mark.json"), "utf8"));

const svg = (size) => {
  const simple = size < 48;
  return `<svg width="${size}" height="${size}" viewBox="0 0 72 72"><rect width="72" height="72" rx="${m.radius}" fill="${m.blue}"/>
<path d="${m.letter}" fill="none" stroke="#fff" stroke-width="${simple ? m.letterWidthSimple : m.letterWidth}" stroke-linecap="round" stroke-linejoin="round"/>
${simple ? "" : `<path d="${m.wavePath}" fill="none" stroke="${m.wave}" stroke-width="${m.waveWidth}" stroke-linecap="round"/>`}</svg>`;
};

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const tab = await browser.newPage();
const images = [];
for (const size of [16, 32, 48]) {
  await tab.setViewport({ width: size, height: size });
  await tab.setContent(`<body style="margin:0;background:transparent">${svg(size)}</body>`);
  images.push({ size, png: await tab.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }) });
}
await browser.close();

// ICONDIR + one ICONDIRENTRY per image, then the PNG payloads
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach(({ size, png }, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(size, e);
  header.writeUInt8(size, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync(path.join(root, "app/favicon.ico"), Buffer.concat([header, ...images.map((i) => i.png)]));
console.log("wrote app/favicon.ico");
