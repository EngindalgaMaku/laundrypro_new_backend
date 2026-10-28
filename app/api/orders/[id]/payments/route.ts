import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { prisma } from "@/lib/db";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

const VALID_METHODS: PaymentMethod[] = [
  "CASH",
  "CREDIT_CARD",
  "BANK_TRANSFER",
  "MOBILE_PAYMENT",
];

function computeOrderPaymentSummary(
  totalAmount: number,
  orderPaymentStatus: PaymentStatus,
  payments: Array<{ amount: any; status: PaymentStatus }>
) {
  const recordedPaid = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Legacy orders marked PAID before individual payment rows existed
  const paidAmount =
    payments.length === 0 && orderPaymentStatus === "PAID"
      ? totalAmount
      : Number(recordedPaid.toFixed(2));

  const remainingAmount = Number(Math.max(0, totalAmount - paidAmount).toFixed(2));

  let derivedStatus: PaymentStatus = "PENDING";
  if (totalAmount > 0 && paidAmount >= totalAmount - 0.01) {
    derivedStatus = "PAID";
  } else if (paidAmount > 0) {
    derivedStatus = "PARTIAL";
  }

  return { paidAmount, remainingAmount, paymentStatus: derivedStatus };
}

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await UserDatabaseService.getUserById(user.userId);
    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        businessId: currentUser.businessId,
      },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const totalAmount = Number(order.totalAmount || 0);
    const summary = computeOrderPaymentSummary(
      totalAmount,
      order.paymentStatus,
      order.payments
    );

    return NextResponse.json({
      orderId: order.id,
      totalAmount,
      ...summary,
      payments: order.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        status: p.status,
        notes: p.notes,
        paidAt: p.paidAt?.toISOString() || p.createdAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[ORDER-PAYMENTS-GET] Error:", error);
    return NextResponse.json(
      { error: "Tahsilat bilgileri yüklenemedi" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await UserDatabaseService.getUserById(user.userId);
    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        businessId: currentUser.businessId,
      },
      include: {
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await request.json();
    const rawAmount = Number(String(body.amount ?? "").replace(",", "."));
    const paymentMethod: PaymentMethod = VALID_METHODS.includes(body.paymentMethod)
      ? body.paymentMethod
      : "CASH";
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return NextResponse.json(
        { error: "Geçerli bir tahsilat tutarı girin" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: rawAmount,
        paymentMethod,
        status: "PAID",
        notes,
        paidAt: new Date(),
      },
    });

    const allPayments = [...order.payments, payment];
    const totalAmount = Number(order.totalAmount || 0);
    const summary = computeOrderPaymentSummary(
      totalAmount,
      order.paymentStatus,
      allPayments
    );

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: summary.paymentStatus,
        paymentMethod,
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        notes: payment.notes,
        paidAt: payment.paidAt?.toISOString() || payment.createdAt.toISOString(),
        createdAt: payment.createdAt.toISOString(),
      },
      totalAmount,
      ...summary,
    });
  } catch (error) {
    console.error("[ORDER-PAYMENTS-POST] Error:", error);
    return NextResponse.json(
      { error: "Tahsilat kaydedilemedi" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await UserDatabaseService.getUserById(user.userId);
    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    if (!paymentId) {
      return NextResponse.json(
        { error: "Silinecek tahsilat seçilmedi" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        businessId: currentUser.businessId,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await prisma.payment.deleteMany({
      where: {
        id: paymentId,
        orderId: order.id,
      },
    });

    const remainingPayments = await prisma.payment.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });

    const totalAmount = Number(order.totalAmount || 0);
    const summary = computeOrderPaymentSummary(
      totalAmount,
      "PENDING",
      remainingPayments
    );

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: summary.paymentStatus,
      },
    });

    return NextResponse.json({
      success: true,
      totalAmount,
      ...summary,
    });
  } catch (error) {
    console.error("[ORDER-PAYMENTS-DELETE] Error:", error);
    return NextResponse.json(
      { error: "Tahsilat silinemedi" },
      { status: 500 }
    );
  }
}
