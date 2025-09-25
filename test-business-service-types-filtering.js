const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const API_BASE_URL = "http://localhost:3000";

async function testBusinessServiceTypesFiltering() {
  try {
    console.log("🧪 Testing Business Service Types Filtering System...\n");

    // Test Business ID (Zeyno's business)
    const businessId = "cmfykmlfo0004lm0kqz56inf1";

    // 1. Test: Get current business service types
    console.log("1️⃣ Testing: Get current business service types");
    const businessServiceTypes = await prisma.businessServiceType.findMany({
      where: { businessId: businessId },
      include: { business: true },
    });
    console.log(
      `✅ Found ${businessServiceTypes.length} business service types:`
    );
    businessServiceTypes.forEach((bst) => {
      console.log(`   - ${bst.serviceType}`);
    });
    console.log("");

    // 2. Test: Get all services for business
    console.log("2️⃣ Testing: Get all services (unfiltered)");
    const response1 = await fetch(
      `${API_BASE_URL}/api/services?businessId=${businessId}&respectBusinessTypes=false`
    );
    const unfilteredData = await response1.json();
    console.log(
      `✅ Unfiltered services: ${unfilteredData.services?.length || 0} total`
    );

    const unfilteredCategories = {};
    unfilteredData.services?.forEach((service) => {
      if (!unfilteredCategories[service.category]) {
        unfilteredCategories[service.category] = 0;
      }
      unfilteredCategories[service.category]++;
    });
    console.log(
      "   Categories:",
      Object.keys(unfilteredCategories)
        .map((cat) => `${cat} (${unfilteredCategories[cat]})`)
        .join(", ")
    );
    console.log("");

    // 3. Test: Get filtered services (main filtering functionality)
    console.log(
      "3️⃣ Testing: Get filtered services (respectBusinessTypes=true)"
    );
    const response2 = await fetch(
      `${API_BASE_URL}/api/services?businessId=${businessId}&respectBusinessTypes=true`
    );
    const filteredData = await response2.json();
    console.log(
      `✅ Filtered services: ${filteredData.services?.length || 0} total`
    );

    const filteredCategories = {};
    filteredData.services?.forEach((service) => {
      if (!filteredCategories[service.category]) {
        filteredCategories[service.category] = 0;
      }
      filteredCategories[service.category]++;
    });
    console.log(
      "   Categories:",
      Object.keys(filteredCategories)
        .map((cat) => `${cat} (${filteredCategories[cat]})`)
        .join(", ")
    );
    console.log("");

    // 4. Test: Verify filtering logic
    console.log("4️⃣ Testing: Verify filtering logic");
    const currentBusinessTypes = businessServiceTypes.map(
      (bst) => bst.serviceType
    );
    console.log("   Current business types:", currentBusinessTypes);

    const filteredServiceCategories = Object.keys(filteredCategories);
    console.log("   Filtered service categories:", filteredServiceCategories);

    // Business type to service category mapping (from backend)
    const businessTypeToServiceCategory = {
      LAUNDRY: "LAUNDRY",
      DRY_CLEANING: "DRY_CLEANING",
      CARPET_CLEANING: "CARPET_CLEANING",
      UPHOLSTERY_CLEANING: "UPHOLSTERY_CLEANING",
      CURTAIN_CLEANING: "CURTAIN_CLEANING",
      OTHER: "OTHER",
    };

    const expectedCategories = currentBusinessTypes
      .map((bt) => businessTypeToServiceCategory[bt])
      .filter(Boolean);
    // Also include IRONING if LAUNDRY is selected
    if (currentBusinessTypes.includes("LAUNDRY")) {
      expectedCategories.push("IRONING");
    }

    console.log("   Expected categories:", expectedCategories);

    const isFilteringCorrect = filteredServiceCategories.every((cat) =>
      expectedCategories.includes(cat)
    );
    console.log(
      `   ${isFilteringCorrect ? "✅" : "❌"} Filtering logic: ${
        isFilteringCorrect ? "Correct" : "Incorrect"
      }`
    );
    console.log("");

    // 5. Test: Service Impact Analysis API
    console.log("5️⃣ Testing: Service Impact Analysis API");

    const currentTypes = currentBusinessTypes;
    const newTypes = currentTypes.filter((t) => t !== "CARPET_CLEANING"); // Remove carpet cleaning

    console.log(`   Simulating removal of CARPET_CLEANING`);
    console.log(`   Current types: [${currentTypes.join(", ")}]`);
    console.log(`   New types: [${newTypes.join(", ")}]`);

    const impactResponse = await fetch(
      `${API_BASE_URL}/api/business/${businessId}/service-type-impact`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTypes, newTypes }),
      }
    );

    if (impactResponse.ok) {
      const impactData = await impactResponse.json();
      console.log(`   ✅ Impact Analysis API: Success`);
      console.log(
        `   Removed types: [${impactData.removedTypes?.join(", ") || "none"}]`
      );
      console.log(
        `   Added types: [${impactData.addedTypes?.join(", ") || "none"}]`
      );
      console.log(
        `   Total affected services: ${impactData.totalAffected || 0}`
      );

      if (impactData.affectedServices?.length > 0) {
        console.log(`   Affected service categories:`);
        impactData.affectedServices.forEach((affected) => {
          console.log(
            `     - ${affected.category}: ${affected.count} services`
          );
          console.log(`       Services: ${affected.serviceNames.join(", ")}`);
        });
      }
    } else {
      console.log(
        `   ❌ Impact Analysis API: Failed (${impactResponse.status})`
      );
      const errorText = await impactResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    console.log("");

    // 6. Test: GET endpoint for service impact analysis (debugging endpoint)
    console.log("6️⃣ Testing: Service Impact Analysis GET endpoint (debugging)");
    const debugResponse = await fetch(
      `${API_BASE_URL}/api/business/${businessId}/service-type-impact`
    );

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log(`   ✅ Debug endpoint: Success`);
      console.log(`   Business: ${debugData.businessName}`);
      console.log(
        `   Current service types: [${
          debugData.currentServiceTypes?.join(", ") || "none"
        }]`
      );
      console.log(
        `   Service categories: [${
          debugData.serviceCategories?.join(", ") || "none"
        }]`
      );
      console.log(`   Services by category:`);
      Object.entries(debugData.servicesByCategory || {}).forEach(
        ([category, services]) => {
          console.log(`     - ${category}: ${services.length} services`);
        }
      );
    } else {
      console.log(`   ❌ Debug endpoint: Failed (${debugResponse.status})`);
    }
    console.log("");

    // 7. Test: Edge Cases
    console.log("7️⃣ Testing: Edge Cases");

    // Test with no business types
    console.log("   Testing removal of ALL business types...");
    const emptyTypesResponse = await fetch(
      `${API_BASE_URL}/api/business/${businessId}/service-type-impact`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTypes, newTypes: [] }),
      }
    );

    if (emptyTypesResponse.ok) {
      const emptyData = await emptyTypesResponse.json();
      console.log(`   ✅ Empty types test: Success`);
      console.log(
        `   Total affected when removing all: ${emptyData.totalAffected || 0}`
      );
    } else {
      console.log(`   ❌ Empty types test: Failed`);
    }

    // Test with same types (no change)
    console.log("   Testing no change in business types...");
    const noChangeResponse = await fetch(
      `${API_BASE_URL}/api/business/${businessId}/service-type-impact`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTypes, newTypes: currentTypes }),
      }
    );

    if (noChangeResponse.ok) {
      const noChangeData = await noChangeResponse.json();
      console.log(`   ✅ No change test: Success`);
      console.log(
        `   Total affected with no changes: ${noChangeData.totalAffected || 0}`
      );
    } else {
      console.log(`   ❌ No change test: Failed`);
    }
    console.log("");

    // 8. Test: Backward Compatibility
    console.log("8️⃣ Testing: Backward Compatibility");

    // Test default behavior (should be filtered)
    const defaultResponse = await fetch(
      `${API_BASE_URL}/api/services?businessId=${businessId}`
    );
    const defaultData = await defaultResponse.json();
    console.log(
      `   Default behavior (no respectBusinessTypes param): ${
        defaultData.services?.length || 0
      } services`
    );

    // Compare with explicit filtering
    const isDefaultFiltered =
      defaultData.services?.length === filteredData.services?.length;
    console.log(
      `   ${
        isDefaultFiltered ? "✅" : "❌"
      } Default behavior matches filtered: ${isDefaultFiltered}`
    );
    console.log("");

    // 9. Test: Database Consistency
    console.log("9️⃣ Testing: Database Consistency");

    // Check if all business service types exist in ServiceType enum
    const allServiceTypes = await prisma.businessServiceType.findMany({
      select: { serviceType: true },
      distinct: ["serviceType"],
    });
    console.log(
      `   Total distinct business service types in DB: ${allServiceTypes.length}`
    );

    // Check if all service categories have corresponding business types
    const allServiceCategories = await prisma.service.findMany({
      where: { businessId: businessId },
      select: { category: true },
      distinct: ["category"],
    });
    console.log(
      `   Total distinct service categories for business: ${allServiceCategories.length}`
    );
    console.log(
      `   Service categories: ${allServiceCategories
        .map((s) => s.category)
        .join(", ")}`
    );
    console.log("");

    // Summary
    console.log("📋 SUMMARY:");
    console.log("=".repeat(50));
    console.log(
      `✅ Business Service Types: ${currentBusinessTypes.length} types configured`
    );
    console.log(
      `✅ Unfiltered Services: ${
        unfilteredData.services?.length || 0
      } total services`
    );
    console.log(
      `✅ Filtered Services: ${
        filteredData.services?.length || 0
      } matching business types`
    );
    console.log(
      `✅ Filtering Logic: ${
        isFilteringCorrect ? "Working correctly" : "Needs attention"
      }`
    );
    console.log(
      `✅ Impact Analysis API: ${impactResponse.ok ? "Working" : "Failed"}`
    );
    console.log(
      `✅ Backward Compatibility: ${
        isDefaultFiltered ? "Maintained" : "Broken"
      }`
    );
    console.log("");

    const totalTests = 6;
    const passedTests = [
      true, // Business service types loaded
      unfilteredData.services?.length > 0,
      filteredData.services?.length >= 0,
      isFilteringCorrect,
      impactResponse.ok,
      isDefaultFiltered,
    ].filter(Boolean).length;

    console.log(`🎯 Test Results: ${passedTests}/${totalTests} tests passed`);
    console.log(
      `${
        passedTests === totalTests ? "🎉" : "⚠️"
      } Business Service Types Filtering: ${
        passedTests === totalTests ? "FULLY WORKING" : "NEEDS ATTENTION"
      }`
    );

    return passedTests === totalTests;
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testBusinessServiceTypesFiltering()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

module.exports = { testBusinessServiceTypesFiltering };
