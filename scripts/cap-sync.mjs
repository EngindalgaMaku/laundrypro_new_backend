// Usage: CAP_SERVER_URL=https://app.example.com npm run cap:sync
// Builds capacitor/www (offline page with the server URL inlined), then syncs the Android project.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const serverUrl = process.env.CAP_SERVER_URL || "http://10.0.2.2:3000";

const template = readFileSync(new URL("../capacitor/offline.html", import.meta.url), "utf8");
const page = template.replace("__SERVER_URL__", serverUrl.replace(/["\\<>]/g, ""));

const www = new URL("../capacitor/www/", import.meta.url);
mkdirSync(www, { recursive: true });
// index.html is required by Capacitor but only shown if the remote site cannot load
writeFileSync(new URL("index.html", www), page);
writeFileSync(new URL("offline.html", www), page);

console.log(`Capacitor server URL: ${serverUrl}`);
execSync("npx cap sync android", { stdio: "inherit" });
