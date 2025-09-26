const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixEmptyOrderItems() {
  try {
    console.log("🔧 Fixing empty order items...\n");

    const orderId = "cmg17dy8a0003p80ke5ca4zvo";
    console.log(`📋 Checking order: ${orderId}`);

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        customer: true,
      },
    });

    if (!order) {
      console.log("❌ Order not found!");
      return;
    }

    console.log("✅ Order found:");
    console.log(`   Order Number: ${order.orderNumber}`);
    console.log(
      `   Customer: ${order.customer.firstName} ${order.customer.lastName}`
    );
    console.log(`   Total Amount: ${order.totalAmount}`);
    console.log(`   Current Items Count: ${order.orderItems?.length || 0}`);

    if (order.orderItems && order.orderItems.length > 0) {
      console.log("✅ Order already has items - no fix needed!");
      return;
    }

    console.log("❌ Order has NO items - Creating fix...");

    // Add a service item to this order
    const newItem = await prisma.orderItems.create({
      data: {
        orderId: order.id,
        serviceName: "Genel Temizlik Hizmeti",
        serviceDescription: "Otomatik eklenen hizmet (boş sipariş düzeltmesi)",
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        isManualEntry: true,
        serviceId: null,
        serviceCategory: "OTHER",
      },
    });

    console.log("✅ Added service item:");
    console.log(`   Item ID: ${newItem.id}`);
    console.log(`   Service Name: ${newItem.serviceName}`);
    console.log(`   Price: ${newItem.unitPrice}`);

    console.log("\n🎉 Fix applied successfully!");
    console.log("📱 Now refresh the mobile app - the error should be gone!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEmptyOrderItems();
