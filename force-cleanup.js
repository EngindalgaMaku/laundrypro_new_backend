const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function forceCleanup() {
  try {
    console.log("🚨 FORCE CLEANUP - Zeynep Temizlik Services");

    // Delete ALL service pricings first
    console.log("🔥 Deleting ALL service pricings...");
    await prisma.$executeRaw`
      DELETE FROM service_pricings 
      WHERE service_id IN (
        SELECT id FROM services WHERE business_id = 'cmfykmlfo0004lm0kqz56inf1'
      )
    `;

    // Delete ALL services
    console.log("🔥 Deleting ALL services...");
    await prisma.$executeRaw`
      DELETE FROM services WHERE business_id = 'cmfykmlfo0004lm0kqz56inf1'
    `;

    console.log("✅ All services deleted! Creating fresh 19 services...");

    // Create exactly 19 clean services
    const services = [
      "Döşeme Temizlik - Koltuk",
      "Döşeme Temizlik - Tek Koltuk",
      "Halı Yıkama - Büyük",
      "Halı Yıkama - Orta",
      "Halı Yıkama - Küçük",
      "Perdeler - Tek Kanat",
      "Perdeler - Çift Kanat",
      "Yatak Temizlik - Tek Kişilik",
      "Yatak Temizlik - Çift Kişilik",
      "Kanepe Temizlik - 2 Kişilik",
      "Kanepe Temizlik - 3 Kişilik",
      "Battaniye Yıkama",
      "Yorgan Yıkama",
      "Yastık Yıkama",
      "Kumaş Kaplama Sandalye",
      "Deri Koltuk Temizlik",
      "Ofis Koltuğu Temizlik",
      "Araç İç Temizlik",
      "Makine Halısı Temizlik",
    ];

    for (let i = 0; i < services.length; i++) {
      await prisma.service.create({
        data: {
          businessId: "cmfykmlfo0004lm0kqz56inf1",
          name: services[i],
          description: `Professional ${services[i]} service`,
          category: "UPHOLSTERY_CLEANING",
          isActive: true,
          price: 100,
          sortOrder: i + 1,
        },
      });
      console.log(`✅ ${i + 1}/19: ${services[i]}`);
    }

    console.log("🎉 SUCCESS! Created exactly 19 clean services");

    // Verify count
    const count = await prisma.service.count({
      where: { businessId: "cmfykmlfo0004lm0kqz56inf1" },
    });
    console.log(`📊 Final count: ${count} services`);
  } catch (error) {
    console.error("❌ Force cleanup failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

forceCleanup();
