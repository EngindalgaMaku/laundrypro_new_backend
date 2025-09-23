import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { CustomerDatabaseService } from "@/lib/database/customers";
import { UserDatabaseService } from "@/lib/database/users";

export async function GET(request: NextRequest) {
  try {
    const tokenUser = getUserFromRequest(request);
    if (!tokenUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use businessId directly from JWT token (already verified)
    if (!tokenUser.businessId) {
      console.error(
        `[CUSTOMERS-GET] User ${tokenUser.email} has no businessId in token`
      );
      return NextResponse.json(
        { error: "İş yeri bilgisi bulunamadı" },
        { status: 400 }
      );
    }

    console.log(
      `[CUSTOMERS-GET] Using businessId from token: ${tokenUser.businessId} for user ${tokenUser.email}`
    );

    // Parse URL query parameters for search functionality
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || undefined;
    const sortByParam = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder =
      (url.searchParams.get("sortOrder") as "asc" | "desc") || "desc";
    const activeOnly = url.searchParams.get("activeOnly") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Map mobile app sortBy values to database fields
    let sortBy: "createdAt" | "firstName" | "lastName" | "city";
    switch (sortByParam) {
      case "name":
        sortBy = "firstName"; // Mobile sends "name" but DB uses "firstName"
        break;
      case "lastOrderDate":
        sortBy = "createdAt"; // Use createdAt as fallback for lastOrderDate
        break;
      case "totalSpent":
        sortBy = "createdAt"; // Use createdAt as fallback for totalSpent
        break;
      case "firstName":
      case "lastName":
      case "city":
        sortBy = sortByParam;
        break;
      default:
        sortBy = "createdAt";
        break;
    }

    console.log(`[CUSTOMERS-GET] Search params:`, {
      search,
      sortByParam,
      sortBy,
      sortOrder,
      activeOnly,
      limit,
      offset,
    });

    // Build filters for database service
    const filters = {
      businessId: tokenUser.businessId,
      search,
      sortBy,
      sortOrder,
      isActive: activeOnly ? true : undefined, // Only filter active if explicitly requested
    };

    // Get customers using the database service with filters
    const { customers, total } = await CustomerDatabaseService.getCustomers(
      filters,
      limit,
      offset
    );

    console.log(
      `[CUSTOMERS-GET] Found ${customers.length} customers (total: ${total})`
    );

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Get customers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenUser = getUserFromRequest(request);
    if (!tokenUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use businessId directly from JWT token (already verified)
    if (!tokenUser.businessId) {
      console.error(
        `[CUSTOMERS-POST] User ${tokenUser.email} has no businessId in token`
      );
      return NextResponse.json(
        { error: "İş yeri bilgisi bulunamadı" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      district,
      whatsapp,
    } = body;

    if (!firstName || !phone) {
      return NextResponse.json(
        { error: "First name and phone are required" },
        { status: 400 }
      );
    }

    console.log(
      `[CUSTOMERS-POST] Creating customer for businessId: ${tokenUser.businessId} by user ${tokenUser.email}`
    );

    // Create customer using the database service
    const customer = await CustomerDatabaseService.createCustomer({
      businessId: tokenUser.businessId,
      firstName,
      lastName,
      phone,
      email,
      whatsapp: whatsapp || phone,
      address,
      city,
      district,
      customerType: "individual",
    });

    return NextResponse.json({
      message: "Customer created successfully",
      customer,
    });
  } catch (error: any) {
    console.error("Create customer error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      {
        status:
          error.message === "Customer with this phone number already exists"
            ? 400
            : 500,
      }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tokenUser = getUserFromRequest(request);
    if (!tokenUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use businessId directly from JWT token (already verified)
    if (!tokenUser.businessId) {
      console.error(
        `[CUSTOMERS-DELETE] User ${tokenUser.email} has no businessId in token`
      );
      return NextResponse.json(
        { error: "İş yeri bilgisi bulunamadı" },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const customerId = url.searchParams.get("id");

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 }
      );
    }

    console.log(
      `[CUSTOMERS-DELETE] Deleting customer ${customerId} for businessId: ${tokenUser.businessId} by user ${tokenUser.email}`
    );

    // Delete customer using the database service
    const result = await CustomerDatabaseService.deleteCustomer(
      customerId,
      tokenUser.businessId
    );

    return NextResponse.json({
      message: "Customer deleted successfully",
      result,
    });
  } catch (error: any) {
    console.error("Delete customer error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
