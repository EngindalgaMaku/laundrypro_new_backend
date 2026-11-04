import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

// The public demo. DEMO_MODE=true creates a separate demo business and offers its accounts on the
// sign-in page; without it none of this exists. Other businesses are never touched.

export const isDemoMode = () => process.env.DEMO_MODE === "true";

// Published on the sign-in page, so these accounts must only ever hold made-up data
export const DEMO_PASSWORD = "12345678";
export const DEMO_ACCOUNTS = [
  { label: "İşletme sahibi", email: "demo@laundrypro.com" },
  { label: "Çalışan", email: "demo-calisan@laundrypro.com" },
  { label: "Şoför", email: "demo-sofor@laundrypro.com" },
];

export const DEMO_MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const DEMO_PHOTOS_PER_ORDER = 5;

export const DEMO_LOCKED = "Demo hesapta bu işlem kapalı. Denemek için kendi işletmenizi kaydedebilirsiniz.";

export async function isDemoBusiness(businessId?: string | null) {
  if (!businessId) return false;
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { isDemo: true } });
  return business?.isDemo === true;
}

/**
 * The answer for anything that would lock the next visitor out or reach real people: passwords,
 * staff, business details, deleting the account, sending messages. Null when the caller is not demo.
 */
export async function demoLockResponse(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!(await isDemoBusiness(user?.businessId))) return null;
  return NextResponse.json({ error: DEMO_LOCKED, code: "DEMO_LOCKED" }, { status: 403 });
}
