import { NextRequest, NextResponse } from "next/server";
import { readOrderPhoto } from "@/lib/storage/order-photos";
import { findOwnedOrder } from "../owned-order";

// Photo bytes, for signed-in staff of the order's business (fetch with the Bearer token)
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string; photoId: string }> }
) {
  const params = await paramsPromise;
  try {
    const order = await findOwnedOrder(request, params.id);
    if (order instanceof NextResponse) return order;

    const photo = await readOrderPhoto(order.id, params.photoId);
    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(photo.data), {
      headers: {
        "Content-Type": photo.contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Get photo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
