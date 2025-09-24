const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debugOrderErrors() {
  console.log("🔍 DEBUGGING ORDER API ERRORS - COMPREHENSIVE ANALYSIS");
  console.log("====================================================");

  try {
    // Test 1: Check for orders with manual service entries
    console.log("\n📋 TEST 1: Checking Manual Service Entry Orders");
    const manualOrders = await prisma.orderItem.findMany({
      where: {
        isManualEntry: true,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            businessId: true,
          },
        },
      },
      take: 5,
    });

    console.log(`Found ${manualOrders.length} manual service entries:`);
    manualOrders.forEach((item) => {
      console.log(
        `- Order ${item.order.orderNumber}: serviceName="${item.serviceName}", serviceId=${item.serviceId}`
      );
    });

    // Test 2: Check orders with null serviceId in orderItems
    console.log("\n🔍 TEST 2: Checking Orders with Null Service Relations");
    const nullServiceOrders = await prisma.orderItem.findMany({
      where: {
        serviceId: null,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
      take: 10,
    });

    console.log(
      `Found ${nullServiceOrders.length} order items with null serviceId:`
    );
    nullServiceOrders.forEach((item) => {
      console.log(
        `- Order ${item.order.orderNumber}: serviceName="${item.serviceName}", isManualEntry=${item.isManualEntry}`
      );
    });

    // Test 3: Try to reproduce the exact query from the API
    console.log("\n⚠️  TEST 3: Reproducing Order Listing Query");

    // Get a sample businessId from existing orders
    const sampleOrder = await prisma.order.findFirst({
      select: { businessId: true },
    });

    if (!sampleOrder) {
      console.log("No orders found in database!");
      return;
    }

    console.log(`Using businessId: ${sampleOrder.businessId}`);

    // Reproduce the exact query from the API route
    const orders = await prisma.order.findMany({
      where: {
        businessId: sampleOrder.businessId,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            whatsapp: true,
            email: true,
            address: true,
            city: true,
            district: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        orderItems: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                category: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    console.log(`Retrieved ${orders.length} orders successfully`);

    // Test 4: Analyze each order for potential transformation issues
    console.log("\n🧪 TEST 4: Testing Order Transformation Logic");
    for (const order of orders) {
      console.log(`\n--- Analyzing Order ${order.orderNumber} ---`);
      console.log(`Order items count: ${order.orderItems.length}`);

      if (order.orderItems.length > 0) {
        const firstItem = order.orderItems[0];
        console.log(`First item - serviceId: ${firstItem.serviceId}`);
        console.log(`First item - serviceName: ${firstItem.serviceName}`);
        console.log(`First item - isManualEntry: ${firstItem.isManualEntry}`);
        console.log(
          `First item - service relation: ${
            firstItem.service ? "EXISTS" : "NULL"
          }`
        );

        // Test the problematic transformation logic
        try {
          const serviceName =
            firstItem.service?.name ||
            firstItem.serviceName ||
            "Çeşitli Hizmetler";
          const serviceCategory = firstItem.service?.category || "OTHER";
          console.log(
            `✅ Transformation successful - name: ${serviceName}, category: ${serviceCategory}`
          );
        } catch (error) {
          console.log(`❌ Transformation failed: ${error.message}`);
        }
      } else {
        console.log("No order items found");
      }
    }

    // Test 5: Check for database consistency issues
    console.log("\n🔧 TEST 5: Database Consistency Check");

    // Check for orderItems without orders
    const orphanedItems = await prisma.orderItem.count({
      where: {
        order: null,
      },
    });
    console.log(`Orphaned order items: ${orphanedItems}`);

    // Check for orders without items
    const ordersWithoutItems = await prisma.order.count({
      where: {
        orderItems: {
          none: {},
        },
      },
    });
    console.log(`Orders without items: ${ordersWithoutItems}`);

    // Check for mixed manual/database services in same order
    const mixedOrders = await prisma.order.findMany({
      where: {
        orderItems: {
          some: {
            AND: [{ isManualEntry: true }, { isManualEntry: false }],
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });
    console.log(`Orders with mixed service types: ${mixedOrders.length}`);

    // Test 6: Performance test
    console.log("\n⏱️  TEST 6: Performance Test");
    const startTime = Date.now();
    await prisma.order.count({
      where: {
        businessId: sampleOrder.businessId,
      },
    });
    const endTime = Date.now();
    console.log(`Simple count query took: ${endTime - startTime}ms`);

    // Test the full query performance
    const fullQueryStart = Date.now();
    await prisma.order.findMany({
      where: {
        businessId: sampleOrder.businessId,
      },
      include: {
        customer: true,
        orderItems: {
          include: {
            service: true,
          },
        },
      },
      take: 10,
    });
    const fullQueryEnd = Date.now();
    console.log(
      `Full query with relations took: ${fullQueryEnd - fullQueryStart}ms`
    );
  } catch (error) {
    console.error("\n❌ CRITICAL ERROR DETECTED:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Check if it's a Prisma error
    if (error.code) {
      console.error("Prisma error code:", error.code);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n🏁 DEBUG COMPLETE");
  console.log("====================================================");
}

// Run the debug
debugOrderErrors().catch(console.error);
