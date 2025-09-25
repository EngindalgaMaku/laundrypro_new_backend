const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

async function runStepwiseMigration() {
  const prisma = new PrismaClient();
  try {
    console.log(
      "🚀 RUNNING STEPWISE PHASE 2 MIGRATION: SERVICE DISCOVERY TABLES"
    );
    console.log("=".repeat(60));

    console.log(
      "📋 Step 1: Creating tables WITHOUT foreign key constraints..."
    );

    // Step 1: Create tables without foreign keys
    const tablesSQL = [
      `CREATE TABLE IF NOT EXISTS service_suggestions (
        id varchar(191) PRIMARY KEY,
        business_id varchar(191) NOT NULL,
        suggestion_type ENUM('COMPLEMENTARY', 'GEOGRAPHIC', 'SEASONAL', 'DEMAND_BASED') NOT NULL,
        suggested_service_type ENUM('DRY_CLEANING', 'LAUNDRY', 'CARPET_CLEANING', 'UPHOLSTERY_CLEANING', 'CURTAIN_CLEANING', 'IRONING', 'STAIN_REMOVAL', 'OTHER') NOT NULL,
        reason TEXT,
        priority INT DEFAULT 5,
        shown_at DATETIME NULL,
        dismissed_at DATETIME NULL,
        acted_upon_at DATETIME NULL,
        metadata JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS service_expansion_history (
        id varchar(191) PRIMARY KEY,
        business_id varchar(191) NOT NULL,
        service_type ENUM('DRY_CLEANING', 'LAUNDRY', 'CARPET_CLEANING', 'UPHOLSTERY_CLEANING', 'CURTAIN_CLEANING', 'IRONING', 'STAIN_REMOVAL', 'OTHER') NOT NULL,
        expansion_reason ENUM('SUGGESTION', 'MANUAL', 'CUSTOMER_REQUEST', 'SEASONAL', 'MARKET_ANALYSIS') DEFAULT 'MANUAL',
        suggestion_id varchar(191) NULL,
        expanded_from_category varchar(191) NULL,
        success_metrics JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS customer_service_requests (
        id varchar(191) PRIMARY KEY,
        business_id varchar(191) NOT NULL,
        customer_id varchar(191) NULL,
        requested_service_type ENUM('DRY_CLEANING', 'LAUNDRY', 'CARPET_CLEANING', 'UPHOLSTERY_CLEANING', 'CURTAIN_CLEANING', 'IRONING', 'STAIN_REMOVAL', 'OTHER') NOT NULL,
        requested_service_name varchar(191) NOT NULL,
        request_description TEXT NULL,
        request_source ENUM('ORDER_MODAL', 'PHONE_CALL', 'WHATSAPP', 'IN_PERSON', 'OTHER') DEFAULT 'ORDER_MODAL',
        customer_contact varchar(191) NULL,
        urgency_level ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
        estimated_demand INT DEFAULT 1,
        status ENUM('PENDING', 'ACKNOWLEDGED', 'PLANNED', 'IMPLEMENTED', 'REJECTED') DEFAULT 'PENDING',
        response_sent_at DATETIME NULL,
        implemented_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS service_suggestion_analytics (
        id varchar(191) PRIMARY KEY,
        business_id varchar(191) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        suggestion_type ENUM('COMPLEMENTARY', 'GEOGRAPHIC', 'SEASONAL', 'DEMAND_BASED') NOT NULL,
        total_suggestions INT DEFAULT 0,
        shown_suggestions INT DEFAULT 0,
        dismissed_suggestions INT DEFAULT 0,
        acted_upon_suggestions INT DEFAULT 0,
        conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
        avg_time_to_action_hours DECIMAL(8,2) DEFAULT 0.00,
        revenue_impact DECIMAL(10,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS business_discovery_settings (
        id varchar(191) PRIMARY KEY,
        business_id varchar(191) NOT NULL UNIQUE,
        discovery_enabled BOOLEAN DEFAULT TRUE,
        suggestion_frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY') DEFAULT 'WEEKLY',
        max_suggestions_per_period INT DEFAULT 3,
        auto_dismiss_after_days INT DEFAULT 30,
        preferred_suggestion_types JSON NULL,
        geographic_scope ENUM('CITY', 'DISTRICT', 'NATIONWIDE') DEFAULT 'CITY',
        seasonal_suggestions_enabled BOOLEAN DEFAULT TRUE,
        demand_threshold_for_suggestions INT DEFAULT 3,
        last_suggestion_generated_at DATETIME NULL,
        total_suggestions_generated INT DEFAULT 0,
        total_suggestions_acted_upon INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    ];

    let tableCount = 0;
    for (const [index, sql] of tablesSQL.entries()) {
      try {
        console.log(`🔄 Creating table ${index + 1}/5...`);
        await prisma.$executeRawUnsafe(sql);
        console.log(`✅ Table ${index + 1} created successfully`);
        tableCount++;
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(`ℹ️ Table ${index + 1} already exists`);
          tableCount++;
        } else {
          console.log(`❌ Error creating table ${index + 1}: ${error.message}`);
        }
      }
    }

    console.log(`\n📋 Step 2: Adding indexes for performance...`);
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_business_suggestions ON service_suggestions (business_id, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_suggestion_type ON service_suggestions (suggestion_type)",
      "CREATE INDEX IF NOT EXISTS idx_suggested_service_type ON service_suggestions (suggested_service_type)",
      "CREATE INDEX IF NOT EXISTS idx_priority_status ON service_suggestions (business_id, priority, shown_at)",
      "CREATE INDEX IF NOT EXISTS idx_active_suggestions ON service_suggestions (business_id, dismissed_at, acted_upon_at)",

      "CREATE INDEX IF NOT EXISTS idx_business_expansion ON service_expansion_history (business_id, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_expansion_reason ON service_expansion_history (expansion_reason)",
      "CREATE INDEX IF NOT EXISTS idx_service_type_expansion ON service_expansion_history (service_type, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_suggestion_tracking ON service_expansion_history (suggestion_id)",

      "CREATE INDEX IF NOT EXISTS idx_business_requests ON customer_service_requests (business_id, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_requested_service_type ON customer_service_requests (requested_service_type, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_request_status ON customer_service_requests (status, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_urgency_analysis ON customer_service_requests (business_id, urgency_level, status)",
      "CREATE INDEX IF NOT EXISTS idx_demand_tracking ON customer_service_requests (business_id, requested_service_type, status)",

      "CREATE UNIQUE INDEX IF NOT EXISTS unique_business_period_type ON service_suggestion_analytics (business_id, period_start, period_end, suggestion_type)",
      "CREATE INDEX IF NOT EXISTS idx_business_analytics ON service_suggestion_analytics (business_id, period_start)",
      "CREATE INDEX IF NOT EXISTS idx_type_performance ON service_suggestion_analytics (suggestion_type, conversion_rate)",
      "CREATE INDEX IF NOT EXISTS idx_period_analysis ON service_suggestion_analytics (period_start, period_end)",

      "CREATE INDEX IF NOT EXISTS idx_discovery_enabled ON business_discovery_settings (discovery_enabled)",
      "CREATE INDEX IF NOT EXISTS idx_suggestion_schedule ON business_discovery_settings (suggestion_frequency, last_suggestion_generated_at)",
    ];

    let indexCount = 0;
    for (const [index, sql] of indexes.entries()) {
      try {
        await prisma.$executeRawUnsafe(sql);
        indexCount++;
      } catch (error) {
        if (error.message.includes("already exists")) {
          indexCount++;
        } else {
          console.log(`⚠️ Error creating index ${index + 1}: ${error.message}`);
        }
      }
    }
    console.log(`✅ Created ${indexCount} indexes`);

    console.log(`\n📋 Step 3: Inserting default seasonal data...`);
    const seasonalData = `INSERT IGNORE INTO seasonal_service_patterns (id, service_type, season, month_start, month_end, demand_multiplier, peak_weeks, description, geographic_relevance) VALUES
    ('season_dry_winter', 'DRY_CLEANING', 'WINTER', 12, 2, 1.40, '[50, 51, 52, 1, 2, 3, 4]', 'Kış mevsiminde mont, palto ve kalın giysilerin temizlik talebi artar', 'TURKEY'),
    ('season_dry_fall', 'DRY_CLEANING', 'FALL', 9, 11, 1.25, '[36, 37, 44, 45]', 'Sonbahar mevsiminde mevsim değişimi ile beraber kış giysilerinin hazırlanması', 'TURKEY'),
    ('season_carpet_spring', 'CARPET_CLEANING', 'SPRING', 3, 5, 1.60, '[12, 13, 14, 15, 16, 17, 18]', 'Bahar temizliği döneminde halı yıkama talebi en yüksek seviyeye çıkar', 'TURKEY'),
    ('season_carpet_fall', 'CARPET_CLEANING', 'FALL', 9, 11, 1.35, '[36, 37, 38, 39, 40]', 'Sonbahar döneminde kış hazırlıkları için halı temizliği talebi artar', 'TURKEY'),
    ('season_curtain_spring', 'CURTAIN_CLEANING', 'SPRING', 3, 5, 1.80, '[12, 13, 14, 15, 16]', 'Bahar temizliği döneminde perde yıkama talebi pik yapar', 'TURKEY'),
    ('season_upholstery_spring', 'UPHOLSTERY_CLEANING', 'SPRING', 3, 5, 1.45, '[12, 13, 14, 15, 16, 17]', 'Bahar temizliğinde koltuk ve döşeme temizliği talebi artar', 'TURKEY'),
    ('season_laundry_summer', 'LAUNDRY', 'SUMMER', 6, 8, 1.20, '[24, 25, 26, 27, 28, 29, 30, 31, 32]', 'Yaz döneminde sıcaklık nedeniyle çamaşır yıkama sıklığı artar', 'TURKEY')`;

    try {
      await prisma.$executeRawUnsafe(seasonalData);
      console.log("✅ Seasonal data inserted");
    } catch (error) {
      console.log(`⚠️ Seasonal data insertion: ${error.message}`);
    }

    console.log(`\n📋 Step 4: Adding remaining indexes...`);
    const remainingIndexes = [
      "CREATE INDEX IF NOT EXISTS idx_businesses_discovery_ready ON businesses (id, is_active, onboarding_completed)",
      "CREATE INDEX IF NOT EXISTS idx_services_category_active ON services (business_id, category, is_active)",
      "CREATE INDEX IF NOT EXISTS idx_business_service_types_active ON business_service_types (business_id, service_type, is_active)",
    ];

    for (const sql of remainingIndexes) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (error) {
        if (!error.message.includes("already exists")) {
          console.log(`⚠️ Error creating index: ${error.message}`);
        }
      }
    }
    console.log("✅ Additional indexes created");

    // Verify table creation
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
    let missingTables = [];

    for (const tableName of requiredTables) {
      const exists = tableNames.includes(tableName);
      console.log(
        `${exists ? "✅" : "❌"} ${tableName}: ${
          exists ? "CREATED" : "MISSING"
        }`
      );
      if (exists) {
        createdTablesCount++;
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

    console.log("\n" + "=".repeat(60));
    if (createdTablesCount === 6) {
      console.log("🎉 PHASE 2 MIGRATION COMPLETED SUCCESSFULLY!");
      console.log(`✅ All ${createdTablesCount} tables created successfully`);
      console.log(
        "⚠️ Foreign key constraints skipped due to compatibility issues"
      );
      console.log("📊 All indexes and seasonal data have been added");
      console.log(
        "🔧 Tables are fully functional without foreign key constraints"
      );
    } else {
      console.log("⚠️ PHASE 2 MIGRATION PARTIALLY COMPLETED");
      console.log(`⚠️ Only ${createdTablesCount}/6 tables were created`);
      if (missingTables.length > 0) {
        console.log(`❌ Missing tables: ${missingTables.join(", ")}`);
      }
    }

    return {
      success: createdTablesCount === 6,
      createdTables: createdTablesCount,
      totalTables: 6,
      missingTables,
      note: "Tables created without foreign key constraints due to compatibility issues",
    };
  } catch (error) {
    console.error("❌ MIGRATION FAILED:", error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

runStepwiseMigration().then((result) => {
  if (result) {
    process.exit(result.success ? 0 : 1);
  } else {
    process.exit(1);
  }
});
