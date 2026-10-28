import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientIp, createRateLimiter } from "@/lib/password-reset";

// Tokens are unguessable; the limit only slows down scripted probing
const allowLookup = createRateLimiter(30, 60_000);
const NO_INDEX = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };

function maskCustomerName(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName || "").trim();
  const last = (lastName || "").trim();
  if (!first && !last) return "Değerli Müşterimiz";
  if (!last) return first;
  return `${first} ${last.charAt(0).toUpperCase()}.`;
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
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı" },
        { status: 404, headers: NO_INDEX }
      );
    }

    const publicData = {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      pickupDate: order.pickupDate,
      deliveryDate: order.deliveryDate,
      totalAmount: Number(order.totalAmount || 0),
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
