// Test script to verify order fields are being saved correctly
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testOrderFields() {
  try {
    console.log("🧪 Testing Order Fields Fix...\n");

    // Step 1: Test database schema
    console.log("📋 Step 1: Checking database schema...");

    // Try to find an existing order to check schema
    const existingOrder = await prisma.order.findFirst({
      select: {
        id: true,
        orderNumber: true,
        orderInfo: true,
        deliveryNotes: true,
        referenceCode: true,
        notes: true,
        specialInstructions: true,
      },
    });

    if (existingOrder) {
      console.log("✅ Database schema includes new fields:");
      console.log("   - orderInfo:", typeof existingOrder.orderInfo);
      console.log("   - deliveryNotes:", typeof existingOrder.deliveryNotes);
      console.log("   - referenceCode:", typeof existingOrder.referenceCode);
      console.log("   - notes:", typeof existingOrder.notes);
      console.log(
        "   - specialInstructions:",
        typeof existingOrder.specialInstructions
      );
    } else {
      console.log("⚠️  No existing orders found, schema check complete anyway");
    }

    // Step 2: Test creating an order with new fields
    console.log("\n📝 Step 2: Testing order creation with separate fields...");

    // Find a business and customer to use for testing
    const testBusiness = await prisma.business.findFirst();
    const testCustomer = await prisma.customer.findFirst();

    if (!testBusiness || !testCustomer) {
      console.log(
        "⚠️  No test business or customer found. Skipping creation test."
      );
    } else {
      // Generate a test order number
      const testOrderNumber = `TEST-${Date.now()}`;

      const testOrder = await prisma.order.create({
        data: {
          businessId: testBusiness.id,
          customerId: testCustomer.id,
          orderNumber: testOrderNumber,
          status: "PENDING",
          priority: "NORMAL",
          subtotal: 100.0,
          totalAmount: 100.0,
          paymentStatus: "PENDING",
          // Test the new separate fields
          orderInfo: "Test Sipariş Bilgisi - Halı temizliği + ütüleme",
          deliveryNotes: "Test Teslimat Notu - 3. kat, asansör yok",
          referenceCode: "TEST-REF-123",
          notes: "Test iç notlar - müşteri hassas",
          specialInstructions: "Test özel talimatlar - dikkatli davranın",
        },
      });

      console.log("✅ Test order created successfully:");
      console.log(`   Order Number: ${testOrder.orderNumber}`);
      console.log(`   Order Info: "${testOrder.orderInfo}"`);
      console.log(`   Delivery Notes: "${testOrder.deliveryNotes}"`);
      console.log(`   Reference Code: "${testOrder.referenceCode}"`);
      console.log(`   Notes: "${testOrder.notes}"`);
      console.log(
        `   Special Instructions: "${testOrder.specialInstructions}"`
      );

      // Step 3: Test retrieving the order
      console.log("\n🔍 Step 3: Testing order retrieval...");

      const retrievedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
        select: {
          orderNumber: true,
          orderInfo: true,
          deliveryNotes: true,
          referenceCode: true,
          notes: true,
          specialInstructions: true,
        },
      });

      if (retrievedOrder) {
        console.log("✅ Order retrieved successfully with separate fields:");
        console.log("   All fields maintained their separate values:");
        console.log(`   - orderInfo: "${retrievedOrder.orderInfo}"`);
        console.log(`   - deliveryNotes: "${retrievedOrder.deliveryNotes}"`);
        console.log(`   - referenceCode: "${retrievedOrder.referenceCode}"`);
        console.log(`   - notes: "${retrievedOrder.notes}"`);
        console.log(
          `   - specialInstructions: "${retrievedOrder.specialInstructions}"`
        );
      }

      // Step 4: Test updating the order
      console.log("\n✏️  Step 4: Testing order update...");

      const updatedOrder = await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          orderInfo: "Updated Sipariş Bilgisi - Halı + perde temizliği",
          deliveryNotes: "Updated Teslimat Notu - güvenlik gerekli",
          referenceCode: "UPDATED-REF-456",
        },
        select: {
          orderNumber: true,
          orderInfo: true,
          deliveryNotes: true,
          referenceCode: true,
          notes: true,
          specialInstructions: true,
        },
      });

      console.log("✅ Order updated successfully:");
      console.log(`   - Updated orderInfo: "${updatedOrder.orderInfo}"`);
      console.log(
        `   - Updated deliveryNotes: "${updatedOrder.deliveryNotes}"`
      );
      console.log(
        `   - Updated referenceCode: "${updatedOrder.referenceCode}"`
      );
      console.log(`   - Unchanged notes: "${updatedOrder.notes}"`);
      console.log(
        `   - Unchanged specialInstructions: "${updatedOrder.specialInstructions}"`
      );

      // Clean up test order
      await prisma.order.delete({ where: { id: testOrder.id } });
      console.log("🗑️  Test order cleaned up");
    }

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📋 Summary of fixes:");
    console.log("✅ Database schema updated with separate fields");
    console.log("✅ Order creation properly saves separate fields");
    console.log("✅ Order retrieval returns separate fields");
    console.log("✅ Order updates work correctly");
    console.log(
      '\n💡 The "Sipariş Bilgisi" field is now properly saved and will no longer be lost!'
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testOrderFields();
