const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixPriceFieldIssue() {
  try {
    console.log("🔧 Fixing price field issue...");
    console.log("=".repeat(50));

    const orderItemId = "cmg0ofk170001wckwv8pzfa2f";

    // Check current orderItem data
    const currentItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });

    console.log("\n📋 Current OrderItem data:");
    console.log(JSON.stringify(currentItem, null, 2));

    // Update the orderItem to ensure all price fields are properly set
    console.log("\n🛠️ Updating price fields...");

    const updatedItem = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        price: 150.0, // For backward compatibility
        unitPrice: 150.0, // Standard unit price
        totalPrice: 150.0, // Total price (quantity * unitPrice)
        quantity: 1,
      },
    });

    console.log("\n✅ Updated OrderItem:");
    console.log(`  - ID: ${updatedItem.id}`);
    console.log(`  - Service Name: ${updatedItem.serviceName}`);
    console.log(`  - Quantity: ${updatedItem.quantity}`);
    console.log(`  - Price: ${updatedItem.price}`);
    console.log(`  - Unit Price: ${updatedItem.unitPrice}`);
    console.log(`  - Total Price: ${updatedItem.totalPrice}`);

    // Now test the full order data
    console.log("\n🔍 Testing complete order data...");

    const completeOrder = await prisma.order.findUnique({
      where: { id: "cmfyjanhb0003lm0kttjzzcl3" },
      include: {
        customer: true,
        orderItems: {
          include: {
            service: true,
          },
        },
      },
    });

    if (completeOrder) {
      console.log("\n📊 Complete Order Analysis:");
      console.log(`  - Order ID: ${completeOrder.id}`);
      console.log(
        `  - Customer: ${completeOrder.customer.firstName} ${completeOrder.customer.lastName}`
      );
      console.log(`  - Phone: ${completeOrder.customer.phone}`);
      console.log(`  - Total Amount: ₺${completeOrder.totalAmount}`);
      console.log(
        `  - Order Items Count: ${completeOrder.orderItems?.length || 0}`
      );

      if (completeOrder.orderItems && completeOrder.orderItems.length > 0) {
        completeOrder.orderItems.forEach((item, index) => {
          console.log(`    ${index + 1}. ${item.serviceName}`);
          console.log(`       - Quantity: ${item.quantity}`);
          console.log(`       - Price (legacy): ${item.price || "N/A"}`);
          console.log(`       - Unit Price: ${item.unitPrice || "N/A"}`);
          console.log(`       - Total Price: ${item.totalPrice || "N/A"}`);
        });

        // Calculate total using different price fields
        const legacyTotal = completeOrder.orderItems.reduce((sum, item) => {
          return sum + (item.price || 0) * (item.quantity || 1);
        }, 0);

        const standardTotal = completeOrder.orderItems.reduce((sum, item) => {
          return sum + (item.totalPrice || item.unitPrice * item.quantity || 0);
        }, 0);

        console.log(`\n💰 Total Calculations:`);
        console.log(`  - Order Total Amount: ₺${completeOrder.totalAmount}`);
        console.log(
          `  - Legacy Calculation (price * quantity): ₺${legacyTotal}`
        );
        console.log(
          `  - Standard Calculation (totalPrice/unitPrice): ₺${standardTotal}`
        );
        console.log(
          `  - Standard Match: ${
            Number(completeOrder.totalAmount) === standardTotal ? "✅" : "❌"
          }`
        );
      }

      // Now simulate what the API should return
      console.log("\n📱 Simulated API Response (after fix):");
      const simulatedResponse = {
        id: completeOrder.id,
        status: completeOrder.status,
        totalAmount: Number(completeOrder.totalAmount),
        customer: {
          id: completeOrder.customer.id,
          name: `${completeOrder.customer.firstName} ${completeOrder.customer.lastName}`,
          phone: completeOrder.customer.phone,
          address: completeOrder.customer.address,
        },
        items:
          completeOrder.orderItems?.map((item) => ({
            id: item.id,
            serviceName: item.serviceName,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice) || Number(item.price) || 0,
            totalPrice:
              Number(item.totalPrice) ||
              Number(item.quantity) *
                (Number(item.unitPrice) || Number(item.price) || 0),
          })) || [],
      };

      console.log(JSON.stringify(simulatedResponse, null, 2));
    }
  } catch (error) {
    console.error("❌ Error fixing price field issue:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPriceFieldIssue();
