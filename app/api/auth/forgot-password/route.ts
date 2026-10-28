import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import {
  RESET_TOKEN_TTL_MS,
  appBaseUrl,
  clientIp,
  createRateLimiter,
  createResetToken,
} from "@/lib/password-reset";

// Same answer whether or not the address is registered, so the form cannot be
// used to find out which emails have accounts
const GENERIC_MESSAGE =
  "Bu e-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi.";

const ipAllowed = createRateLimiter(10, 60 * 60 * 1000);
const emailAllowed = createRateLimiter(3, 60 * 60 * 1000);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Geçerli bir e-posta adresi girin." },
      { status: 400 }
    );
  }

  if (!ipAllowed(clientIp(request)) || !emailAllowed(email.toLowerCase())) {
    return NextResponse.json(
      { error: "Çok fazla deneme yapıldı. Lütfen bir saat sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isActive) {
      const baseUrl = appBaseUrl(request);
      if (!baseUrl) {
        console.error("[FORGOT-PASSWORD] NEXT_PUBLIC_APP_URL is not set; reset link not sent");
        return NextResponse.json({ message: GENERIC_MESSAGE });
      }

      const { token, tokenHash } = createResetToken();
      // Only the newest link works
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const link = `${baseUrl}/sifre-sifirla?token=${token}`;
      await sendMail({
        to: user.email,
        subject: "LaundryPro şifre sıfırlama",
        text:
          `Merhaba ${user.firstName},\n\n` +
          `LaundryPro hesabınız için şifre sıfırlama isteği aldık. Yeni şifrenizi belirlemek için bağlantıyı açın:\n\n` +
          `${link}\n\n` +
          `Bağlantı 1 saat geçerlidir ve bir kez kullanılabilir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz; şifreniz değişmez.`,
        html:
          `<p>Merhaba ${escapeHtml(user.firstName)},</p>` +
          `<p>LaundryPro hesabınız için şifre sıfırlama isteği aldık. Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı açın:</p>` +
          `<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#0A5C99;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600">Şifremi sıfırla</a></p>` +
          `<p style="color:#5B6B78;font-size:14px">Bağlantı 1 saat geçerlidir ve bir kez kullanılabilir. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz; şifreniz değişmez.</p>`,
      });
    }
  } catch (error) {
    // Logged, but the caller still gets the generic answer
    console.error("[FORGOT-PASSWORD] Failed to issue reset link:", error);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
