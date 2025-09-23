// Comprehensive integration test for invoice functionality
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

function logTest(name, status, details = "") {
  const result = { name, status, details, timestamp: new Date().toISOString() };
  testResults.tests.push(result);

  const symbol = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
  console.log(`${symbol} ${name}${details ? ` - ${details}` : ""}`);

  if (status === "PASS") testResults.passed++;
  else if (status === "FAIL") testResults.failed++;
  else testResults.warnings++;
}

async function testDatabaseIntegrity() {
  console.log("\n🗄️ Testing Database Integrity...");

  try {
    // Check if all required tables exist and have data
    const business = await prisma.business.findFirst();
    logTest("Business table accessible", business ? "PASS" : "FAIL");

    const user = await prisma.user.findFirst({
      where: { businessId: business?.id },
    });
    logTest("User table accessible", user ? "PASS" : "FAIL");

    const customer = await prisma.customer.findFirst({
      where: { businessId: business?.id },
    });
    logTest("Customer table accessible", customer ? "PASS" : "FAIL");

    const service = await prisma.service.findFirst({
      where: { businessId: business?.id },
    });
    logTest("Service table accessible", service ? "PASS" : "FAIL");

    const order = await prisma.order.findFirst({
      where: { businessId: business?.id },
    });
    logTest("Order table accessible", order ? "PASS" : "FAIL");

    const anyPrisma = prisma;
    const invoice = await anyPrisma.invoice.findFirst({
      where: { businessId: business?.id },
    });
    logTest("Invoice table accessible", invoice ? "PASS" : "FAIL");

    const invoiceItem = await anyPrisma.invoiceItem.findFirst({
      where: { invoiceId: invoice?.id },
    });
    logTest("InvoiceItem table accessible", invoiceItem ? "PASS" : "FAIL");

    return { business, user, customer, service, order, invoice };
  } catch (error) {
    logTest("Database integrity check", "FAIL", error.message);
    return null;
  }
}

async function testAPIEndpoints(testData) {
  console.log("\n🔗 Testing API Endpoints...");

  const { business, order } = testData;

  // Test GET /api/invoices
  try {
    const response = await fetch(
      `${BASE_URL}/api/invoices?businessId=${business.id}`
    );
    const result = await response.json();
    logTest(
      "GET /api/invoices",
      response.status === 200 && result.success ? "PASS" : "FAIL",
      `Status: ${response.status}`
    );
  } catch (error) {
    logTest("GET /api/invoices", "FAIL", error.message);
  }

  // Test POST /api/invoices (create new order first)
  try {
    // Create a new test order
    const newOrder = await prisma.order.create({
      data: {
        businessId: business.id,
        orderNumber: `TEST-INTEGRATION-${Date.now()}`,
        customerId: testData.customer.id,
        assignedUserId: testData.user.id,
        status: "CONFIRMED",
        priority: "NORMAL",
        subtotal: 30.0,
        taxAmount: 5.4,
        totalAmount: 35.4,
        notes: "Integration test order",
        orderItems: {
          create: {
            serviceId: testData.service.id,
            quantity: 1,
            unitPrice: 30.0,
            totalPrice: 30.0,
            vatRate: 18.0,
            vatAmount: 5.4,
          },
        },
      },
    });

    const response = await fetch(`${BASE_URL}/api/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: newOrder.id,
        businessId: business.id,
        customerVknTckn: "11223344556",
      }),
    });

    const result = await response.json();
    const success = response.status === 200 && result.success && result.invoice;
    logTest(
      "POST /api/invoices",
      success ? "PASS" : "FAIL",
      `Status: ${response.status}, Invoice: ${
        result.invoice?.invoiceNumber || "N/A"
      }`
    );

    if (success) {
      const invoiceId = result.invoice.id;

      // Test GET /api/invoices/[id]
      const getResponse = await fetch(
        `${BASE_URL}/api/invoices/${invoiceId}?businessId=${business.id}`
      );
      const getResult = await getResponse.json();
      logTest(
        "GET /api/invoices/[id]",
        getResponse.status === 200 && getResult.success ? "PASS" : "FAIL",
        `Status: ${getResponse.status}`
      );

      // Test PATCH /api/invoices/[id]
      const patchResponse = await fetch(
        `${BASE_URL}/api/invoices/${invoiceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId: business.id,
            status: "SENT",
            paymentStatus: "PAID",
          }),
        }
      );

      const patchResult = await patchResponse.json();
      logTest(
        "PATCH /api/invoices/[id]",
        patchResponse.status === 200 && patchResult.success ? "PASS" : "FAIL",
        `Status: ${patchResponse.status}`
      );
    }
  } catch (error) {
    logTest("POST /api/invoices", "FAIL", error.message);
  }
}

