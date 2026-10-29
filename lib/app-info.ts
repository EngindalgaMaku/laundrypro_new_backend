// Version shown on /hakkinda. Raise with each release; the Android app reports its own
// versionName/versionCode (android/app/build.gradle) next to it.
export const APP_VERSION = "1.0.1";

// Support channels on /destek. An empty value hides that row; e-mail falls back to the
// contact address on the legal pages (lib/legal.ts).
export const SUPPORT = {
  phone: "", // e.g. "0532 123 45 67"
  whatsapp: "", // e.g. "0532 123 45 67"
  hours: "", // e.g. "Hafta içi 09.00–18.00"
} as const;
