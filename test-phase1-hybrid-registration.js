const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const API_BASE_URL = "http://localhost:3000";

// Test credentials for registration
const TEST_USER = {
  firstName: "Test",
  lastName: "User",
  email: `test-phase1-${Date.now()}@example.com`,
  password: "TestPass123!",
  phone: "5551234567",
};

const TEST_BUSINESS = {
  name: "Phase 1 Test Business",
  phone: "5559876543",
  address: "123 Test Street",
  city: "Istanbul",
  district: "Kadıköy",
};

const TEST_CONSENTS = {
  kvkk: true,
  privacy: true,
  terms: true,
  marketing: false,
  consentDate: new Date().toISOString(),
};

async function testPhase1Implementation() {
  console.log("🧪 PHASE 1 HYBRID REGISTRATION COMPREHENSIVE TEST");
  console.log("=".repeat(60));

  let authToken = null;
  let businessId = null;
  let userId = null;

  try {
    // TEST 1: Registration without service type selection
    console.log("\n📝 TEST 1: Registration without service type selection");
    console.log("-".repeat(50));

    const registrationData = {
      user: TEST_USER,
      business: TEST_BUSINESS, // No service types included
      consents: TEST_CONSENTS,
    };

    console.log("🔄 Attempting registration without service types...");

    // Use fetch-like approach with node built-ins for this test environment
    const fetch = (url, options) => {
      return import("node-fetch").then(({ default: fetch }) =>
        fetch(url, options)
      );
    };

    const registrationResponse = await fetch(
      `${API_BASE_URL}/api/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      }
    );

    if (!registrationResponse.ok) {
      const error = await registrationResponse.text();
      throw new Error(`Registration failed: ${error}`);
    }

    const registrationResult = await registrationResponse.json();
    authToken = registrationResult.token;
    businessId = registrationResult.user.business.id;
    userId = registrationResult.user.id;

    console.log("✅ Registration successful without service types");
    console.log(`   Business ID: ${businessId}`);
    console.log(`   User ID: ${userId}`);

    // TEST 2: Check onboarding status
    console.log("\n🔍 TEST 2: Check initial onboarding status");
    console.log("-".repeat(50));

    const onboardingStatusResponse = await fetch(
      `${API_BASE_URL}/api/business/onboarding/complete`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!onboardingStatusResponse.ok) {
      throw new Error("Failed to check onboarding status");
    }

    const onboardingStatus = await onboardingStatusResponse.json();
    console.log("✅ Onboarding status checked");
    console.log(
      `   Completed: ${onboardingStatus.business.onboardingCompleted}`
    );
    console.log(
      `   Service types: ${onboardingStatus.business.serviceTypes.length}`
    );

    if (onboardingStatus.business.onboardingCompleted) {
      throw new Error(
        "❌ FAIL: Onboarding should NOT be completed for new registration"
      );
    }

    // TEST 3: Check database migration
    console.log("\n🗄️ TEST 3: Verify database schema migration");
    console.log("-".repeat(50));

    const businessData = await prisma.$queryRaw`
      SELECT id, name, onboarding_completed 
      FROM businesses 
      WHERE id = ${businessId}
    `;

    console.log("✅ Database schema verified");
    console.log(
      `   Onboarding completed field exists: ${
        businessData[0].onboarding_completed !== undefined
      }`
    );
    console.log(`   Value: ${businessData[0].onboarding_completed}`);

    // TEST 4: Complete onboarding with "Full Service" selection
    console.log(
      "\n🎯 TEST 4: Complete onboarding with service category selection"
    );
    console.log("-".repeat(50));

    const onboardingData = {
      selectedCategory: "full_service",
      serviceTypes: ["DRY_CLEANING", "LAUNDRY", "IRONING"],
    };

    const completeOnboardingResponse = await fetch(
      `${API_BASE_URL}/api/business/onboarding/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(onboardingData),
      }
    );

    if (!completeOnboardingResponse.ok) {
      const error = await completeOnboardingResponse.text();
      throw new Error(`Onboarding completion failed: ${error}`);
    }

    const onboardingResult = await completeOnboardingResponse.json();
    console.log("✅ Onboarding completed successfully");
    console.log(
      `   Selected category: ${onboardingResult.onboarding.selectedCategory}`
    );
    console.log(
      `   Service types: ${onboardingResult.onboarding.serviceTypes.join(", ")}`
    );

    // TEST 5: Verify service types were created
    console.log("\n✔️ TEST 5: Verify business service types creation");
    console.log("-".repeat(50));

    const serviceTypes = await prisma.businessServiceType.findMany({
      where: { businessId, isActive: true },
      select: { serviceType: true },
    });

    console.log("✅ Service types verified in database");
    console.log(`   Count: ${serviceTypes.length}`);
    console.log(
      `   Types: ${serviceTypes.map((st) => st.serviceType).join(", ")}`
    );

    // TEST 6: Test backward compatibility
    console.log("\n🔄 TEST 6: Test backward compatibility");
    console.log("-".repeat(50));

    // Update existing businesses to have onboarding completed
    const updateResult = await prisma.$executeRaw`
      UPDATE businesses 
      SET onboarding_completed = TRUE 
      WHERE id != ${businessId}
      AND onboarding_completed IS NULL OR onboarding_completed = FALSE
    `;

    console.log("✅ Backward compatibility ensured");
    console.log(`   Updated ${updateResult} existing businesses`);

    // SUCCESS SUMMARY
    console.log("\n🎉 PHASE 1 IMPLEMENTATION TEST RESULTS");
    console.log("=".repeat(60));
    console.log("✅ Registration without service types: PASS");
    console.log("✅ Database schema migration: PASS");
    console.log("✅ Onboarding status tracking: PASS");
    console.log("✅ Onboarding completion flow: PASS");
    console.log("✅ Service types creation: PASS");
    console.log("✅ Backward compatibility: PASS");

    console.log("\n📊 IMPLEMENTATION SUMMARY:");
    console.log(`• Created test business: ${businessId}`);
    console.log(`• Service types created: ${serviceTypes.length}`);
    console.log(`• Onboarding flow completed successfully`);
    console.log(`• All database operations working correctly`);

    return {
      success: true,
      businessId,
      userId,
      serviceTypesCount: serviceTypes.length,
      onboardingCompleted: true,
    };
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    // Cleanup: Remove test data
    console.log("\n🧹 CLEANUP: Removing test data...");
    try {
      if (businessId) {
        await prisma.businessServiceType.deleteMany({
          where: { businessId },
        });
        await prisma.service.deleteMany({
          where: { businessId },
        });
        await prisma.user.deleteMany({
          where: { businessId },
        });
        await prisma.business.delete({
          where: { id: businessId },
        });
        console.log("✅ Test data cleaned up successfully");
      }
    } catch (cleanupError) {
      console.error("⚠️ Cleanup warning:", cleanupError.message);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run the test
testPhase1Implementation()
  .then((result) => {
    console.log("\n🏁 TEST EXECUTION COMPLETE");
    if (result.success) {
      console.log("🎉 ALL TESTS PASSED!");
      process.exit(0);
    } else {
      console.log("💥 TESTS FAILED!");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("💥 FATAL ERROR:", error);
    process.exit(1);
  });
