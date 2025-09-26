/**
 * Temporarily fix user business association for testing purposes
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixUserForTesting() {
  try {
    console.log("🔧 Fixing user business association for testing...");

    // Associate zeyno@gmail.com with Dalga Temizlik business (which has orders)
    const businessWithOrders = await prisma.business.findFirst({
      where: { name: "Dalga Temizlik" },
    });

    if (!businessWithOrders) {
      console.log("❌ Dalga Temizlik business not found");
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { email: "zeyno@gmail.com" },
      data: { businessId: businessWithOrders.id },
    });

    console.log(
      `✅ User zeyno@gmail.com now associated with ${businessWithOrders.name}`
    );
    console.log(`✅ This will allow testing with existing orders`);

    // Verify orders are now accessible
    const orderCount = await prisma.order.count({
      where: { businessId: businessWithOrders.id },
    });
    console.log(`📋 Orders now accessible: ${orderCount}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserForTesting();
