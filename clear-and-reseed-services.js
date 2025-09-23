/**
 * CLEAR AND RESEED SERVICES SCRIPT
 * Deletes existing services and triggers auto-seeding of 18 comprehensive services
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BUSINESS_ID = "cmfwk364w0000pn0llvdmym3j"; // mackaengin's business ID

async function clearAndReseedServices() {
  try {
    console.log("🗑️  CLEARING EXISTING SERVICES...");

    // Delete all service pricings first (foreign key constraint)
    const deletedPricings = await prisma.servicePricing.deleteMany({
      where: {
        businessId: BUSINESS_ID,
      },
    });
    console.log(`✅ Deleted ${deletedPricings.count} service pricings`);

    // Delete all services
    const deletedServices = await prisma.service.deleteMany({
      where: {
        businessId: BUSINESS_ID,
      },
    });
    console.log(`✅ Deleted ${deletedServices.count} services`);

    console.log("\n🎯 DATABASE CLEARED! Services count should now be 0");

    // Verify services are cleared
    const remainingServices = await prisma.service.count({
      where: {
        businessId: BUSINESS_ID,
      },
    });

    console.log(`📊 Remaining services: ${remainingServices}`);

    if (remainingServices === 0) {
      console.log("\n✅ SUCCESS! Services cleared successfully.");
      console.log(
        "🔄 Next API request will trigger auto-seeding of 18 services"
      );
      console.log(
        "📱 Please refresh your mobile app to see the full service catalog!"
      );
    } else {
      console.log("⚠️  Warning: Some services may still remain");
    }
  } catch (error) {
    console.error("❌ Error clearing services:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAndReseedServices();
