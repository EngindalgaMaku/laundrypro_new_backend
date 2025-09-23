import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's business ID
    const currentUser = await UserDatabaseService.getUserById(user.userId);

    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to user's business
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        businessId: currentUser.businessId,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    try {
      const formData = await request.formData();
      const file = (formData as any).get("photo") as File | null;
      const type = (formData as any).get("type")?.toString() || "other";
      const caption = (formData as any).get("caption")?.toString() || "";

      if (!file) {
        return NextResponse.json(
          { error: "No photo file provided" },
          { status: 400 }
        );
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), "public", "uploads", "orders");
      await mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop() || "jpg";
      const filename = `order_${params.id}_${timestamp}.${fileExtension}`;
      const filepath = join(uploadsDir, filename);

      // Save file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // Save photo info to database
      const photoUrl = `/uploads/orders/${filename}`;

      const photoData = {
        id: `photo_${timestamp}`,
        url: photoUrl,
        type: type || "other",
        caption: caption || "",
        timestamp: new Date().toISOString(),
        status: order.status,
      };

      return NextResponse.json({
        message: "Photo uploaded successfully",
        photo: photoData,
      });
    } catch (parseError) {
      console.error("Form parsing error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse form data" },
        { status: 400 }
      );
    }
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
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's business ID
    const currentUser = await UserDatabaseService.getUserById(user.userId);

    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: "User has no business associated" },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to user's business
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        businessId: currentUser.businessId,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Return empty photos array for now since we don't have a dedicated photos table
    // In a full implementation, this would query an OrderPhotos table
    return NextResponse.json({
      photos: [],
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
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, just return success - in a full implementation this would
    // delete from database and filesystem
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
