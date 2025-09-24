const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkDatabaseSchema() {
  console.log("🔍 CHECKING CURRENT DATABASE SCHEMA STRUCTURE");
  console.log("==============================================");

  try {
    // Check if order_items table exists and its structure
    console.log("\n📋 Checking order_items table structure...");

    const orderItemsInfo = await prisma.$queryRaw`
      DESCRIBE order_items
    `;

    console.log("order_items table structure:");
    console.table(orderItemsInfo);

    // Check if the manual service fields exist
    const hasServiceName = orderItemsInfo.some(
      (col) => col.Field === "service_name"
    );
    const hasServiceDescription = orderItemsInfo.some(
      (col) => col.Field === "service_description"
    );
    const hasIsManualEntry = orderItemsInfo.some(
      (col) => col.Field === "is_manual_entry"
    );
    const serviceIdColumn = orderItemsInfo.find(
      (col) => col.Field === "service_id"
    );

    console.log("\n🔍 Manual Service Fields Analysis:");
    console.log(`service_name: ${hasServiceName ? "✅ EXISTS" : "❌ MISSING"}`);
    console.log(
      `service_description: ${
        hasServiceDescription ? "✅ EXISTS" : "❌ MISSING"
      }`
    );
    console.log(
      `is_manual_entry: ${hasIsManualEntry ? "✅ EXISTS" : "❌ MISSING"}`
    );
    console.log(
      `service_id nullable: ${
        serviceIdColumn?.Null === "YES" ? "✅ NULLABLE" : "❌ NOT NULL"
      }`
    );

    // Check orders table for new fields
    console.log("\n📋 Checking orders table structure...");
    const ordersInfo = await prisma.$queryRaw`
      DESCRIBE orders
    `;

    const hasOrderInfo = ordersInfo.some((col) => col.Field === "order_info");
    const hasDeliveryNotes = ordersInfo.some(
      (col) => col.Field === "delivery_notes"
    );
    const hasReferenceCode = ordersInfo.some(
      (col) => col.Field === "reference_code"
    );

    console.log("\n🔍 Order Fields Analysis:");
    console.log(`order_info: ${hasOrderInfo ? "✅ EXISTS" : "❌ MISSING"}`);
    console.log(
      `delivery_notes: ${hasDeliveryNotes ? "✅ EXISTS" : "❌ MISSING"}`
    );
    console.log(
      `reference_code: ${hasReferenceCode ? "✅ EXISTS" : "❌ MISSING"}`
    );

    // Check if RBAC tables exist
    console.log("\n🔍 Checking RBAC Tables...");
    const showTables = await prisma.$queryRaw`SHOW TABLES`;
    const tableNames = showTables.map((row) => Object.values(row)[0]);

    const hasPermissions = tableNames.includes("permissions");
    const hasRoles = tableNames.includes("roles");
    const hasRolePermissions = tableNames.includes("role_permissions");
    const hasSubscriptions = tableNames.includes("subscriptions");

    console.log(
      `permissions table: ${hasPermissions ? "✅ EXISTS" : "❌ MISSING"}`
    );
    console.log(`roles table: ${hasRoles ? "✅ EXISTS" : "❌ MISSING"}`);
    console.log(
      `role_permissions table: ${
        hasRolePermissions ? "✅ EXISTS" : "❌ MISSING"
      }`
    );
    console.log(
      `subscriptions table: ${hasSubscriptions ? "✅ EXISTS" : "❌ MISSING"}`
    );

    // Summary
    console.log("\n📊 SUMMARY - What needs to be fixed:");

    const missingFields = [];
    if (!hasServiceName) missingFields.push("order_items.service_name");
    if (!hasServiceDescription)
      missingFields.push("order_items.service_description");
    if (!hasIsManualEntry) missingFields.push("order_items.is_manual_entry");
    if (serviceIdColumn?.Null !== "YES")
      missingFields.push("order_items.service_id (make nullable)");
    if (!hasOrderInfo) missingFields.push("orders.order_info");
    if (!hasDeliveryNotes) missingFields.push("orders.delivery_notes");
    if (!hasReferenceCode) missingFields.push("orders.reference_code");

    if (missingFields.length > 0) {
      console.log("❌ MISSING FIELDS CAUSING 500 ERRORS:");
      missingFields.forEach((field) => console.log(`  - ${field}`));
    } else {
      console.log("✅ All required fields exist!");
    }

    // Check what migrations are needed
    const needsBaseline = !hasPermissions || !hasRoles; // These come from migration 2
    const needsManualServiceMigration =
      !hasServiceName || !hasServiceDescription || !hasIsManualEntry;

    console.log("\n🔧 RECOMMENDED ACTION PLAN:");
    if (needsBaseline) {
      console.log(
        "1. ⚠️  Baseline existing migrations (mark as applied without running)"
      );
    } else {
      console.log("1. ✅ Migrations already applied or partially applied");
    }

    if (needsManualServiceMigration) {
      console.log(
        "2. ❌ CREATE AND APPLY new migration for manual service fields"
      );
    } else {
      console.log("2. ✅ Manual service fields exist");
    }

    console.log("3. 🔄 Restart application to resolve 500 errors");
  } catch (error) {
    console.error("\n❌ DATABASE CONNECTION ERROR:");
    console.error("Error:", error.message);

    if (error.code === "P2021") {
      console.error(
        "❌ Table does not exist - database may be completely empty"
      );
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n🏁 DATABASE SCHEMA CHECK COMPLETE");
  console.log("==============================================");
}

// Run the check
checkDatabaseSchema().catch(console.error);
