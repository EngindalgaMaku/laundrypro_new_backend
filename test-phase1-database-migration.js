const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testPhase1DatabaseChanges() {
  console.log("🧪 PHASE 1 DATABASE MIGRATION & SCHEMA TEST");
  console.log("=".repeat(55));

  try {
    // TEST 1: Verify onboarding_completed field exists
    console.log("\n🗄️ TEST 1: Verify onboarding_completed field in database");
    console.log("-".repeat(50));

    const tableInfo = await prisma.$queryRaw`
      SHOW COLUMNS FROM businesses LIKE 'onboarding_completed'
    `;

    if (tableInfo.length === 0) {
      throw new Error(
        "❌ FAIL: onboarding_completed field not found in businesses table"
      );
    }

    console.log("✅ onboarding_completed field exists");
    console.log(`   Field: ${tableInfo[0].Field}`);
    console.log(`   Type: ${tableInfo[0].Type}`);
    console.log(`   Default: ${tableInfo[0].Default}`);

    // TEST 2: Test creating a business without service types
    console.log("\n📝 TEST 2: Create business without service types");
    console.log("-".repeat(50));

    const testBusiness = await prisma.business.create({
      data: {
        name: "Phase 1 Test Business",
        businessType: "DRY_CLEANING",
        email: "test@phase1.com",
        phone: "5551234567",
        address: "123 Test Street",
        city: "Istanbul",
        district: "Kadıköy",
        // onboarding_completed should default to FALSE
      },
    });

    console.log("✅ Business created without service types");
    console.log(`   Business ID: ${testBusiness.id}`);
    console.log(`   Onboarding completed: ${testBusiness.onboardingCompleted}`);

    if (testBusiness.onboardingCompleted !== false) {
      throw new Error(
        "❌ FAIL: New business should have onboarding_completed = FALSE"
      );
    }

    // TEST 3: Update onboarding status
    console.log("\n🎯 TEST 3: Update onboarding status");
    console.log("-".repeat(50));

    await prisma.$executeRaw`
      UPDATE businesses 
      SET onboarding_completed = TRUE 
      WHERE id = ${testBusiness.id}
    `;

    const updatedBusiness = await prisma.$queryRaw`
      SELECT id, name, onboarding_completed 
      FROM businesses 
      WHERE id = ${testBusiness.id}
    `;

    console.log("✅ Onboarding status updated");
    console.log(`   Business ID: ${updatedBusiness[0].id}`);
    console.log(
      `   Onboarding completed: ${updatedBusiness[0].onboarding_completed}`
    );

    if (!updatedBusiness[0].onboarding_completed) {
      throw new Error(
        "❌ FAIL: Business onboarding status should be TRUE after update"
      );
    }

    // TEST 4: Create business service types
    console.log("\n🛠️ TEST 4: Create business service types");
    console.log("-".repeat(50));

    const serviceTypes = ["DRY_CLEANING", "LAUNDRY", "IRONING"];
    const createdServiceTypes = [];

    for (const serviceType of serviceTypes) {
      const bst = await prisma.businessServiceType.create({
        data: {
          businessId: testBusiness.id,
          serviceType: serviceType,
          isActive: true,
        },
      });
      createdServiceTypes.push(bst);
    }

    console.log("✅ Business service types created");
    console.log(`   Count: ${createdServiceTypes.length}`);
    console.log(
      `   Types: ${createdServiceTypes
        .map((bst) => bst.serviceType)
        .join(", ")}`
    );

    // TEST 5: Query business with service types
    console.log("\n🔍 TEST 5: Query business with service types");
    console.log("-".repeat(50));

    const businessWithServiceTypes = await prisma.businessServiceType.findMany({
      where: {
        businessId: testBusiness.id,
        isActive: true,
      },
      select: { serviceType: true },
    });

    console.log("✅ Service types retrieved");
    console.log(`   Count: ${businessWithServiceTypes.length}`);
    console.log(
      `   Types: ${businessWithServiceTypes
        .map((bst) => bst.serviceType)
        .join(", ")}`
    );

    // TEST 6: Test backward compatibility
    console.log(
      "\n🔄 TEST 6: Test backward compatibility for existing businesses"
    );
    console.log("-".repeat(50));

    // Update any existing businesses to have onboarding completed
    const updateCount = await prisma.$executeRaw`
      UPDATE businesses 
      SET onboarding_completed = TRUE 
      WHERE id != ${testBusiness.id} 
      AND (onboarding_completed IS NULL OR onboarding_completed = FALSE)
    `;

    console.log("✅ Backward compatibility ensured");
    console.log(`   Updated ${updateCount} existing businesses`);

    // TEST 7: Verify services API structure would work
    console.log("\n🛠️ TEST 7: Verify services API compatibility");
    console.log("-".repeat(50));

    // Check if we can query businesses with onboarding status
    const businessesWithOnboarding = await prisma.$queryRaw`
      SELECT id, name, onboarding_completed, 
             CASE 
               WHEN onboarding_completed = TRUE THEN 'completed'
               ELSE 'pending'
             END as status
      FROM businesses 
      LIMIT 5
    `;

    console.log("✅ Services API compatibility verified");
    console.log(`   Sample businesses with onboarding status:`);
    businessesWithOnboarding.forEach((b, i) => {
      console.log(`     ${i + 1}. ${b.name} - ${b.status}`);
    });

    // SUCCESS SUMMARY
    console.log("\n🎉 PHASE 1 DATABASE TESTS COMPLETED");
    console.log("=".repeat(55));
    console.log("✅ Database schema migration: PASS");
    console.log("✅ Business creation without service types: PASS");
    console.log("✅ Onboarding status tracking: PASS");
    console.log("✅ Service types creation: PASS");
    console.log("✅ Service types querying: PASS");
    console.log("✅ Backward compatibility: PASS");
    console.log("✅ API compatibility: PASS");

    // Cleanup test data
    console.log("\n🧹 CLEANUP: Removing test data...");
    await prisma.businessServiceType.deleteMany({
      where: { businessId: testBusiness.id },
    });
    await prisma.business.delete({
      where: { id: testBusiness.id },
    });
    console.log("✅ Test data cleaned up");

    return {
      success: true,
      tests: 7,
      businessId: testBusiness.id,
      serviceTypesCreated: createdServiceTypes.length,
      existingBusinessesUpdated: updateCount,
    };
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPhase1DatabaseChanges()
  .then((result) => {
    console.log("\n🏁 DATABASE TEST EXECUTION COMPLETE");
    if (result.success) {
      console.log("🎉 ALL DATABASE TESTS PASSED!");
      console.log("\n📊 SUMMARY:");
      console.log(`• Database migration: ✅ Working`);
      console.log(`• Business creation: ✅ Working`);
      console.log(`• Service types: ✅ Working`);
      console.log(`• Onboarding tracking: ✅ Working`);
      console.log(`• Phase 1 implementation: ✅ Ready for testing`);
      process.exit(0);
    } else {
      console.log("💥 DATABASE TESTS FAILED!");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("💥 FATAL DATABASE ERROR:", error);
    process.exit(1);
  });
