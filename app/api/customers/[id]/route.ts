import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { CustomerDatabaseService } from "@/lib/database/customers";
import { UserDatabaseService } from "@/lib/database/users";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenUser = getUserFromRequest(request);
    if (!tokenUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use businessId directly from JWT token (already verified)
    if (!tokenUser.businessId) {
      console.error(
        `[CUSTOMER-GET] User ${tokenUser.email} has no businessId in token`
      );
      return NextResponse.json(
        { error: "İş yeri bilgisi bulunamadı" },
        { status: 400 }
      );
    }

    const { id } = await params;

    console.log(
      `[CUSTOMER-GET] Getting customer ${id} for businessId: ${tokenUser.businessId} by user ${tokenUser.email}`
    );

    // Find customer by ID using the database service
    const customer = await CustomerDatabaseService.getCustomerById(
      id,
      tokenUser.businessId
    );

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Get customer error:", error);
    if (error instanceof Error && error.message === "Customer not found") {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenUser = getUserFromRequest(request);
    if (!tokenUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use businessId directly from JWT token (already verified)
    if (!tokenUser.businessId) {
      console.error(
        `[CUSTOMER-PUT] User ${tokenUser.email} has no businessId in token`
      );
      return NextResponse.json(
        { error: "İş yeri bilgisi bulunamadı" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      whatsapp,
      address,
      city,
      district,
      isActive,
    } = body;

    console.log(
      `[CUSTOMER-PUT] Updating customer ${id} for businessId: ${tokenUser.businessId} by user ${tokenUser.email}`
    );

    // Update customer using the database service
    const updatedCustomer = await CustomerDatabaseService.updateCustomer(
      id,
      tokenUser.businessId,
      {
        firstName,
        lastName,
        email,
        phone,
        whatsapp,
        address,
        city,
        district,
        isActive,
      }
    );

    return NextResponse.json({
      message: "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    if (error instanceof Error && error.message === "Customer not found") {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenUser = getUserFromRequest(request);
    if (!tokenUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use businessId directly from JWT token (already verified)
    if (!tokenUser.businessId) {
      console.error(
        `[CUSTOMER-DELETE] User ${tokenUser.email} has no businessId in token`
      );
      return NextResponse.json(
        { error: "İş yeri bilgisi bulunamadı" },
        { status: 400 }
      );
    }

    const { id } = await params;

    console.log(
      `[CUSTOMER-DELETE] Deleting customer ${id} for businessId: ${tokenUser.businessId} by user ${tokenUser.email}`
    );

    // Delete customer using the database service
    const result = await CustomerDatabaseService.deleteCustomer(
      id,
      tokenUser.businessId
    );

    return NextResponse.json({
      message: "Customer deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    if (error instanceof Error && error.message === "Customer not found") {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
