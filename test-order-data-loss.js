// Test script to verify order data loss behavior in UI components
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createTestOrderWithAllFields() {
  try {
    console.log("🔧 Creating test order with ALL critical fields...");

    // Get the existing business
    const business = await prisma.business.findFirst();
    if (!business) {
      console.log("❌ No business found");
      return;
    }

    // Get existing customer or create one
    let customer = await prisma.customer.findFirst({
      where: { businessId: business.id },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: business.id,
          firstName: "Test",
          lastName: "Customer",
          email: "test@example.com",
          phone: "+90 532 111 2233",
          whatsapp: "+90 532 111 2233",
          address: "Kadıköy Mahallesi, Söğüt Sokak No:5",
          district: "Kadıköy",
          city: "İstanbul",
        },
      });
    }

    // Get existing service
    let service = await prisma.service.findFirst({
      where: { businessId: business.id },
    });

    if (!service) {
      service = await prisma.service.create({
        data: {
          businessId: business.id,
          name: "Kuru Temizleme",
          description: "Test hizmeti",
          category: "DRY_CLEANING",
        },
      });
    }

    // Create test order with ALL critical fields that are being lost
    const testOrder = await prisma.order.create({
      data: {
        businessId: business.id,
        orderNumber: `TEST-${Date.now()}`,
        customerId: customer.id,
        status: "CONFIRMED",
        priority: "HIGH",
        subtotal: 100.0,
        taxAmount: 18.0,
        totalAmount: 118.0,
        paymentStatus: "PENDING",
        paymentMethod: "CASH",

        // CRITICAL FIELDS THAT ARE BEING LOST IN API:
        orderInfo:
          "Bu sipariş özel temizleme gerektiren hassas kumaşlar içerir. Dikkatli işlem yapılmalıdır.",
        specialInstructions:
          "Çok nazik yıkama, ağartıcı kullanmayın, düşük ısıda ütüleyin",
        deliveryNotes:
          "Müşteri evde olmayacak, kapıcıya teslim edilebilir. Kat: 3, Daire: 7",
        referenceCode: "REF-2024-001-KRITIK",
        notes: "İç notlar - Bu sipariş test amaçlı oluşturulmuştur",

        // Dates
        pickupDate: new Date(Date.now() + 86400000), // Tomorrow
        deliveryDate: new Date(Date.now() + 172800000), // Day after tomorrow

        orderItems: {
          create: [
            {
              serviceId: service.id,
              quantity: 2,
              unitPrice: 50.0,
              totalPrice: 100.0,
              vatRate: 18.0,
              vatAmount: 18.0,
              description: "Takım elbise kuru temizleme",
            },
          ],
        },
      },
      include: {
        customer: true,
        orderItems: {
          include: {
            service: true,
          },
        },
      },
    });

    console.log("✅ Test order created successfully!");
    console.log("📋 Order details:");
    console.log(`   Order Number: ${testOrder.orderNumber}`);
    console.log(`   Order ID: ${testOrder.id}`);
    console.log(
      `   Customer: ${testOrder.customer.firstName} ${testOrder.customer.lastName}`
    );
    console.log(`   Status: ${testOrder.status}`);
    console.log(`   Total: ₺${testOrder.totalAmount}`);

    console.log("\n📝 Critical Fields in Database:");
    console.log(`   orderInfo: "${testOrder.orderInfo}"`);
    console.log(`   specialInstructions: "${testOrder.specialInstructions}"`);
    console.log(`   deliveryNotes: "${testOrder.deliveryNotes}"`);
    console.log(`   referenceCode: "${testOrder.referenceCode}"`);
    console.log(`   notes: "${testOrder.notes}"`);

    console.log("\n🔗 Test URLs:");
    console.log(`   API GET: http://localhost:3001/api/orders/${testOrder.id}`);
    console.log(
      `   API LIST: http://localhost:3001/api/orders?businessId=${business.id}`
    );

    console.log("\n📱 Mobile App Test:");
    console.log(`   1. Open mobile app`);
    console.log(`   2. Navigate to Orders screen`);
    console.log(`   3. Look for order #${testOrder.orderNumber}`);
    console.log(`   4. Check if critical info sections are empty`);
    console.log(`   5. Tap on order to view details`);
    console.log(`   6. Check if 'Sipariş Bilgileri' section shows all fields`);

    return {
      orderId: testOrder.id,
      orderNumber: testOrder.orderNumber,
      businessId: business.id,
    };
  } catch (error) {
    console.error("❌ Error creating test order:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testApiResponse(orderId) {
  try {
    console.log("\n🔍 Testing API response for order:", orderId);

    // Simulate what the mobile app would receive from the API
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            service: true,
          },
        },
        statusHistory: true,
      },
    });

    console.log("\n📊 Database vs API Mapping Analysis:");
    console.log("Critical fields in database:");
    console.log(
      `   DB orderInfo: ${order.orderInfo ? `"${order.orderInfo}"` : "NULL"}`
    );
    console.log(
      `   DB specialInstructions: ${
        order.specialInstructions ? `"${order.specialInstructions}"` : "NULL"
      }`
    );
    console.log(
      `   DB deliveryNotes: ${
        order.deliveryNotes ? `"${order.deliveryNotes}"` : "NULL"
      }`
    );
    console.log(
      `   DB referenceCode: ${
        order.referenceCode ? `"${order.referenceCode}"` : "NULL"
      }`
    );
    console.log(`   DB notes: ${order.notes ? `"${order.notes}"` : "NULL"}`);

    // Simulate API response loss scenario
    console.log("\n⚠️  SIMULATING API DATA LOSS:");
    console.log("If API doesn't return these fields, UI will show:");
    console.log(`   UI orderInfo: undefined → Section hidden`);
    console.log(`   UI specialInstructions: undefined → Section hidden`);
    console.log(`   UI deliveryNotes: undefined → Section hidden`);
    console.log(`   UI referenceCode: undefined → Section hidden`);
    console.log(
      `   UI notes: ${order.notes ? `"${order.notes}"` : "Section hidden"}`
    );

    console.log("\n🎯 USER EXPERIENCE IMPACT:");
    console.log(
      "1. Order cards: Basic info still shows (name, phone, address, amount)"
    );
    console.log(
      "2. Order details: 'Sipariş Bilgileri' section COMPLETELY HIDDEN"
    );
    console.log("3. Users lose access to:");
    console.log("   - Special handling instructions");
    console.log("   - Delivery preferences/notes");
    console.log("   - Reference codes for tracking");
    console.log("   - Important order context information");
  } catch (error) {
    console.error("❌ Error testing API response:", error);
  }
}

// Run the test
async function main() {
  const result = await createTestOrderWithAllFields();
  if (result) {
    await testApiResponse(result.orderId);
  }
}

main();
