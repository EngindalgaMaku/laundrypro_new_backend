const { PrismaClient } = require("@prisma/client");

async function checkTableStructures() {
  const prisma = new PrismaClient();
  try {
    console.log(
      "🔍 CHECKING EXISTING TABLE STRUCTURES FOR FOREIGN KEY COMPATIBILITY"
    );
    console.log("=".repeat(70));

    // Check businesses table structure
    console.log("\n📊 BUSINESSES TABLE STRUCTURE:");
    const businessColumns =
      await prisma.$queryRaw`SHOW COLUMNS FROM businesses`;
    businessColumns.forEach((col) => {
      console.log(
        `  ${col.Field}: ${col.Type} (${col.Key}) ${
          col.Null === "NO" ? "NOT NULL" : "NULL"
        } ${col.Default ? "DEFAULT " + col.Default : ""}`
      );
    });

    // Check if customers table exists
    console.log("\n📊 CUSTOMERS TABLE CHECK:");
    try {
      const customerColumns =
        await prisma.$queryRaw`SHOW COLUMNS FROM customers`;
      console.log("✅ customers table exists");
      customerColumns.forEach((col) => {
        console.log(
          `  ${col.Field}: ${col.Type} (${col.Key}) ${
            col.Null === "NO" ? "NOT NULL" : "NULL"
          } ${col.Default ? "DEFAULT " + col.Default : ""}`
        );
      });
    } catch (error) {
      console.log(
        "❌ customers table does not exist or is inaccessible:",
        error.message
      );
    }

    // List all tables to see what we're working with
    console.log("\n📊 ALL DATABASE TABLES:");
    const allTables = await prisma.$queryRaw`SHOW TABLES`;
    const tableList = allTables.map((table) => Object.values(table)[0]);
    tableList.forEach((table) => {
      console.log(`  - ${table}`);
    });

    // Check existing service-related tables
    console.log("\n📊 EXISTING SERVICE TABLES STRUCTURE:");
    const serviceTables = tableList.filter((name) => name.includes("service"));
    for (const tableName of serviceTables) {
      try {
        const columns = await prisma.$queryRaw`SHOW COLUMNS FROM ${Prisma.raw(
          tableName
        )}`;
        console.log(`\n${tableName}:`);
        columns.forEach((col) => {
          console.log(
            `  ${col.Field}: ${col.Type} (${col.Key}) ${
              col.Null === "NO" ? "NOT NULL" : "NULL"
            }`
          );
        });
      } catch (error) {
        console.log(`❌ Error checking ${tableName}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("❌ Error checking table structures:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStructures();
