const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

async function runPhase2Migration() {
  const prisma = new PrismaClient();
  try {
    console.log("🚀 RUNNING PHASE 2 MIGRATION: SERVICE DISCOVERY TABLES");
    console.log("=".repeat(60));

    if (!fs.existsSync("./migrations/002_add_service_discovery_tables.sql")) {
      throw new Error("❌ Migration file does not exist");
    }

    const migrationSQL = fs.readFileSync(
      "./migrations/002_add_service_discovery_tables.sql",
      "utf8"
    );

    // Parse SQL statements more carefully
    const statements = [];
    let currentStatement = "";
    let inDelimiterBlock = false;
    let skipLine = false;

    const lines = migrationSQL.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (trimmedLine.startsWith("--") || trimmedLine === "") {
        continue;
      }

      // Handle DELIMITER blocks
      if (trimmedLine.startsWith("DELIMITER")) {
        if (trimmedLine === "DELIMITER //") {
          inDelimiterBlock = true;
          continue;
        } else if (trimmedLine === "DELIMITER ;") {
          inDelimiterBlock = false;
          continue;
        }
      }

      currentStatement += line + "\n";

      // Determine if statement is complete
      if (inDelimiterBlock) {
        if (trimmedLine === "END//") {
          statements.push(currentStatement.trim().replace(/\/\/\s*$/, ""));
          currentStatement = "";
        }
      } else {
        if (trimmedLine.endsWith(";") && trimmedLine !== "") {
          statements.push(currentStatement.trim());
          currentStatement = "";
        }
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    // Filter out empty statements and comments
    const validStatements = statements.filter((stmt) => {
      const cleaned = stmt.trim();
      return (
        cleaned.length > 10 &&
        !cleaned.startsWith("--") &&
        !cleaned.startsWith("/*") &&
        !cleaned.match(/^[\s\n\r]*$/)
      );
    });

    console.log(
      `🔄 Found ${validStatements.length} valid SQL statements to execute`
    );

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validStatements.length; i++) {
      const statement = validStatements[i];
      try {
        console.log(
          `\n🔄 Executing statement ${i + 1}/${validStatements.length}:`
        );
        console.log(
          `   ${statement.substring(0, 80)}${
            statement.length > 80 ? "..." : ""
          }`
        );

        await prisma.$executeRawUnsafe(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;
      } catch (error) {
        console.log(`⚠️ Statement ${i + 1} error: ${error.message}`);

        // Some errors are expected (like "table already exists")
        if (
          error.message.includes("already exists") ||
          error.message.includes("Duplicate key name") ||
          error.message.includes("Duplicate entry")
        ) {
          console.log(`   ℹ️ This error is expected - resource already exists`);
          successCount++;
        } else {
          errorCount++;
          console.log(`   ❌ Unexpected error - continuing...`);
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`📊 MIGRATION EXECUTION SUMMARY:`);
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`⚠️ Failed statements: ${errorCount}`);

    // Verify the tables were created
    console.log("\n🔍 VERIFYING TABLE CREATION...");
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

    let createdTablesCount = 0;
    for (const tableName of requiredTables) {
      const exists = tableNames.includes(tableName);
      console.log(
        `${exists ? "✅" : "❌"} ${tableName}: ${
          exists ? "CREATED" : "MISSING"
        }`
      );
      if (exists) createdTablesCount++;
    }

    // Check default data
    try {
      const seasonalPatterns =
        await prisma.$queryRaw`SELECT COUNT(*) as count FROM seasonal_service_patterns`;
      console.log(
        `📊 Seasonal patterns inserted: ${seasonalPatterns[0].count} records`
      );
    } catch (error) {
      console.log(`⚠️ Could not verify seasonal patterns: ${error.message}`);
    }

    console.log("\n" + "=".repeat(60));
    if (createdTablesCount === 6) {
      console.log("🎉 PHASE 2 MIGRATION COMPLETED SUCCESSFULLY!");
      console.log(`✅ All ${createdTablesCount} tables created successfully`);
    } else {
      console.log("⚠️ PHASE 2 MIGRATION PARTIALLY COMPLETED");
      console.log(`⚠️ Only ${createdTablesCount}/6 tables were created`);
    }

    return {
      success: createdTablesCount === 6,
      createdTables: createdTablesCount,
      totalTables: 6,
      successfulStatements: successCount,
      failedStatements: errorCount,
    };
  } catch (error) {
    console.error("❌ MIGRATION FAILED:", error.message);
    console.error("Stack trace:", error.stack);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

runPhase2Migration().then((result) => {
  if (result) {
    process.exit(result.success ? 0 : 1);
  } else {
    process.exit(1);
  }
});
