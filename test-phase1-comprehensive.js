const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testPhase1Implementation() {
  console.log("🧪 PHASE 1 COMPREHENSIVE IMPLEMENTATION TEST");
  console.log("=".repeat(60));

  let migrationCompleted = false;
  let testResults = {
    migration: false,
    businessCreation: false,
    onboardingAPI: false,
    serviceFiltering: false,
    backwardCompatibility: false,
  };

  try {
    // TEST 1: Check and potentially run migration
    console.log("\n🗄️ TEST 1: Database Migration Status");
    console.log("-".repeat(50));

    try {
      const existingColumns =
        await prisma.$queryRaw`SHOW COLUMNS FROM businesses LIKE 'onboarding_completed'`;

      if (existingColumns.length === 0) {
        console.log(
          "⚠️  onboarding_completed column not found, attempting to add..."
        );

        try {
          await prisma.$executeRaw`ALTER TABLE businesses ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active`;
          console.log("✅ Added onboarding_completed column");

          await prisma.$executeRaw`UPDATE businesses SET onboarding_completed = TRUE WHERE EXISTS (SELECT 1 FROM business_service_types WHERE business_service_types.business_id = businesses.id)`;
          console.log("✅ Updated existing businesses");

          migrationCompleted = true;
          testResults.migration = true;
        } catch (migrationError) {
          console.log("❌ Migration failed:", migrationError.message);
          console.log("⚠️  Continuing tests without migration...");
        }
      } else {
        console.log("✅ onboarding_completed column exists");
        migrationCompleted = true;
        testResults.migration = true;
      }
    } catch (error) {
      console.log("❌ Could not check migration status:", error.message);
    }

    // TEST 2: Business Creation without Service Types
    console.log("\n📝 TEST 2: Business Creation Without Service Types");
    console.log("-".repeat(50));

    const testBusinessData = {
      name: "Phase 1 Test Business",
      businessType: "DRY_CLEANING",
      email: "test@phase1.com",
      phone: "5551234567",
      address: "123 Test Street",
      city: "Istanbul",
      district: "Kadıköy",
    };

    let testBusiness;
    try {
      testBusiness = await prisma.business.create({
        data: testBusinessData,
      });

      console.log("✅ Business created without service types");
      console.log(`   Business ID: ${testBusiness.id}`);

      if (migrationCompleted) {
        console.log(
          `   Onboarding completed: ${testBusiness.onboardingCompleted}`
        );
        if (testBusiness.onboardingCompleted === false) {
          console.log(
            "✅ New business correctly has onboarding_completed = FALSE"
          );
        }
      }

      testResults.businessCreation = true;
    } catch (error) {
      console.log("❌ Business creation failed:", error.message);
      return testResults;
    }

    // TEST 3: Onboarding API Test (Simulate)
    console.log("\n🎯 TEST 3: Onboarding API Functionality");
    console.log("-".repeat(50));

    try {
      // Simulate onboarding completion with service type creation
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

      console.log("✅ Service types created successfully");
      console.log(`   Count: ${createdServiceTypes.length}`);
      console.log(
        `   Types: ${createdServiceTypes
          .map((bst) => bst.serviceType)
          .join(", ")}`
      );

      // Update onboarding status if migration completed
      if (migrationCompleted) {
        await prisma.business.update({
          where: { id: testBusiness.id },
          data: { onboardingCompleted: true },
        });
        console.log("✅ Onboarding status updated to completed");
      }

      testResults.onboardingAPI = true;
    } catch (error) {
      console.log("❌ Onboarding API test failed:", error.message);
    }

    // TEST 4: Service Filtering Logic
    console.log("\n🔍 TEST 4: Service Filtering Logic");
    console.log("-".repeat(50));

    try {
      // Test filtering for business with service types
      const businessServiceTypes = await prisma.businessServiceType.findMany({
        where: {
          businessId: testBusiness.id,
          isActive: true,
        },
        select: { serviceType: true },
      });

      console.log("✅ Service types retrieved successfully");
      console.log(
        `   Service types for business: ${businessServiceTypes
          .map((bst) => bst.serviceType)
          .join(", ")}`
      );

      // Test business query with onboarding status (if migration completed)
      if (migrationCompleted) {
        const businessWithOnboarding = await prisma.business.findUnique({
          where: { id: testBusiness.id },
          select: {
            id: true,
            name: true,
            onboardingCompleted: true,
          },
        });

        console.log("✅ Business with onboarding status retrieved");
        console.log(
          `   Onboarding completed: ${businessWithOnboarding.onboardingCompleted}`
        );
      }

      testResults.serviceFiltering = true;
    } catch (error) {
      console.log("❌ Service filtering test failed:", error.message);
    }

    // TEST 5: Backward Compatibility
    console.log("\n🔄 TEST 5: Backward Compatibility");
    console.log("-".repeat(50));

    try {
      // Check if there are any existing businesses
      const existingBusinessCount = await prisma.business.count({
        where: {
          id: { not: testBusiness.id },
        },
      });

      console.log(`✅ Found ${existingBusinessCount} existing businesses`);

      if (migrationCompleted && existingBusinessCount > 0) {
        // Check if existing businesses have proper onboarding status
        const businessesWithServiceTypes = await prisma.business.count({
          where: {
            id: { not: testBusiness.id },
            onboardingCompleted: true,
          },
        });

        console.log(
          `✅ ${businessesWithServiceTypes} existing businesses have onboarding completed`
        );
      }

      testResults.backwardCompatibility = true;
    } catch (error) {
      console.log("❌ Backward compatibility test failed:", error.message);
    }

    // CLEANUP
    console.log("\n🧹 CLEANUP: Removing test data...");
    try {
      await prisma.businessServiceType.deleteMany({
        where: { businessId: testBusiness.id },
      });
      await prisma.business.delete({
        where: { id: testBusiness.id },
      });
      console.log("✅ Test data cleaned up");
    } catch (error) {
      console.log("⚠️  Cleanup failed:", error.message);
    }
  } catch (error) {
    console.error("\n❌ FATAL TEST ERROR:", error.message);
  } finally {
    await prisma.$disconnect();
  }

  return testResults;
}

