import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  clientIp,
  createRateLimiter,
  hashResetToken,
} from "@/lib/password-reset";

const ipAllowed = createRateLimiter(10, 15 * 60 * 1000);

const INVALID_LINK = "Bağlantı geçersiz ya da süresi dolmuş. Yeni bir sıfırlama bağlantısı isteyin.";

export async function POST(request: NextRequest) {
  if (!ipAllowed(clientIp(request))) {
    return NextResponse.json(
      { error: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.` },
      { status: 400 }
    );
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, updatedAt: new Date() },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
    // Sign out other devices
    prisma.userSession.updateMany({
      where: { userId: record.userId, isActive: true },
      data: { isActive: false },
    }),
  ]);

  return NextResponse.json({ message: "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz." });
}
