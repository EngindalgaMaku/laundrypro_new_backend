const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testFinalAPIResponse() {
  try {
    console.log("🔍 Testing final API response...");
    console.log("=".repeat(50));

    const orderId = "cmfyjanhb0003lm0kttjzzcl3";

    // Get the order with proper data structure
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            service: true,
          },
        },
        business: true,
      },
    });

    if (!order) {
      console.log("❌ Order not found");
      return;
    }

    console.log("\n📊 Current Database State:");
    console.log(`  - Order ID: ${order.id}`);
    console.log(
      `  - Customer: ${order.customer.firstName} ${order.customer.lastName}`
    );
    console.log(`  - Phone: ${order.customer.phone}`);
    console.log(`  - Total Amount: ₺${order.totalAmount}`);
    console.log(`  - Order Items Count: ${order.orderItems?.length || 0}`);

    if (order.orderItems) {
      order.orderItems.forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.serviceName}`);
        console.log(`       - Quantity: ${item.quantity}`);
        console.log(`       - Unit Price: ${item.unitPrice}`);
        console.log(`       - Total Price: ${item.totalPrice}`);
      });
    }

    // Simulate the EXACT API transformation from route.ts
    console.log("\n📱 Simulating EXACT API transformation:");

    const transformedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      customer: {
        id: order.customer.id,
        name:
          `${order.customer.firstName || ""} ${
            order.customer.lastName || ""
          }`.trim() || "İsimsiz",
        firstName: order.customer.firstName || "",
        lastName: order.customer.lastName || "",
        phone: order.customer.phone || "",
        whatsapp: order.customer.whatsapp || order.customer.phone || "",
        email: order.customer.email || "",
        address: order.customer.address || "",
        district: order.customer.district || "",
        city: order.customer.city || "",
      },
      service: order.orderItems?.[0]?.service?.name || "Çeşitli Hizmetler",
      serviceType: order.orderItems?.[0]?.service?.category || "OTHER",
      status: order.status,
      amount: `₺${Number(order.totalAmount).toLocaleString("tr-TR")}`,
      totalAmount: Number(order.totalAmount),
      date: order.createdAt.toISOString().split("T")[0],
      phone: order.customer.phone,
      whatsapp: order.customer.whatsapp || order.customer.phone,
      email: order.customer.email,
      description: order.notes || `${order.orderItems?.length || 0} hizmet`,
      orderInfo: order.orderInfo,
      deliveryNotes: order.deliveryNotes,
      referenceCode: order.referenceCode,
      notes: order.notes,
      specialInstructions: order.specialInstructions,
      priority: order.priority,
      address: order.customer.address,
      district: order.customer.district || "",
      city: order.customer.city || "",
      customerId: order.customer.id,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      pickupDate: order.pickupDate?.toISOString(),
      deliveryDate: order.deliveryDate?.toISOString(),
      // This is the critical transformation for mobile
      items:
        order.orderItems?.map((item) => ({
          id: item.id,
          serviceId: item.serviceId || `manual-${item.id}`,
          serviceName:
            item.serviceName || item.service?.name || "Manual Service",
          serviceDescription:
            item.serviceDescription || item.service?.description || "",
          serviceCategory: item.service?.category || "OTHER",
          isManualEntry: item.isManualEntry || false,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice:
            Number(item.totalPrice) ||
            (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
          notes: item.notes || "",
          service: item.service
            ? {
                id: item.service.id,
                name: item.service.name,
                category: item.service.category,
                description: item.service.description,
              }
            : null,
        })) || [],
      photos: [],
      statusHistory: [],
    };

    console.log("\n🎯 API Response Result:");
    console.log(
      JSON.stringify(
        {
          customer: transformedOrder.customer,
          items: transformedOrder.items,
          totalAmount: transformedOrder.totalAmount,
        },
        null,
        2
      )
    );

    // Verify the mobile will get correct data
    console.log("\n✅ Mobile App Data Verification:");
    console.log(
      `  🧑‍💼 Customer Name: "${transformedOrder.customer.name}" (${
        transformedOrder.customer.name !== "İsimsiz" ? "✅" : "❌"
      })`
    );
    console.log(
      `  📞 Customer Phone: "${transformedOrder.customer.phone}" (${
        transformedOrder.customer.phone !== "" ? "✅" : "❌"
      })`
    );
    console.log(
      `  🛍️  Items Count: ${transformedOrder.items.length} (${
        transformedOrder.items.length > 0 ? "✅" : "❌"
      })`
    );

    if (transformedOrder.items.length > 0) {
      transformedOrder.items.forEach((item, index) => {
        console.log(`    Item ${index + 1}: ${item.serviceName}`);
        console.log(
          `      - Quantity: ${item.quantity} (${
            !isNaN(item.quantity) ? "✅" : "❌"
          })`
        );
        console.log(
          `      - Unit Price: ₺${item.unitPrice} (${
            !isNaN(item.unitPrice) ? "✅" : "❌"
          })`
        );
        console.log(
          `      - Total Price: ₺${item.totalPrice} (${
            !isNaN(item.totalPrice) ? "✅" : "❌"
          })`
        );
      });

      const calculatedTotal = transformedOrder.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );
      console.log(
        `  💰 Total Calculation: ₺${calculatedTotal} (${
          calculatedTotal > 0 ? "✅" : "❌"
        })`
      );
      console.log(
        `  🎯 Total Match: ${
          transformedOrder.totalAmount === calculatedTotal ? "✅" : "❌"
        }`
      );
    }
  } catch (error) {
    console.error("❌ Error testing final API response:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFinalAPIResponse();
