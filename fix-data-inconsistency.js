const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixDataInconsistency() {
  try {
    console.log("🔧 Fixing data inconsistency...");
    console.log("=".repeat(50));

    const orderId = "cmfyjanhb0003lm0kttjzzcl3";
    const businessId = "cmfwk364w0000pn0llvdmym3j";

    // First, let's see what services exist for this business
    const services = await prisma.service.findMany({
      where: {
        businessId: businessId,
      },
      take: 5,
    });

    console.log(`\n📋 Found ${services.length} services for this business:`);
    services.forEach((service) => {
      console.log(
        `  - ${service.name} (${service.category}): ₺${service.price}`
      );
    });

    // Create appropriate orderItems for the 150 total
    console.log("\n🛠️ Creating missing orderItems...");

    if (services.length > 0) {
      // Option 1: Use existing services
      const selectedService = services[0];
      const quantity = Math.ceil(150 / (selectedService.price || 50));

      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: orderId,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          serviceDescription: selectedService.description || "",
          quantity: quantity,
          unitPrice: selectedService.price || 50,
          totalPrice: quantity * (selectedService.price || 50),
          price: selectedService.price || 50, // For backward compatibility
          isManualEntry: false,
          notes: "Automatically created to fix data inconsistency",
        },
      });

      console.log(
        `✅ Created OrderItem using service: ${selectedService.name}`
      );
      console.log(
        `   Quantity: ${quantity}, Unit Price: ₺${selectedService.price}, Total: ₺${orderItem.totalPrice}`
      );
    } else {
      // Option 2: Create manual service entry
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: orderId,
          serviceId: null,
          serviceName: "Temizlik Hizmeti",
          serviceDescription: "Genel temizlik hizmeti",
          quantity: 1,
          unitPrice: 150,
          totalPrice: 150,
          price: 150, // For backward compatibility
          isManualEntry: true,
          notes: "Manually created to fix data inconsistency",
        },
      });

      console.log(`✅ Created manual OrderItem: Temizlik Hizmeti`);
      console.log(`   Quantity: 1, Unit Price: ₺150, Total: ₺150`);
    }

    // Update the order's totalAmount to match the orderItems
    const updatedOrderItems = await prisma.orderItem.findMany({
      where: { orderId: orderId },
    });

    const newTotal = updatedOrderItems.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0
    );

    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal },
    });

    console.log(`\n💰 Updated order total amount to: ₺${newTotal}`);

    // Verify the fix
    console.log("\n✅ Verification:");
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

      fixedOrder.orderItems?.forEach((item, index) => {
        console.log(
          `    ${index + 1}. ${item.serviceName} - Qty: ${
            item.quantity
          }, Price: ₺${item.unitPrice || item.price}`
        );
      });

      const calculatedTotal =
        fixedOrder.orderItems?.reduce(
          (sum, item) =>
            sum +
            (item.totalPrice || item.quantity * (item.unitPrice || item.price)),
          0
        ) || 0;
      console.log(`  - Calculated Total: ₺${calculatedTotal}`);
      console.log(
        `  - Totals Match: ${
          fixedOrder.totalAmount === calculatedTotal ? "✅" : "❌"
        }`
      );
    }
  } catch (error) {
    console.error("❌ Error fixing data inconsistency:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDataInconsistency();
