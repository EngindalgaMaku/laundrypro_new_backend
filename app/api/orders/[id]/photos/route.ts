import { NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  addOrderPhoto,
  deleteOrderPhoto,
  listOrderPhotos,
} from "@/lib/storage/order-photos";
import { findOwnedOrder } from "./owned-order";

export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const order = await findOwnedOrder(request, params.id);
    if (order instanceof NextResponse) return order;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error("Form parsing error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse form data" },
        { status: 400 }
      );
    }

    const file = formData.get("photo");
    const type = formData.get("type")?.toString() || "other";
    const caption = formData.get("caption")?.toString() || "";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No photo file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "Fotoğraf boyutu en fazla 10 MB olabilir" },
        { status: 400 }
      );
    }

    const extension = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_PHOTO_TYPES[extension] || (file.type && !file.type.startsWith("image/"))) {
      return NextResponse.json(
        { error: "Yalnızca geçerli görsel dosyaları (JPG, PNG, WEBP, HEIC) yüklenebilir" },
        { status: 400 }
      );
    }

    const photo = await addOrderPhoto(
      order.id,
      Buffer.from(await file.arrayBuffer()),
      extension,
      { type, caption, status: order.status }
    );

    return NextResponse.json({
      message: "Photo uploaded successfully",
      photo,
    });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const order = await findOwnedOrder(request, params.id);
    if (order instanceof NextResponse) return order;

    return NextResponse.json({
      photos: await listOrderPhotos(order.id),
    });
  } catch (error) {
    console.error("Get photos error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete photo endpoint
export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const order = await findOwnedOrder(request, params.id);
    if (order instanceof NextResponse) return order;

    let photoId = new URL(request.url).searchParams.get("photoId");
    if (!photoId) {
      const body = await request.json().catch(() => ({}));
      photoId = body.photoId || body.id;
    }

    if (!photoId) {
      return NextResponse.json(
        { error: "Photo ID is required" },
        { status: 400 }
      );
    }

    if (!(await deleteOrderPhoto(order.id, photoId))) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Photo deleted successfully",
    });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
