import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientIp, createRateLimiter } from "@/lib/password-reset";

// Tokens are unguessable; the limit only slows down scripted probing
const allowLookup = createRateLimiter(30, 60_000);
const NO_INDEX = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };

/** "Ayşe Yıldız" → "Ayşe Y."; works when the whole name sits in firstName too */
function maskCustomerName(firstName?: string | null, lastName?: string | null): string {
  const words = `${firstName || ""} ${lastName || ""}`.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Değerli Müşterimiz";
  if (words.length === 1) return words[0];
  const last = words.pop()!;
  return `${words.join(" ")} ${last.charAt(0).toLocaleUpperCase("tr")}.`;
}

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ code: string }> }
) {
  const { code } = await paramsPromise;
  const cleanCode = decodeURIComponent(code || "").trim();

  if (!allowLookup(clientIp(request))) {
    return NextResponse.json(
      { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." },
      { status: 429, headers: NO_INDEX }
    );
  }

  // Only the random tracking token opens an order: order numbers are sequential-looking and guessable
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(cleanCode)) {
    return NextResponse.json(
      { error: "Sipariş bulunamadı" },
      { status: 404, headers: NO_INDEX }
    );
  }

  try {
    const order = await prisma.order.findUnique({
      where: { trackingToken: cleanCode },
      include: {
        business: {
          select: {
            name: true,
            phone: true,
            city: true,
            district: true,
            address: true,
          },
        },
        customer: {
          select: {
            firstName: true,
            lastName: true,
            district: true,
            city: true,
          },
        },
        orderItems: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          select: {
            status: true,
            createdAt: true,
          },
        },
        payments: {
          where: { status: "PAID" },
          select: {
            amount: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı" },
        { status: 404, headers: NO_INDEX }
      );
    }

    const totalAmount = Number(order.totalAmount || 0);
    const recordedPaid = (order.payments || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    const paidAmount =
      (order.payments || []).length === 0 && order.paymentStatus === "PAID"
        ? totalAmount
        : Number(recordedPaid.toFixed(2));
    const remainingAmount = Number(
      Math.max(0, totalAmount - paidAmount).toFixed(2)
    );

    const publicData = {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      pickupDate: order.pickupDate,
      deliveryDate: order.deliveryDate,
      totalAmount,
      paidAmount,
      remainingAmount,
      business: {
        name: order.business?.name || "İşletme",
        phone: order.business?.phone || null,
        location:
          [order.business?.district, order.business?.city]
            .filter(Boolean)
            .join(", ") || null,
      },
      customer: {
        maskedName: maskCustomerName(
          order.customer?.firstName,
          order.customer?.lastName
        ),
        region:
          [order.customer?.district, order.customer?.city]
            .filter(Boolean)
            .join(", ") || null,
      },
      items: (order.orderItems || []).map((item) => ({
        name: item.serviceName || item.service?.name || "Hizmet",
        quantity: Number(item.quantity || 1),
        totalPrice: Number(item.totalPrice || 0),
      })),
      statusHistory: (order.statusHistory || []).map((h) => ({
        // Staff notes are internal and stay out of the public view
        status: h.status,
        timestamp: h.createdAt,
      })),
    };

    return NextResponse.json(publicData, { headers: NO_INDEX });
  } catch (error) {
    console.error("Public order tracking error:", error);
    return NextResponse.json(
      { error: "Sipariş bilgisi alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
