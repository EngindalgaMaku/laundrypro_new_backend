const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkEmptyOrderItems() {
  try {
    console.log("🔍 Checking order with empty items...");

    const order = await prisma.orders.findUnique({
      where: { id: "cmg17dy8a0003p80ke5ca4zvo" },
      include: {
        orderItems: {
          include: {
            service: true,
          },
        },
        customer: true,
      },
    });

    if (!order) {
      console.log("❌ Order not found");
      return;
    }

    console.log("📋 Order Details:");
    console.log("- Order ID:", order.id);
    console.log("- Order Number:", order.orderNumber);
    console.log("- Total Amount:", order.totalAmount);
    console.log("- Status:", order.status);
    console.log(
      "- Customer:",
      order.customer.firstName,
      order.customer.lastName
    );
    console.log("- Order Items Count:", order.orderItems?.length || 0);

    if (order.orderItems && order.orderItems.length > 0) {
      console.log("✅ Order has items:");
      order.orderItems.forEach((item, index) => {
        console.log(
          `  ${index + 1}. ${
            item.serviceName || item.service?.name || "Unknown Service"
          }`
        );
        console.log(`     - Quantity: ${item.quantity}`);
        console.log(`     - Price: ${item.unitPrice}`);
        console.log(`     - Manual Entry: ${item.isManualEntry}`);
      });
    } else {
      console.log("❌ Order has NO items - This is the problem!");
      console.log("📝 Creating a fix...");

      // Add a default service item to this order
      const newItem = await prisma.orderItems.create({
        data: {
          orderId: order.id,
          serviceName: "Genel Temizlik Hizmeti",
          serviceDescription:
            "Otomatik eklenen hizmet (boş sipariş düzeltmesi)",
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
          isManualEntry: true,
          serviceId: null,
          serviceCategory: "OTHER",
        },
      });

      console.log("✅ Added default service item:", newItem.id);
      console.log("📱 Now refresh the mobile app to see the fix!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmptyOrderItems();
