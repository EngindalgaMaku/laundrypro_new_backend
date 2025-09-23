import { NextRequest, NextResponse } from "next/server";
import { UserDatabaseService } from "@/lib/database/users";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'mackaengin@gmail.com';
    
    console.log(`[DEBUG] Checking user: ${email}`);
    
    // Get all users
    const allUsers = await UserDatabaseService.getUsers({}, 10, 0);
    
    // Check specific user
    const specificUser = allUsers.users.find(u => u.email === email);
    
    return NextResponse.json({
      debug: {
        searchEmail: email,
        totalUsers: allUsers.total,
        userFound: !!specificUser,
        specificUser: specificUser ? {
          id: specificUser.id,
          email: specificUser.email,
          firstName: specificUser.firstName,
          lastName: specificUser.lastName,
          isActive: specificUser.isActive,
          businessId: specificUser.businessId
        } : null,
        allUsers: allUsers.users.map(u => ({
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          isActive: u.isActive
        })),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Check user error:", error);
    return NextResponse.json(
      { 
        error: "Check user failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
