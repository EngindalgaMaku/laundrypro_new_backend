// Script to create test order for invoice testing
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log("🔧 Creating test data for invoice testing...");

    // Get the existing business
    const business = await prisma.business.findFirst();
    if (!business) {
      console.log("❌ No business found");
      return;
    }

    console.log(`✅ Using business: ${business.name}`);

    // Check if we have a user
    let user = await prisma.user.findFirst({
      where: { businessId: business.id },
    });

    if (!user) {
      // Create a user for this business
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("test123", 12);
      user = await prisma.user.create({
        data: {
          businessId: business.id,
          email: "test@laundrypro.com",
          passwordHash: hashedPassword,
          firstName: "Test",
          lastName: "User",
          phone: "+90 555 987 6543",
          role: "OWNER",
        },
      });
      console.log("✅ User created");
    } else {
      console.log("✅ User exists");
    }

    // Check if we have customers
    let customer = await prisma.customer.findFirst({
      where: { businessId: business.id },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: business.id,
          firstName: "Ahmet",
          lastName: "Yılmaz",
          email: "ahmet@example.com",
          phone: "+90 532 111 2233",
          whatsapp: "+90 532 111 2233",
          address: "Kadıköy, İstanbul",
        },
      });
      console.log("✅ Customer created");
    } else {
      console.log("✅ Customer exists");
    }

    // Check if we have services
    let service = await prisma.service.findFirst({
      where: { businessId: business.id },
    });

    if (!service) {
      service = await prisma.service.create({
        data: {
          businessId: business.id,
          name: "Kuru Temizleme",
          description: "Profesyonel kuru temizleme hizmeti",
          category: "DRY_CLEANING",
        },
      });
      console.log("✅ Service created");

      // Create service pricing
      await prisma.servicePricing.create({
        data: {
          serviceId: service.id,
          businessId: business.id,
          name: "Standart Fiyat",
          description: "Standart hizmet fiyatı",
          pricingType: "PER_ITEM",
          basePrice: 25.0,
          unit: "adet",
        },
      });
      console.log("✅ Service pricing created");
    } else {
      console.log("✅ Service exists");
    }

    // Check if we have orders
    let order = await prisma.order.findFirst({
      where: { businessId: business.id },
    });

    if (!order) {
      // Create a test order
      order = await prisma.order.create({
        data: {
          businessId: business.id,
          orderNumber: `ORD-${Date.now()}`,
          customerId: customer.id,
          assignedUserId: user.id,
          status: "CONFIRMED",
          priority: "NORMAL",
          subtotal: 25.0,
          taxAmount: 4.5,
          totalAmount: 29.5,
          notes: "Test siparişi - Kuru temizleme",
          orderItems: {
            create: {
              serviceId: service.id,
              quantity: 1,
              unitPrice: 25.0,
              totalPrice: 25.0,
              vatRate: 18.0,
              vatAmount: 4.5,
            },
          },
          statusHistory: {
            create: {
              status: "CONFIRMED",
              changedBy: user.id,
              notes: "Test siparişi oluşturuldu",
            },
          },
        },
      });
      console.log("✅ Test order created:", order.orderNumber);
    } else {
      console.log("✅ Order exists:", order.orderNumber);
    }

    console.log("\n📋 Test Configuration:");
    console.log(`const TEST_CONFIG = {`);
    console.log(`  businessId: "${business.id}",`);
    console.log(`  orderId: "${order.id}",`);
    console.log(`};`);

    return {
      businessId: business.id,
      orderId: order.id,
    };
  } catch (error) {
    console.error("❌ Error creating test data:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
