const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testOrphanedOrderItems() {
  try {
    console.log("🔍 Testing for orphaned order items...");
    console.log("=".repeat(50));

    const orderId = "cmfyjanhb0003lm0kttjzzcl3";

    // Check if there are any orderItems without proper order association
    console.log("\n📊 Checking OrderItems table...");

    const allOrderItems = await prisma.orderItem.findMany({
      include: {
        order: true,
        service: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    console.log(`Found ${allOrderItems.length} order items in database:`);

    for (const item of allOrderItems) {
      console.log(`\n🛍️ OrderItem ID: ${item.id}`);
      console.log(`  - Order ID: ${item.orderId}`);
      console.log(
        `  - Service Name: ${item.serviceName || item.service?.name || "N/A"}`
      );
      console.log(`  - Quantity: ${item.quantity}`);
      console.log(`  - Price: ${item.price || item.unitPrice || "N/A"}`);
      console.log(`  - Created: ${item.createdAt}`);
      console.log(`  - Order Status: ${item.order?.status || "No Order"}`);

      if (item.orderId === orderId) {
        console.log(`  ✅ This item belongs to our test order!`);
      }
    }

    // Check if there are items that might belong to our order but aren't linked
    console.log("\n🔍 Checking for potential matches by timestamp...");

    const testOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (testOrder) {
      console.log(`\n📅 Test order created: ${testOrder.createdAt}`);

      // Look for items created around the same time
      const timeWindow = new Date(testOrder.createdAt.getTime() - 60000); // 1 minute before
      const timeWindowEnd = new Date(testOrder.createdAt.getTime() + 60000); // 1 minute after

      const nearbyItems = await prisma.orderItem.findMany({
        where: {
          createdAt: {
            gte: timeWindow,
            lte: timeWindowEnd,
          },
        },
        include: {
          order: true,
          service: true,
        },
      });

      console.log(
        `\n🕐 Found ${nearbyItems.length} items created around the same time:`
      );
      for (const item of nearbyItems) {
        console.log(
          `  - Item ${item.id}: Order ${item.orderId}, Created: ${item.createdAt}`
        );
        if (item.orderId !== orderId && item.orderId) {
          console.log(
            `    ⚠️  This item belongs to different order: ${item.orderId}`
          );
        } else if (!item.orderId) {
          console.log(`    ❌ This item has NO order ID!`);
        }
      }
    }

    // Let's also check our specific order one more time with detailed logging
    console.log("\n🔍 Re-checking our specific order...");

    const detailedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            service: true,
          },
        },
        business: true,
      },
    });

    if (detailedOrder) {
      console.log(`\n📋 Order Details:`);
      console.log(`  - ID: ${detailedOrder.id}`);
      console.log(`  - Total Amount: ${detailedOrder.totalAmount}`);
      console.log(
        `  - Order Items Count: ${detailedOrder.orderItems?.length || 0}`
      );
      console.log(`  - Business ID: ${detailedOrder.businessId}`);
      console.log(`  - Customer ID: ${detailedOrder.customerId}`);

      if (detailedOrder.orderItems && detailedOrder.orderItems.length === 0) {
        console.log(
          `\n❌ CONFIRMED: Order has 0 items but total amount of ${detailedOrder.totalAmount}`
        );
        console.log(
          `This indicates data inconsistency - order should have items to justify the total.`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error testing orphaned order items:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testOrphanedOrderItems();
