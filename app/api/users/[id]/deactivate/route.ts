import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { UserDatabaseService } from "@/lib/database/users";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Deactivate the user
    const updatedUser = await UserDatabaseService.updateUser(id, {
      isActive: false,
    });

    return NextResponse.json({
      message: "User deactivated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
