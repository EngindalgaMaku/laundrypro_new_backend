/**
 * DEBUG SCRIPT: Order Creation Service Display Issue
 *
 * This script validates the critical bug where OrderCreateScreen
 * doesn't send service data to the backend, causing services
 * to not display in OrderEditScreen.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function debugOrderCreationIssue() {
  console.log("🔍 DEBUGGING ORDER CREATION SERVICE DISPLAY ISSUE");
  console.log("=".repeat(60));

  try {
    // 1. Check recent orders and their items
    console.log("\n📋 1. CHECKING RECENT ORDERS AND ITEMS:");
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        orderItems: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    recentOrders.forEach((order, index) => {
      console.log(`\n   Order ${index + 1}: #${order.orderNumber}`);
      console.log(
        `   Customer: ${order.customer.firstName} ${order.customer.lastName}`
      );
      console.log(`   Total Items: ${order.orderItems.length}`);
      console.log(`   Total Amount: ₺${order.totalAmount}`);

      if (order.orderItems.length === 0) {
        console.log(`   ❌ NO ITEMS - This order has no service items!`);
      } else {
        order.orderItems.forEach((item, i) => {
          console.log(`     Item ${i + 1}:`);
          console.log(`       ServiceId: ${item.serviceId || "NULL"}`);
          console.log(`       ServiceName: ${item.serviceName || "NULL"}`);
          console.log(`       IsManualEntry: ${item.isManualEntry}`);
          console.log(
            `       Service Join: ${
              item.service ? item.service.name : "NO JOIN"
            }`
          );
          console.log(`       Quantity: ${item.quantity}`);
          console.log(`       UnitPrice: ₺${item.unitPrice}`);
        });
      }
    });

    // 2. Check if there are orders with empty items but positive total amount
    console.log("\n🚨 2. CHECKING ORDERS WITH EMPTY ITEMS BUT POSITIVE TOTAL:");
    const emptyItemsOrders = await prisma.order.findMany({
      where: {
        AND: [
          { totalAmount: { gt: 0 } },
          {
            orderItems: {
              none: {}, // No order items
            },
          },
        ],
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(
      `   Found ${emptyItemsOrders.length} orders with positive total but no items:`
    );
    emptyItemsOrders.forEach((order, index) => {
      console.log(`     ${index + 1}. Order #${order.orderNumber}`);
      console.log(
        `        Customer: ${order.customer.firstName} ${order.customer.lastName}`
      );
      console.log(`        Total: ₺${order.totalAmount}`);
      console.log(`        Created: ${order.createdAt.toISOString()}`);
      console.log(`        Order Info: ${order.orderInfo || "N/A"}`);
    });

    // 3. Check available services
    console.log("\n🛠️ 3. CHECKING AVAILABLE SERVICES:");
    const availableServices = await prisma.service.findMany({
      where: { isActive: true },
      take: 5,
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        businessId: true,
      },
    });

    console.log(`   Available services count: ${availableServices.length}`);
    availableServices.forEach((service, index) => {
      console.log(`     ${index + 1}. ${service.name}`);
      console.log(`        ID: ${service.id}`);
      console.log(`        Category: ${service.category}`);
      console.log(`        Price: ₺${service.price}`);
    });

    // 4. Check order items with valid service references
    console.log("\n✅ 4. CHECKING ITEMS WITH VALID SERVICE REFERENCES:");
    const itemsWithServices = await prisma.orderItem.findMany({
      where: {
        serviceId: { not: null },
      },
      take: 10,
      include: {
        service: {
          select: {
            name: true,
            category: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            createdAt: true,
          },
        },
      },
    });

    console.log(
      `   Items with valid service reference: ${itemsWithServices.length}`
    );
    itemsWithServices.forEach((item, index) => {
      console.log(`     ${index + 1}. Order #${item.order.orderNumber}`);
      console.log(`        ServiceName in DB: ${item.serviceName}`);
      console.log(
        `        Service via Join: ${
          item.service ? item.service.name : "NO JOIN"
        }`
      );
      console.log(`        IsManualEntry: ${item.isManualEntry}`);
      console.log(`        Created: ${item.order.createdAt.toISOString()}`);
    });

    // 5. Check manual entries
    console.log("\n📝 5. CHECKING MANUAL SERVICE ENTRIES:");
    const manualItems = await prisma.orderItem.findMany({
      where: {
        isManualEntry: true,
      },
      take: 10,
      include: {
        order: {
          select: {
            orderNumber: true,
            createdAt: true,
          },
        },
      },
    });

    console.log(`   Manual service entries: ${manualItems.length}`);
    manualItems.forEach((item, index) => {
      console.log(`     ${index + 1}. Order #${item.order.orderNumber}`);
      console.log(`        ServiceName: ${item.serviceName}`);
      console.log(
        `        ServiceDescription: ${item.serviceDescription || "N/A"}`
      );
      console.log(`        ServiceId: ${item.serviceId || "NULL"}`);
      console.log(`        Created: ${item.order.createdAt.toISOString()}`);
    });

    // 6. Root Cause Analysis
    console.log("\n🔍 6. ROOT CAUSE ANALYSIS:");
    console.log("   Issue: OrderCreateScreen.tsx line 573 sets items: []");
    console.log(
      "   Expected: items should contain mapped selectedServices data"
    );
    console.log("   Impact: All orders created with no service items");
    console.log(
      "   Fix Required: Map selectedServices to proper backend format"
    );

    console.log("\n✅ DIAGNOSTIC COMPLETE");
  } catch (error) {
    console.error("Error during diagnosis:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
debugOrderCreationIssue().catch(console.error);
