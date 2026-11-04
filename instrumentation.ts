// Runs once when the server starts. Only the public demo needs it: DEMO_MODE=true
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DEMO_MODE === "true") {
    try {
      const { startDemoResets } = await import("@/lib/demo-workshop");
      await startDemoResets();
    } catch (error) {
      console.error("[demo] başlatılamadı", error);
    }
  }
}
