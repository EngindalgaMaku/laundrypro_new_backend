const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixCategories() {
  try {
    console.log("🔧 Fixing service categories...");

    const serviceCategoryMap = {
      // UPHOLSTERY_CLEANING (9 services)
      "Döşeme Temizlik - Koltuk": "UPHOLSTERY_CLEANING",
      "Döşeme Temizlik - Tek Koltuk": "UPHOLSTERY_CLEANING",
      "Kanepe Temizlik - 2 Kişilik": "UPHOLSTERY_CLEANING",
      "Kanepe Temizlik - 3 Kişilik": "UPHOLSTERY_CLEANING",
      "Kumaş Kaplama Sandalye": "UPHOLSTERY_CLEANING",
      "Deri Koltuk Temizlik": "UPHOLSTERY_CLEANING",
      "Ofis Koltuğu Temizlik": "UPHOLSTERY_CLEANING",
      "Yatak Temizlik - Tek Kişilik": "UPHOLSTERY_CLEANING",
      "Yatak Temizlik - Çift Kişilik": "UPHOLSTERY_CLEANING",

      // CARPET_CLEANING (4 services)
      "Halı Yıkama - Büyük": "CARPET_CLEANING",
      "Halı Yıkama - Orta": "CARPET_CLEANING",
      "Halı Yıkama - Küçük": "CARPET_CLEANING",
      "Makine Halısı Temizlik": "CARPET_CLEANING",

      // CURTAIN_CLEANING (2 services)
      "Perdeler - Tek Kanat": "CURTAIN_CLEANING",
      "Perdeler - Çift Kanat": "CURTAIN_CLEANING",

      // LAUNDRY (3 services)
      "Battaniye Yıkama": "LAUNDRY",
      "Yorgan Yıkama": "LAUNDRY",
      "Yastık Yıkama": "LAUNDRY",

      // OTHER (1 service)
      "Araç İç Temizlik": "OTHER",
    };

    let updated = 0;
    for (const [serviceName, correctCategory] of Object.entries(
      serviceCategoryMap
    )) {
      const result = await prisma.service.updateMany({
        where: {
          businessId: "cmfykmlfo0004lm0kqz56inf1",
          name: serviceName,
        },
        data: {
          category: correctCategory,
        },
      });
      if (result.count > 0) {
        console.log(`✅ ${serviceName} → ${correctCategory}`);
        updated++;
      } else {
        console.log(`⚠️ Service not found: ${serviceName}`);
      }
    }

    console.log(`\n📊 Updated ${updated} services with correct categories`);

    // Verify final distribution
    const services = await prisma.service.findMany({
      where: { businessId: "cmfykmlfo0004lm0kqz56inf1" },
      select: { name: true, category: true },
      orderBy: { category: "asc" },
    });

    const byCategory = {};
    services.forEach((service) => {
      if (!byCategory[service.category]) {
        byCategory[service.category] = [];
      }
      byCategory[service.category].push(service.name);
    });

    console.log("\n🏷️ Final category distribution:");
    Object.entries(byCategory).forEach(([category, serviceNames]) => {
      console.log(`\n${category} (${serviceNames.length} services):`);
      serviceNames.forEach((name) => console.log(`  - ${name}`));
    });

    console.log("\n🎉 Category fix complete!");
  } catch (error) {
    console.error("❌ Error fixing categories:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCategories();
