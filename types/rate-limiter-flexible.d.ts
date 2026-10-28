// lib/whatsapp-service.ts imports the memory limiter from its own file: the package
// entry pulls in optional adapters (e.g. Drizzle) that the build cannot resolve.
declare module "rate-limiter-flexible/lib/RateLimiterMemory" {
  import { RateLimiterMemory } from "rate-limiter-flexible";
  export default RateLimiterMemory;
}
