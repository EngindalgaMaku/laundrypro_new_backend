import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { anonymizeUser, deleteBusinessCompletely } from "@/lib/account-deletion";
import { createRateLimiter } from "@/lib/password-reset";

// Password checks per account; stops guessing through this endpoint
const allowAttempt = createRateLimiter(5, 60 * 60 * 1000);

/**
 * POST /api/auth/delete-account  { password }
 * Owner: deletes the business with all of its data. Other staff: removes their personal data.
 */
export async function POST(request: NextRequest) {
  const tokenUser = getUserFromRequest(request);
  if (!tokenUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!allowAttempt(tokenUser.userId)) {
    return NextResponse.json(
      { error: "Çok fazla deneme. Lütfen bir saat sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const { password } = await request.json().catch(() => ({}));
  const user = await prisma.user.findUnique({
    where: { id: tokenUser.userId },
    select: { id: true, role: true, businessId: true, passwordHash: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Hesap bulunamadı" }, { status: 404 });
  }
  if (typeof password !== "string" || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Şifre hatalı" }, { status: 403 });
  }

  try {
    if (user.role === "OWNER" && user.businessId) {
      await deleteBusinessCompletely(user.businessId);
    } else {
      await anonymizeUser(user.id);
    }
  } catch (error) {
    console.error("Account deletion failed:", error);
    return NextResponse.json(
      { error: "Hesap silinemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin." },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true, scope: user.role === "OWNER" ? "business" : "user" });
}
