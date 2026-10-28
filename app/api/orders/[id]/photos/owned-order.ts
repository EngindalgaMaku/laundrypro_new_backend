import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

/** The order if it belongs to the caller's business, otherwise the error response to return */
export async function findOwnedOrder(request: NextRequest, orderId: string) {
  const auth = await requireBusinessAuth(request);
  if (auth instanceof NextResponse) return auth;

  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId: auth.businessId },
    select: { id: true, status: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return order;
}
