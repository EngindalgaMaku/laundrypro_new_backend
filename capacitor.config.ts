import type { CapacitorConfig } from "@capacitor/cli";

// The Android app loads the deployed Next.js site; API routes cannot be bundled.
// The default is the production site; for the emulator against a local dev server run
// `CAP_SERVER_URL=http://10.0.2.2:3000 npm run cap:sync`.
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
      launchShowDuration: 2000,
      backgroundColor: "#0A5C99",
      showSpinner: false,
    },
  },
};

export default config;
