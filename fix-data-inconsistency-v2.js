const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixDataInconsistency() {
  try {
    console.log("🔧 Fixing data inconsistency (v2)...");
    console.log("=".repeat(50));

    const orderId = "cmfyjanhb0003lm0kttjzzcl3";
    const businessId = "cmfwk364w0000pn0llvdmym3j";

    // Check the current order
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: true,
      },
    });

    if (!existingOrder) {
      console.log("❌ Order not found");
      return;
    }

    console.log(`\n📋 Current Order State:`);
    console.log(`  - Order ID: ${existingOrder.id}`);
    console.log(`  - Total Amount: ₺${existingOrder.totalAmount}`);
    console.log(`  - Current Items: ${existingOrder.orderItems?.length || 0}`);

    // Create a simple manual orderItem to fix the inconsistency
    console.log("\n🛠️ Creating manual orderItem...");

    try {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: orderId,
          serviceName: "Genel Temizlik Hizmeti",
          serviceDescription: "Temizlik hizmeti (veri tutarlılığı düzeltmesi)",
          quantity: 1,
          unitPrice: 150.0,
          totalPrice: 150.0,
          isManualEntry: true,
          notes: "Veri tutarlılığı sorunu çözümü için oluşturuldu",
          // Don't include serviceId since it's optional and was causing issues
        },
      });

      console.log(`✅ Created OrderItem successfully:`);
      console.log(`   ID: ${orderItem.id}`);
      console.log(`   Service: ${orderItem.serviceName}`);
      console.log(`   Quantity: ${orderItem.quantity}`);
      console.log(`   Unit Price: ₺${orderItem.unitPrice}`);
      console.log(`   Total Price: ₺${orderItem.totalPrice}`);
    } catch (createError) {
      console.log("❌ Failed to create orderItem:", createError.message);

      // Try even simpler approach
      console.log("\n🛠️ Trying minimal orderItem creation...");

      const minimalItem = await prisma.orderItem.create({
        data: {
          orderId: orderId,
          serviceName: "Temizlik Hizmeti",
          quantity: 1,
          unitPrice: 150,
          totalPrice: 150,
          isManualEntry: true,
        },
      });

      console.log(`✅ Created minimal OrderItem: ${minimalItem.id}`);
    }

    // Verify the fix
    console.log("\n✅ Verification after fix:");
    const fixedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            service: true,
          },
        },
      },
    });

    if (fixedOrder) {
      console.log(`  - Order ID: ${fixedOrder.id}`);
      console.log(
        `  - Customer: ${fixedOrder.customer.firstName} ${fixedOrder.customer.lastName}`
      );
      console.log(`  - Phone: ${fixedOrder.customer.phone}`);
      console.log(`  - Total Amount: ₺${fixedOrder.totalAmount}`);
      console.log(
        `  - Order Items Count: ${fixedOrder.orderItems?.length || 0}`
      );

      if (fixedOrder.orderItems) {
        fixedOrder.orderItems.forEach((item, index) => {
          console.log(
            `    ${index + 1}. ${item.serviceName} - Qty: ${
              item.quantity
            }, Price: ₺${item.unitPrice || item.totalPrice}`
          );
        });
      }

      const calculatedTotal =
        fixedOrder.orderItems?.reduce((sum, item) => {
          return sum + (item.totalPrice || item.quantity * item.unitPrice || 0);
        }, 0) || 0;

      console.log(`  - Calculated Total: ₺${calculatedTotal}`);
      console.log(
        `  - Totals Match: ${
          Number(fixedOrder.totalAmount) === calculatedTotal ? "✅" : "❌"
        }`
      );

      // If totals don't match, update the order total
      if (Number(fixedOrder.totalAmount) !== calculatedTotal) {
        await prisma.order.update({
          where: { id: orderId },
          data: { totalAmount: calculatedTotal },
        });
        console.log(
          `  ✅ Updated order total to match items: ₺${calculatedTotal}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error fixing data inconsistency:", error);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixDataInconsistency();
