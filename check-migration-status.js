const { PrismaClient } = require("@prisma/client");

async function comprehensiveDatabaseCheck() {
  const prisma = new PrismaClient();
  try {
    console.log("🔍 COMPREHENSIVE DATABASE MIGRATION CHECK");
    console.log("=".repeat(50));

    // 1. Check for onboarding_completed column in businesses table
    console.log("\n📊 PHASE 1: Checking businesses table structure...");
    try {
      const businessColumns =
        await prisma.$queryRaw`SHOW COLUMNS FROM businesses`;
      const hasOnboardingColumn = businessColumns.some(
        (col) => col.Field === "onboarding_completed"
      );
      console.log("✅ businesses table exists");
      console.log(
        `${hasOnboardingColumn ? "✅" : "❌"} onboarding_completed column: ${
          hasOnboardingColumn ? "EXISTS" : "MISSING"
        }`
      );

      if (hasOnboardingColumn) {
        const onboardingStats = await prisma.$queryRaw`SELECT 
          COUNT(*) as total_businesses,
          SUM(onboarding_completed) as completed_onboarding,
          COUNT(*) - SUM(onboarding_completed) as pending_onboarding
        FROM businesses`;
        console.log("📈 Onboarding Stats:", onboardingStats[0]);
      }
    } catch (error) {
      console.log("❌ Error checking businesses table:", error.message);
    }

    // 2. Check for all Phase 2 service discovery tables
    console.log("\n📊 PHASE 2: Checking service discovery tables...");
    const requiredTables = [
      "service_suggestions",
      "service_expansion_history",
      "customer_service_requests",
      "seasonal_service_patterns",
      "business_discovery_settings",
      "service_suggestion_analytics",
    ];

    const allTables = await prisma.$queryRaw`SHOW TABLES`;
    const tableNames = allTables.map((table) => Object.values(table)[0]);

    console.log(`📋 Total tables in database: ${tableNames.length}`);
    console.log("🔍 Required Phase 2 tables status:");

    let missingTables = [];
    let existingTables = [];

    for (const tableName of requiredTables) {
      const exists = tableNames.includes(tableName);
      console.log(
        `  ${exists ? "✅" : "❌"} ${tableName}: ${
          exists ? "EXISTS" : "MISSING"
        }`
      );

      if (exists) {
        existingTables.push(tableName);
        try {
          const count =
            await prisma.$queryRaw`SELECT COUNT(*) as count FROM ${Prisma.raw(
              tableName
            )}`;
          console.log(`    📊 Records: ${count[0].count}`);
        } catch (error) {
          console.log(`    ⚠️ Error counting records: ${error.message}`);
        }
      } else {
        missingTables.push(tableName);
      }
    }

    // 3. Check service-related tables
    console.log("\n📊 ALL SERVICE-RELATED TABLES:");
    const serviceTables = tableNames.filter((name) => name.includes("service"));
    serviceTables.forEach((table) => {
      console.log(`  ✅ ${table}`);
    });

    // 4. Summary
    console.log("\n" + "=".repeat(50));
    console.log("📋 MIGRATION SUMMARY:");
    console.log(
      `✅ Existing Phase 2 tables: ${existingTables.length}/${requiredTables.length}`
    );
    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.join(", ")}`);
    } else {
      console.log("🎉 All Phase 2 tables are present!");
    }

    return {
      phase1Complete: businessColumns.some(
        (col) => col.Field === "onboarding_completed"
      ),
      phase2Complete: missingTables.length === 0,
      existingTables,
      missingTables,
      totalTables: tableNames.length,
    };
  } catch (error) {
    console.error("❌ Database check failed:", error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveDatabaseCheck();
