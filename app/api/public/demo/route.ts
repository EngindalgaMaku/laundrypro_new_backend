import { NextResponse } from "next/server";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, isDemoMode } from "@/lib/demo";

/** What the sign-in page offers; nothing at all unless the server runs the public demo */
export async function GET() {
  if (!isDemoMode()) return NextResponse.json({ enabled: false, accounts: [] });
  return NextResponse.json({
    enabled: true,
    accounts: DEMO_ACCOUNTS.map((account) => ({ ...account, password: DEMO_PASSWORD })),
  });
}
