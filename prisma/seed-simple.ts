import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Test verileri ekleniyor...");

  try {
    // Önce business oluştur
    const business = await (prisma as any).business.create({
      data: {
        name: "LaundryPro Test İşletmesi",
        businessType: "LAUNDRY",
        email: "info@laundrypro.com",
        phone: "+90 555 123 4567",
        address: "Test Mahallesi, Test Sokak No:1, İstanbul",
      },
    });

    console.log("✅ Test işletmesi oluşturuldu:", business.name);

    // Test kullanıcısı oluştur
    const hashedPassword = await bcrypt.hash("test123", 12);
    const user = await (prisma as any).user.create({
      data: {
        email: "test@laundrypro.com",
        passwordHash: hashedPassword,
        firstName: "Test",
        lastName: "Kullanıcı",
        phone: "+90 555 987 6543",
        role: "OWNER",
        businessId: business.id,
      },
    });

    console.log("✅ Test kullanıcısı oluşturuldu:", user.email);

    // Test müşterileri oluştur
    const customers = [
      {
        firstName: "Ahmet",
        lastName: "Yılmaz",
        email: "ahmet@example.com",
        phone: "+90 532 111 2233",
        whatsapp: "+90 532 111 2233",
        address: "Kadıköy, İstanbul",
        businessId: business.id,
      },
      {
        firstName: "Fatma",
        lastName: "Demir",
        email: "fatma@example.com",
        phone: "+90 543 444 5566",
        whatsapp: "+90 543 444 5566",
        address: "Beşiktaş, İstanbul",
        businessId: business.id,
      },
    ];

    for (const customerData of customers) {
      await (prisma as any).customer.create({ data: customerData });
    }

    console.log("✅ Test müşterileri oluşturuldu");
    console.log("🎉 Seed işlemi tamamlandı!");
  } catch (error) {
    console.error("❌ Seed hatası:", error);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
