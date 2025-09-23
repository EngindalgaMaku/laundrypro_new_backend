import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

async function assertIsAdmin(request: NextRequest) {
  const token = getUserFromRequest(request);
  if (!token) throw new Error("UNAUTHORIZED");
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) throw new Error("UNAUTHORIZED");
  // Treat OWNER as admin; optionally allow env ADMIN_EMAILS
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const isAdmin = !!(user.email && adminEmails.includes(user.email));
  if (!isAdmin) throw new Error("FORBIDDEN");
  return user;
}

export async function GET(request: NextRequest) {
  try {
    await assertIsAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // RECEIVED | RESOLVED | any
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
    const skip = (page - 1) * limit;

    const where: any = { type: "FEEDBACK" };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.communicationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
          sentBy: true,
        },
      }),
      prisma.communicationLog.count({ where }),
    ]);

    return NextResponse.json({ success: true, items, total, page, limit });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin feedbacks GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await assertIsAdmin(request);
    const body = await request.json();
    const { id, status } = body; // status: RESOLVED | RECEIVED

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    const updated = await prisma.communicationLog.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin feedbacks PATCH error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
