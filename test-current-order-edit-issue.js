const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testOrderEditIssue() {
  try {
    console.log("🔍 Testing current order edit issue...");
    console.log("=".repeat(50));

    // First, let's see what orders exist
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        orderItems: {
          include: {
            service: true,
          },
        },
        business: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    console.log(`\n📊 Found ${orders.length} orders in database`);

    if (orders.length === 0) {
      console.log("❌ No orders found in database");
      return;
    }

    // Test each order's data structure
    for (const order of orders) {
      console.log(`\n🔍 Testing Order ID: ${order.id}`);
      console.log(`Status: ${order.status}`);
      console.log(`Created: ${order.createdAt}`);

      // Test customer data
      console.log("\n👤 Customer Data:");
      if (order.customer) {
        console.log(`  - ID: ${order.customer.id}`);
        console.log(
          `  - Name: ${order.customer.firstName || "N/A"} ${
            order.customer.lastName || "N/A"
          }`
        );
        console.log(`  - Phone: ${order.customer.phone || "N/A"}`);
        console.log(`  - Email: ${order.customer.email || "N/A"}`);
        console.log(`  - Address: ${order.customer.address || "N/A"}`);
      } else {
        console.log("  ❌ No customer data linked to this order");
      }

      // Test order items
      console.log("\n🛍️ Order Items:");
      if (order.orderItems && order.orderItems.length > 0) {
        console.log(`  - Count: ${order.orderItems.length}`);
        for (const item of order.orderItems) {
          console.log(
            `  - Item: ${item.serviceName || item.service?.name || "Unknown"}`
          );
          console.log(
            `    Quantity: ${item.quantity}, Price: ${item.price}, Total: ${
              item.price * item.quantity
            }`
          );
        }
      } else {
        console.log("  ❌ No order items found");
      }

      // Test total calculation
      console.log("\n💰 Total Calculation:");
      console.log(`  - Order Total: ${order.totalAmount}`);

      if (order.orderItems && order.orderItems.length > 0) {
        const calculatedTotal = order.orderItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        console.log(`  - Calculated Total: ${calculatedTotal}`);
        console.log(
          `  - Match: ${order.totalAmount === calculatedTotal ? "✅" : "❌"}`
        );
      }

      console.log("\n" + "-".repeat(40));
    }

    // Now let's test the API endpoint response format
    console.log("\n🔍 Testing API Response Format...");

    const testOrder = orders[0];
    if (testOrder) {
      // Simulate what the API should return
      const apiResponse = {
        id: testOrder.id,
        status: testOrder.status,
        totalAmount: testOrder.totalAmount,
        customer: testOrder.customer
          ? {
              id: testOrder.customer.id,
              name:
                testOrder.customer.firstName && testOrder.customer.lastName
                  ? `${testOrder.customer.firstName} ${testOrder.customer.lastName}`
                  : testOrder.customer.firstName ||
                    testOrder.customer.lastName ||
                    "İsimsiz",
              phone: testOrder.customer.phone || "Telefon yok",
              address: testOrder.customer.address || "Adres belirtilmemiş",
            }
          : {
              name: "İsimsiz",
              phone: "Telefon yok",
            },
        orderItems:
          testOrder.orderItems?.map((item) => ({
            id: item.id,
            serviceName: item.serviceName || item.service?.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
          })) || [],
      };

      console.log("\n📱 Simulated API Response:");
      console.log(JSON.stringify(apiResponse, null, 2));
    }
  } catch (error) {
    console.error("❌ Error testing order edit issue:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testOrderEditIssue();
