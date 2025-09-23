import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Geçerli bir mesaj girin" }, { status: 400 });
    }

    // Store feedback in CommunicationLog with type FEEDBACK
    const log = await prisma.communicationLog.create({
      data: {
        customerId: "", // not linked to a specific customer
        orderId: null,
        type: "FEEDBACK",
        direction: "INCOMING",
        content: message,
        status: "RECEIVED",
        sentBy: user.userId,
      },
    });

    return NextResponse.json({ success: true, id: log.id });
  } catch (error: any) {
    console.error("Feedback API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
