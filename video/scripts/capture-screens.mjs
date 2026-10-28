// Phone-size screenshots of the running app (npm run dev in the repo root) for the promo.
// Uses the installed Chrome via puppeteer-core; signs in with the local seed account.
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.APP_URL || "http://localhost:3000";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const EMAIL = process.env.APP_EMAIL || "owner@laundrypro.com";
const PASSWORD = process.env.APP_PASSWORD || "test123";
const OUT = process.env.OUT_DIR || path.join(import.meta.dirname, "..", "public", "screens");
// FORMAT=webp writes compressed images (used for the in-app introduction)
const FORMAT = process.env.FORMAT === "webp" ? "webp" : "png";

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

// Hide the Next.js dev badge and the scrollbar in every capture
const hideChrome = () =>
  page.addStyleTag({ content: "nextjs-portal{display:none!important} ::-webkit-scrollbar{display:none}" });
const settle = (ms = 1500) => new Promise((r) => setTimeout(r, ms));

await page.goto(BASE, { waitUntil: "networkidle2" });
const session = await page.evaluate(async (email, password) => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  const orders = await fetch("/api/orders?limit=20", { headers: { Authorization: `Bearer ${data.token}` } }).then((r) => r.json());
  const list = orders.orders || orders.data || orders;
  // The richest order for the receipt: most items, then highest amount
  const first = list[0];
  const detail = await fetch(`/api/orders/${first.id}`, { headers: { Authorization: `Bearer ${data.token}` } }).then((r) => r.json());
  return { orderId: first.id, trackingToken: (detail.order || detail).trackingToken };
}, EMAIL, PASSWORD);

async function shot(url, file, before) {
  await page.goto(BASE + url, { waitUntil: "networkidle2" });
  await hideChrome();
  await settle();
  if (before) await before();
  const name = file.replace(/.png$/, "." + FORMAT);
  await page.screenshot({ path: path.join(OUT, name), type: FORMAT, ...(FORMAT === "webp" && { quality: 82 }) });
  console.log("saved", name);
}

await shot("/dashboard", "dashboard.png");
await shot("/orders", "orders.png");
await shot(`/orders/${session.orderId}`, "receipt.png", async () => {
  const [button] = await page.$$("xpath/.//button[contains(., 'Fiş / Etiket')]");
  await button.click();
  await settle(1200);
});
// The search box shows the random tracking code; leave it empty in the promo
await shot(`/takip/${encodeURIComponent(session.trackingToken)}`, "tracking.png", () =>
  page.evaluate(() => {
    const input = document.querySelector("input");
    if (input) input.value = "";
  })
);

await browser.close();
