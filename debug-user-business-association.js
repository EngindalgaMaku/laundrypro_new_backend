/**
 * Debug user business association issue
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function debugUserBusinessAssociation() {
  try {
    console.log("🔍 Debugging user business association...");

    // Check the user
    const user = await prisma.user.findUnique({
      where: { email: "zeyno@gmail.com" },
      include: { business: true },
    });

    console.log("👤 User Info:");
    if (user) {
      console.log(`  Email: ${user.email}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Business ID: ${user.businessId || "undefined"}`);
      console.log(`  Business: ${user.business?.name || "none"}`);
    } else {
      console.log("  User not found!");
    }

    // Check available businesses
    const businesses = await prisma.business.findMany();
    console.log(`\n🏢 Available Businesses (${businesses.length}):`);
    businesses.forEach((business) => {
      console.log(`  ${business.name} (ID: ${business.id})`);
    });

    // Check orders by business
    for (const business of businesses) {
      const orderCount = await prisma.order.count({
        where: { businessId: business.id },
      });
      console.log(`\n📋 Orders in ${business.name}: ${orderCount}`);
    }

    // Fix the user business association if needed
    if (user && !user.businessId && businesses.length > 0) {
      console.log(`\n🔧 Fixing user business association...`);
      const targetBusiness = businesses[0]; // Use first business

      await prisma.user.update({
        where: { id: user.id },
        data: { businessId: targetBusiness.id },
      });

      console.log(
        `✅ User ${user.email} now associated with ${targetBusiness.name}`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserBusinessAssociation();
