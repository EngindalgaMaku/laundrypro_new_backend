import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth";



import { prisma } from "@/lib/db";
async function assertIsAdmin(request: NextRequest) {
  const token = getUserFromRequest(request);
  if (!token) throw new Error("UNAUTHORIZED");
  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user) throw new Error("UNAUTHORIZED");
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const isAdmin = user.role === "OWNER" || (user.email && adminEmails.includes(user.email));
  if (!isAdmin) throw new Error("FORBIDDEN");
  return user;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await assertIsAdmin(request);
    const id = params.id;
    const { content } = await request.json();
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    // ensure feedback exists
    const fb = await prisma.communicationLog.findUnique({ where: { id } });
    if (!fb) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const note = await prisma.communicationLog.create({
      data: {
        type: 'FEEDBACK_NOTE',
        direction: 'INTERNAL',
        content: content.trim(),
        status: 'RECEIVED',
        orderId: id, // link to parent feedback via orderId
        sentBy: admin.id,
        customerId: "",
      },
      select: { id: true, content: true, createdAt: true, sentBy: true },
    });

    return NextResponse.json({ success: true, note });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error('Admin feedback note POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await assertIsAdmin(request);
    const id = params.id;
    const feedback = await prisma.communicationLog.findUnique({
      where: { id },
      select: { id: true, content: true, status: true, createdAt: true, sentBy: true },
    });
    if (!feedback || feedback === null) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Notes are stored as additional CommunicationLog rows with type FEEDBACK_NOTE and orderId = parent feedback id
    const notes = await prisma.communicationLog.findMany({
      where: { type: "FEEDBACK_NOTE", orderId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, content: true, createdAt: true, sentBy: true },
    });
    return NextResponse.json({ success: true, item: feedback, notes });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin feedback GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }}
