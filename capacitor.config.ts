import type { CapacitorConfig } from "@capacitor/cli";

// The Android app loads the deployed Next.js site; API routes cannot be bundled.
// Run `npm run cap:sync` with CAP_SERVER_URL set to the production URL before a release build.
// The default points the Android emulator at the local dev server (localhost:3000 on the host).
const serverUrl = process.env.CAP_SERVER_URL || "https://laundry.kodleon.com";

const config: CapacitorConfig = {
  appId: "com.engindalga.laundrypro",
  appName: "LaundryPro",
  webDir: "capacitor/www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    errorPath: "offline.html",
  },
  plugins: {
    // The site hides the splash once it loads; the timeout covers pages that never do
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 3000,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
  },
};

export default config;
