// Script to get actual business and order IDs for testing
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getTestData() {
  try {
    console.log("🔍 Getting test data from database...");

    // Get a business
    const business = await prisma.business.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    if (!business) {
      console.log("❌ No business found in database");
      return;
    }

    console.log(`✅ Business found: ${business.name} (${business.id})`);

    // Get an order for this business
    const order = await prisma.order.findFirst({
      where: { businessId: business.id },
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
        orderItems: {
          include: { service: true },
        },
      },
    });

    if (!order) {
      console.log("❌ No orders found for this business");
      return;
    }

    console.log(`✅ Order found: ${order.orderNumber} (${order.id})`);
    console.log(
      `   Customer: ${order.customer.firstName} ${order.customer.lastName}`
    );
    console.log(`   Total: ${order.totalAmount}`);
    console.log(`   Items: ${order.orderItems.length}`);

    // Check if invoice already exists
    const anyPrisma = prisma;
    const existingInvoice = await anyPrisma.invoice.findFirst({
      where: { orderId: order.id },
    });

    if (existingInvoice) {
      console.log(
        `⚠️  Invoice already exists for this order: ${existingInvoice.invoiceNumber}`
      );
    }

    console.log("\n📋 Test Configuration:");
    console.log(`const TEST_CONFIG = {`);
    console.log(`  businessId: "${business.id}",`);
    console.log(`  orderId: "${order.id}",`);
    console.log(`};`);

    return {
      businessId: business.id,
      orderId: order.id,
      businessName: business.name,
      orderNumber: order.orderNumber,
    };
  } catch (error) {
    console.error("❌ Error getting test data:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getTestData();