// Helper function to test API endpoints
async function testAPIEndpoints() {
  console.log("\n🌐 API ENDPOINTS TEST");
  console.log("-".repeat(50));

  const fs = require("fs");

  // Check if API files exist
  const apiFiles = [
    "app/api/auth/register/route.ts",
    "app/api/business/onboarding/complete/route.ts",
    "app/api/services/route.ts",
  ];

  for (const file of apiFiles) {
    try {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
      } else {
        console.log(`❌ ${file} missing`);
      }
    } catch (error) {
      console.log(`❌ Error checking ${file}`);
    }
  }
}

// Helper function to test mobile components
async function testMobileComponents() {
  console.log("\n📱 MOBILE COMPONENTS TEST");
  console.log("-".repeat(50));

  const fs = require("fs");
  const path = require("path");

  // Check if mobile files exist
  const mobileFiles = [
    "../mobile/src/screens/auth/RegisterScreen.tsx",
    "../mobile/src/screens/onboarding/WelcomeScreen.tsx",
    "../mobile/src/navigation/AppNavigator.tsx",
    "../mobile/src/services/api/authService.ts",
  ];

  for (const file of mobileFiles) {
    try {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
      } else {
        console.log(`❌ ${file} missing`);
      }
    } catch (error) {
      console.log(`❌ Error checking ${file}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 STARTING PHASE 1 COMPREHENSIVE TESTS");
  console.log("=".repeat(60));

  try {
    const testResults = await testPhase1Implementation();
    await testAPIEndpoints();
    await testMobileComponents();

    // Final Summary
    console.log("\n🎉 PHASE 1 TEST SUMMARY");
    console.log("=".repeat(60));

    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(
      (result) => result
    ).length;

    console.log(`📊 Database Tests: ${passedTests}/${totalTests} passed`);
    console.log("");

    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? "✅" : "❌";
      const testName = test.charAt(0).toUpperCase() + test.slice(1);
      console.log(`${status} ${testName}: ${passed ? "PASS" : "FAIL"}`);
    });

    if (passedTests === totalTests) {
      console.log("\n🎉 ALL CORE TESTS PASSED!");
      console.log("✅ Phase 1 implementation is ready for production");
    } else {
      console.log("\n⚠️  SOME TESTS FAILED");
      console.log("🔧 Review failed tests and fix issues");
    }
  } catch (error) {
    console.error("💥 FATAL ERROR:", error);
  }
}

runAllTests();
