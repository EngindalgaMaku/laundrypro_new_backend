const { PrismaClient } = require("@prisma/client");
const { OrderDatabaseService } = require("./lib/database/orders.js");

const prisma = new PrismaClient();

async function debugOrderCreationIssue() {
  try {
    console.log("🔍 DEBUGGING ORDER CREATION ISSUE");
    console.log("=================================");

    const businessId = "cmfwk364w0000pn0llvdmym3j"; // Dalga Temizlik

    // First, check what services exist for this business
    console.log("1️⃣ CHECKING AVAILABLE SERVICES FOR BUSINESS");
    console.log("============================================");

    const services = await prisma.service.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        isActive: true,
        price: true,
      },
      orderBy: { name: "asc" },
    });

    console.log(
      `Found ${services.length} services for business ${businessId}:`
    );
    services.forEach((service, index) => {
      console.log(`  ${index + 1}. ID: ${service.id}`);
      console.log(`     Name: "${service.name}"`);
      console.log(`     Category: ${service.category}`);
      console.log(`     Price: ₺${service.price || 0}`);
      console.log(`     Active: ${service.isActive}`);
      console.log("");
    });

    // Look for carpet cleaning service specifically
    const carpetServices = services.filter(
      (s) =>
        s.name.toLowerCase().includes("halı") ||
        s.name.toLowerCase().includes("carpet")
    );

    console.log(`Found ${carpetServices.length} carpet-related services:`);
    carpetServices.forEach((service) => {
      console.log(`  - ${service.name} (ID: ${service.id})`);
    });

    // Check if "Halı yıkama - büyük" exists
    const bigCarpetService = services.find(
      (s) =>
        s.name.toLowerCase().includes("halı") &&
        s.name.toLowerCase().includes("büyük")
    );

    if (bigCarpetService) {
      console.log(
        `✅ Found "Halı yıkama - büyük" service: ${bigCarpetService.name} (ID: ${bigCarpetService.id})`
      );
    } else {
      console.log('❌ "Halı yıkama - büyük" service NOT FOUND');
      // Show closest matches
      const hallServices = services.filter((s) =>
        s.name.toLowerCase().includes("halı")
      );
      console.log("Available carpet services:");
      hallServices.forEach((s) => console.log(`  - ${s.name}`));
    }

    console.log("\n2️⃣ SIMULATING ORDER CREATION PROCESS");
    console.log("===================================");

    // Get a customer to use for testing
    const customer = await prisma.customer.findFirst({
      where: { businessId },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });

    if (!customer) {
      console.log("❌ No customer found for testing");
      return;
    }

    console.log(
      `Using customer: ${customer.firstName} ${customer.lastName} (${customer.id})`
    );

    // Test 1: Create order with real service (if exists)
    if (bigCarpetService) {
      console.log("\n🧪 TEST 1: Creating order with real carpet service");
      console.log("================================================");

      const testOrderData = {
        businessId,
        customerId: customer.id,
        services: [
          {
            serviceId: bigCarpetService.id,
            serviceName: bigCarpetService.name,
            serviceDescription: bigCarpetService.description,
            isManualEntry: false,
            quantity: 1,
            unitPrice: bigCarpetService.price || 100,
            notes: "Test order for debugging",
          },
        ],
        orderInfo: "Test order with carpet cleaning service",
        notes: "Debug test order",
        deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      };

      console.log(
        "Order data being sent:",
        JSON.stringify(testOrderData, null, 2)
      );

      try {
        const createdOrder = await OrderDatabaseService.createOrder(
          testOrderData
        );
        console.log("✅ Order created successfully:", createdOrder.id);
        console.log("Order Number:", createdOrder.orderNumber);

        // Check if orderItems were created
        const orderWithItems = await prisma.order.findUnique({
          where: { id: createdOrder.id },
          include: {
            orderItems: {
              include: {
                service: true,
              },
            },
          },
        });

        console.log(`Order has ${orderWithItems.orderItems.length} items:`);
        orderWithItems.orderItems.forEach((item, index) => {
          console.log(`  Item ${index + 1}:`);
          console.log(`    Service ID: ${item.serviceId}`);
          console.log(`    Service Name (stored): ${item.serviceName}`);
          console.log(
            `    Service Name (from service): ${
              item.service?.name || "NO SERVICE"
            }`
          );
          console.log(`    Is Manual: ${item.isManualEntry}`);
          console.log(`    Quantity: ${item.quantity}`);
          console.log(`    Unit Price: ₺${item.unitPrice}`);
          console.log(`    Total Price: ₺${item.totalPrice}`);
        });

        if (orderWithItems.orderItems.length === 0) {
          console.log(
            "❌ CRITICAL ISSUE: Order created but NO orderItems were saved!"
          );
        } else if (orderWithItems.orderItems.every((item) => !item.service)) {
          console.log(
            "❌ CRITICAL ISSUE: OrderItems exist but have no service references!"
          );
        } else {
          console.log("✅ Order created successfully with proper orderItems");
        }
      } catch (error) {
        console.log("❌ Order creation failed:", error.message);
        console.log("Error details:", error);
      }
    }

    // Test 2: Create order with manual service
    console.log("\n🧪 TEST 2: Creating order with manual service");
    console.log("===========================================");

    const manualOrderData = {
      businessId,
      customerId: customer.id,
      services: [
        {
          serviceId: `manual-${Date.now()}`,
          serviceName: "Halı yıkama - büyük (Manuel)",
          serviceDescription: "Manuel olarak eklenen halı yıkama hizmeti",
          isManualEntry: true,
          quantity: 1,
          unitPrice: 150,
          notes: "Manuel test order",
        },
      ],
      orderInfo: "Test order with manual service",
      notes: "Debug manual service test",
      deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    };

    try {
      const manualOrder = await OrderDatabaseService.createOrder(
        manualOrderData
      );
      console.log("✅ Manual order created successfully:", manualOrder.id);

      const manualOrderWithItems = await prisma.order.findUnique({
        where: { id: manualOrder.id },
        include: {
          orderItems: {
            include: {
              service: true,
            },
          },
        },
      });

      console.log(
        `Manual order has ${manualOrderWithItems.orderItems.length} items:`
      );
      manualOrderWithItems.orderItems.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`);
        console.log(
          `    Service ID: ${item.serviceId} (should be null for manual)`
        );
        console.log(`    Service Name (stored): ${item.serviceName}`);
        console.log(`    Is Manual: ${item.isManualEntry}`);
        console.log(`    Quantity: ${item.quantity}`);
        console.log(`    Unit Price: ₺${item.unitPrice}`);
      });
    } catch (error) {
      console.log("❌ Manual order creation failed:", error.message);
    }

    // Test 3: Check what happens with invalid service ID
    console.log("\n🧪 TEST 3: Testing with invalid service ID");
    console.log("=========================================");

    const invalidOrderData = {
      businessId,
      customerId: customer.id,
      services: [
        {
          serviceId: "invalid-service-id-123",
          serviceName: "Halı yıkama - büyük",
          serviceDescription: "Test with invalid service ID",
          isManualEntry: false, // This should cause validation to fail
          quantity: 1,
          unitPrice: 100,
          notes: "Invalid service ID test",
        },
      ],
      orderInfo: "Test order with invalid service ID",
      notes: "Debug invalid service test",
      deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    try {
      await OrderDatabaseService.createOrder(invalidOrderData);
      console.log(
        "🔴 UNEXPECTED: Order with invalid service ID should have failed but succeeded"
      );
    } catch (error) {
      console.log(
        "✅ EXPECTED: Order with invalid service ID failed:",
        error.message
      );
      console.log(
        "   This explains why orders might be created without proper service references"
      );
    }

    console.log("\n🎯 DIAGNOSIS SUMMARY");
    console.log("==================");

    if (!bigCarpetService) {
      console.log(
        '❌ ISSUE IDENTIFIED: "Halı yıkama - büyük" service does not exist in database'
      );
      console.log(
        "   Mobile app is trying to create orders with non-existent service IDs"
      );
      console.log(
        "   This causes either order creation failure or fallback to manual services"
      );
    } else {
      console.log('✅ "Halı yıkama - büyük" service exists in database');
      console.log(
        "   Issue might be in the service ID mapping or validation logic"
      );
    }

    console.log("\n📋 RECOMMENDED ACTIONS:");
    console.log(
      "1. Verify service IDs being sent from mobile app match database"
    );
    console.log("2. Add proper error handling in order creation API");
    console.log("3. Add logging to track when service validation fails");
    console.log(
      "4. Implement fallback to create manual services when DB services fail"
    );
  } catch (error) {
    console.error("❌ Debug script error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugOrderCreationIssue().catch(console.error);