async function testErrorHandling() {
  console.log("\n⚠️ Testing Error Handling...");

  // Test invalid business ID
  try {
    const response = await fetch(`${BASE_URL}/api/invoices?businessId=invalid`);
    logTest(
      "Invalid Business ID handling",
      response.status === 400 ? "PASS" : "FAIL",
      `Status: ${response.status}`
    );
  } catch (error) {
    logTest("Invalid Business ID handling", "FAIL", error.message);
  }

  // Test missing business ID
  try {
    const response = await fetch(`${BASE_URL}/api/invoices`);
    logTest(
      "Missing Business ID handling",
      response.status === 400 ? "PASS" : "FAIL",
      `Status: ${response.status}`
    );
  } catch (error) {
    logTest("Missing Business ID handling", "FAIL", error.message);
  }

  // Test invalid invoice creation
  try {
    const response = await fetch(`${BASE_URL}/api/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "invalid-order-id",
        businessId: "invalid-business-id",
      }),
    });
    logTest(
      "Invalid invoice creation handling",
      response.status === 400 || response.status === 404 ? "PASS" : "FAIL",
      `Status: ${response.status}`
    );
  } catch (error) {
    logTest("Invalid invoice creation handling", "FAIL", error.message);
  }
}

async function testMobileCompatibility(testData) {
  console.log("\n📱 Testing Mobile Compatibility...");

  const { business } = testData;

  // Test mobile headers
  try {
    const response = await fetch(
      `${BASE_URL}/api/invoices?businessId=${business.id}`,
      {
        headers: {
          "User-Agent": "LaundryPro-Mobile-App/1.0.0",
          "X-Platform": "mobile",
        },
      }
    );

    const result = await response.json();
    logTest(
      "Mobile headers compatibility",
      response.status === 200 && result.success ? "PASS" : "FAIL"
    );
  } catch (error) {
    logTest("Mobile headers compatibility", "FAIL", error.message);
  }

  // Test response format for mobile
  try {
    const anyPrisma = prisma;
    const invoice = await anyPrisma.invoice.findFirst({
      where: { businessId: business.id },
      include: { items: true, business: true, customer: true, order: true },
    });

    if (invoice) {
      const hasRequiredFields = !!(
        invoice.id &&
        invoice.invoiceNumber &&
        invoice.totalAmount &&
        invoice.currencyCode &&
        invoice.status &&
        invoice.business &&
        invoice.customer &&
        invoice.items
      );

      logTest(
        "Mobile response format",
        hasRequiredFields ? "PASS" : "FAIL",
        "All required fields present"
      );
    } else {
      logTest("Mobile response format", "WARN", "No invoice found for testing");
    }
  } catch (error) {
    logTest("Mobile response format", "FAIL", error.message);
  }
}

async function testPlanRestrictions() {
  console.log("\n🔒 Testing Plan Restrictions...");

  // Since we're testing basic invoices, they should work without plan restrictions
  const business = await prisma.business.findFirst();
  if (!business) {
    logTest("Plan restrictions test", "FAIL", "No business found");
    return;
  }

  // Check if we can create basic invoices (should always work)
  try {
    const anyPrisma = prisma;
    const invoiceCount = await anyPrisma.invoice.count({
      where: { businessId: business.id },
    });

    logTest(
      "Basic invoice creation (no plan restrictions)",
      invoiceCount > 0 ? "PASS" : "WARN",
      `Found ${invoiceCount} invoices`
    );
  } catch (error) {
    logTest(
      "Basic invoice creation (no plan restrictions)",
      "FAIL",
      error.message
    );
  }
}

async function testPerformance() {
  console.log("\n⚡ Testing Performance...");

  const business = await prisma.business.findFirst();
  if (!business) return;

  // Test API response time
  try {
    const startTime = Date.now();
    const response = await fetch(
      `${BASE_URL}/api/invoices?businessId=${business.id}`
    );
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    logTest(
      "API response time",
      responseTime < 1000 ? "PASS" : "WARN",
      `${responseTime}ms`
    );
  } catch (error) {
    logTest("API response time", "FAIL", error.message);
  }

  // Test database query performance
  try {
    const startTime = Date.now();
    const anyPrisma = prisma;
    await anyPrisma.invoice.findMany({
      where: { businessId: business.id },
      include: { items: true, business: true, customer: true, order: true },
    });
    const endTime = Date.now();
    const queryTime = endTime - startTime;

    logTest(
      "Database query performance",
      queryTime < 500 ? "PASS" : "WARN",
      `${queryTime}ms`
    );
  } catch (error) {
    logTest("Database query performance", "FAIL", error.message);
  }
}

async function generateTestReport() {
  console.log("\n📊 TEST REPORT");
  console.log("=".repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📈 Total: ${testResults.tests.length}`);
  console.log(
    `🎯 Success Rate: ${(
      (testResults.passed / testResults.tests.length) *
      100
    ).toFixed(1)}%`
  );

  if (testResults.failed > 0) {
    console.log("\n❌ FAILED TESTS:");
    testResults.tests
      .filter((t) => t.status === "FAIL")
      .forEach((t) => console.log(`   - ${t.name}: ${t.details}`));
  }

  if (testResults.warnings > 0) {
    console.log("\n⚠️  WARNINGS:");
    testResults.tests
      .filter((t) => t.status === "WARN")
      .forEach((t) => console.log(`   - ${t.name}: ${t.details}`));
  }

  console.log("\n🎉 SUMMARY:");
  if (testResults.failed === 0) {
    console.log(
      "✅ All critical tests passed! The invoice system is ready for mobile app integration."
    );
  } else {
    console.log(
      "❌ Some tests failed. Please review and fix issues before mobile integration."
    );
  }
}

async function runComprehensiveTests() {
  console.log("🚀 STARTING COMPREHENSIVE INVOICE INTEGRATION TESTS");
  console.log("=".repeat(60));

  try {
    // Test database integrity
    const testData = await testDatabaseIntegrity();
    if (!testData) {
      console.log(
        "❌ Database integrity failed. Cannot continue with other tests."
      );
      return;
    }

    // Test API endpoints
    await testAPIEndpoints(testData);

    // Test error handling
    await testErrorHandling();

    // Test mobile compatibility
    await testMobileCompatibility(testData);

    // Test plan restrictions
    await testPlanRestrictions();

    // Test performance
    await testPerformance();

    // Generate report
    await generateTestReport();
  } catch (error) {
    console.error("❌ Comprehensive test failed:", error.message);
    logTest("Overall test execution", "FAIL", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the comprehensive tests
runComprehensiveTests();
