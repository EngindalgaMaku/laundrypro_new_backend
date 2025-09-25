const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verifyFinalStatus() {
  try {
    console.log("🔍 Final verification...");

    const services = await prisma.service.findMany({
      where: { businessId: "cmfykmlfo0004lm0kqz56inf1" },
      select: { name: true, category: true },
      orderBy: { category: "asc" },
    });

    console.log("📊 Final service count:", services.length);

    const byCategory = {};
    services.forEach((service) => {
      if (!byCategory[service.category]) {
        byCategory[service.category] = [];
      }
      byCategory[service.category].push(service.name);
    });

    console.log("");
    console.log("🏷️ Final category distribution:");
    Object.entries(byCategory).forEach(([category, serviceNames]) => {
      console.log("");
      console.log(category + " (" + serviceNames.length + " services):");
      serviceNames.forEach((name) => console.log("  - " + name));
    });

    console.log("");
    console.log("✅ Verification complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFinalStatus();
