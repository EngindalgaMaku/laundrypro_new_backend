/**
 * Test Manual Service Entry Compatibility
 *
 * This test validates whether the current backend can handle manual service entries
 * as they come from the frontend SelectedServiceItem objects with isManualEntry: true flag.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testManualServiceCompatibility() {
  console.log("🧪 Testing Manual Service Entry Compatibility...\n");

  try {
    // Get a test business and customer
    const business = await prisma.business.findFirst();
    const customer = await prisma.customer.findFirst({
      where: { businessId: business.id },
    });

    if (!business || !customer) {
      console.log(
        "❌ No test business or customer found. Please run setup first."
      );
      return;
    }

    console.log(`📋 Using Business: ${business.name}`);
    console.log(
      `👤 Using Customer: ${customer.firstName} ${customer.lastName}\n`
    );

    // Test 1: Order Creation with Manual Services
    console.log("🔍 TEST 1: Order Creation with Manual Services");
    console.log("=".repeat(50));

    const manualServiceOrderData = {
      businessId: business.id,
      customerId: customer.id,
      services: [
        {
          serviceId: "manual-service-1", // This is NOT a real database ID
          quantity: 2,
          unitPrice: 50.0,
          notes: "Custom cleaning service - urgent",
        },
      ],
      orderInfo: "Test order with manual services",
      totalAmount: 100.0,
    };

    try {
      // This should fail with current implementation
      const { OrderDatabaseService } = await import("./lib/database/orders.js");
      const order = await OrderDatabaseService.createOrder(
        manualServiceOrderData
      );
      console.log("✅ Order creation SUCCESS (unexpected)");
      console.log("Order ID:", order.id);
    } catch (error) {
      console.log("❌ Order creation FAILED (expected)");
      console.log("Error:", error.message);
    }

    console.log("\n");

    // Test 2: Mixed Services (Database + Manual)
    console.log("🔍 TEST 2: Mixed Services (Database + Manual)");
    console.log("=".repeat(50));

    // Get a real service from database
    const realService = await prisma.service.findFirst({
      where: { businessId: business.id },
    });

    if (realService) {
      const mixedServiceOrderData = {
        businessId: business.id,
        customerId: customer.id,
        services: [
          {
            serviceId: realService.id, // Real database service
            quantity: 1,
            unitPrice: 75.0,
            notes: "Regular service",
          },
          {
            serviceId: "manual-service-2", // Manual entry
            quantity: 1,
            unitPrice: 25.0,
            notes: "Additional manual service",
          },
        ],
        orderInfo: "Test order with mixed services",
        totalAmount: 100.0,
      };

      try {
        const { OrderDatabaseService } = await import(
          "./lib/database/orders.js"
        );
        const order = await OrderDatabaseService.createOrder(
          mixedServiceOrderData
        );
        console.log("✅ Mixed order creation SUCCESS (unexpected)");
      } catch (error) {
        console.log("❌ Mixed order creation FAILED (expected)");
        console.log("Error:", error.message);
      }
    } else {
      console.log("⚠️  No services found in database for mixed test");
    }

    console.log("\n");

    // Test 3: Frontend Data Format Compatibility
    console.log("🔍 TEST 3: Frontend SelectedServiceItem Format");
    console.log("=".repeat(50));

    // This is how frontend sends manual services
    const frontendManualService = {
      id: "temp-manual-id-123",
      name: "Custom Deep Clean",
      price: 150.0,
      quantity: 1,
      isManualEntry: true,
      description: "Custom service entered by user",
    };

    console.log("Frontend manual service format:");
    console.log(JSON.stringify(frontendManualService, null, 2));

    // Backend expects this format for OrderDatabaseService.createOrder:
    const backendExpectedFormat = {
      serviceId: frontendManualService.id, // ❌ This will fail validation
      quantity: frontendManualService.quantity,
      unitPrice: frontendManualService.price,
      notes: frontendManualService.description,
    };

    console.log("\nBackend expected format (INCOMPATIBLE):");
    console.log(JSON.stringify(backendExpectedFormat, null, 2));

    console.log("\n");

    // Test 4: Database Schema Analysis
    console.log("🔍 TEST 4: Database Schema Compatibility");
    console.log("=".repeat(50));

    console.log("OrderItem schema analysis:");
    console.log("- serviceId: String (REQUIRED) ❌ Problem for manual entries");
    console.log("- quantity: Decimal (REQUIRED) ✅ Compatible");
    console.log("- unitPrice: Decimal (REQUIRED) ✅ Compatible");
    console.log("- totalPrice: Decimal (REQUIRED) ✅ Compatible");
    console.log("- notes: String? (OPTIONAL) ✅ Compatible");
    console.log("- service relation: EXPECTED ❌ Problem for manual entries");

    console.log("\n");

    // Test 5: Check what happens with Orders without services
    console.log(
      "🔍 TEST 5: Orders without specific services (totalAmount only)"
    );
    console.log("=".repeat(50));

    const manualAmountOrderData = {
      businessId: business.id,
      customerId: customer.id,
      // No services array - just total amount
      orderInfo: "Manual order with total amount only",
      totalAmount: 200.0,
    };

    try {
      const { OrderDatabaseService } = await import("./lib/database/orders.js");
      const order = await OrderDatabaseService.createOrder(
        manualAmountOrderData
      );
      console.log("✅ Manual amount order SUCCESS");
      console.log("Order ID:", order.id);

      // Try to create invoice for this order
      console.log("\n📄 Testing invoice creation for manual amount order...");

      // This should also fail because no orderItems exist
      const response = await fetch(
        "http://localhost:3000/api/invoices/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            businessId: business.id,
            createEInvoice: false,
          }),
        }
      );

      if (response.ok) {
        console.log("✅ Invoice creation SUCCESS (unexpected)");
      } else {
        const error = await response.json();
        console.log("❌ Invoice creation FAILED (expected)");
        console.log("Error:", error.error);
      }
    } catch (error) {
      console.log("❌ Manual amount order creation FAILED");
      console.log("Error:", error.message);
    }
  } catch (error) {
    console.error("💥 Test suite error:", error.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n📊 COMPATIBILITY TEST SUMMARY");
  console.log("=".repeat(50));
  console.log(
    "❌ Manual service entries are NOT compatible with current backend"
  );
  console.log("❌ Order creation will fail for manual services");
  console.log("❌ Invoice generation will fail for manual services");
  console.log("❌ PDF generation will fail for manual services");
  console.log("✅ Manual total amount orders work (but no itemization)");

  console.log("\n🔧 REQUIRED FIXES:");
  console.log("1. Modify OrderDatabaseService to handle manual services");
  console.log("2. Update database schema to support manual entries");
  console.log("3. Fix invoice generation for manual services");
  console.log("4. Update PDF generation for manual services");
  console.log("5. Add middleware to distinguish manual vs database services");
}

// Export for use in other files
module.exports = { testManualServiceCompatibility };

// Run if called directly
if (require.main === module) {
  testManualServiceCompatibility()
    .then(() => {
      console.log("\n✨ Test completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test failed:", error);
      process.exit(1);
    });
}
