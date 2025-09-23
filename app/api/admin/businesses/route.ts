import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

async function assertIsAdmin(request: NextRequest) {
  const token = getUserFromRequest(request);
  if (!token) throw new Error("UNAUTHORIZED");
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) throw new Error("UNAUTHORIZED");
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const isAdmin = !!(user.email && adminEmails.includes(user.email));
  if (!isAdmin) throw new Error("FORBIDDEN");
  return user;
}

export async function GET(request: NextRequest) {
  try {
    await assertIsAdmin(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.business.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          district: true,
          isActive: true,
          createdAt: true,
          users: { select: { id: true } },
        },
      }),
      prisma.business.count({ where }),
    ]);

    return NextResponse.json({ success: true, items, total, page, limit });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin businesses GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
