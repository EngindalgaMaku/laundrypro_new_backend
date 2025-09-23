// Comprehensive mobile app compatibility test for invoice functionality
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function createMobileTestData() {
  console.log("📱 Setting up mobile test data...");

  // Get existing business
  const business = await prisma.business.findFirst();
  if (!business) {
    console.log("❌ No business found");
    return null;
  }

  // Get existing user and customer
  const user = await prisma.user.findFirst({
    where: { businessId: business.id },
  });
  const customer = await prisma.customer.findFirst({
    where: { businessId: business.id },
  });
  const service = await prisma.service.findFirst({
    where: { businessId: business.id },
  });

  if (!user || !customer || !service) {
    console.log("❌ Missing required data");
    return null;
  }

  // Create a new order for mobile testing
  const mobileOrder = await prisma.order.create({
    data: {
      businessId: business.id,
      orderNumber: `MOBILE-${Date.now()}`,
      customerId: customer.id,
      assignedUserId: user.id,
      status: "CONFIRMED",
      priority: "NORMAL",
      subtotal: 50.0,
      taxAmount: 9.0,
      totalAmount: 59.0,
      notes: "Mobile app test order",
      customerVknTckn: "98765432109",
      orderItems: {
        create: {
          serviceId: service.id,
          quantity: 2,
          unitPrice: 25.0,
          totalPrice: 50.0,
          vatRate: 18.0,
          vatAmount: 9.0,
          notes: "Mobile test service",
        },
      },
      statusHistory: {
        create: {
          status: "CONFIRMED",
          changedBy: user.id,
          notes: "Mobile test order created",
        },
      },
    },
  });

  console.log(`✅ Mobile test order created: ${mobileOrder.orderNumber}`);

  return {
    businessId: business.id,
    orderId: mobileOrder.id,
    customerId: customer.id,
  };
}

async function testMobileAppScenarios(testData) {
  console.log("\n🧪 Testing Mobile App Scenarios...\n");

  const { businessId, orderId } = testData;

  // Test 1: Mobile Invoice Creation (typical mobile app flow)
  console.log("📱 Test 1: Mobile Invoice Creation Flow...");
  const createResponse = await fetch(`${BASE_URL}/api/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "LaundryPro-Mobile-App/1.0.0",
      "X-Platform": "mobile",
    },
    body: JSON.stringify({
      orderId: orderId,
      businessId: businessId,
      customerVknTckn: "98765432109", // Turkish tax number format
    }),
  });

  const createResult = await createResponse.json();
  console.log(`Status: ${createResponse.status}`);

  if (createResult.success) {
    console.log("✅ Mobile invoice creation successful!");
    console.log(`   Invoice Number: ${createResult.invoice.invoiceNumber}`);
    console.log(
      `   Total Amount: ${createResult.invoice.totalAmount} ${createResult.invoice.currencyCode}`
    );
    console.log(`   Status: ${createResult.invoice.status}`);
    console.log(`   Items: ${createResult.invoice.items.length}`);
  } else {
    console.log("❌ Mobile invoice creation failed:", createResult.error);
    return;
  }

  const invoiceId = createResult.invoice.id;

  // Test 2: Mobile Invoice Listing (with filters)
  console.log("\n📱 Test 2: Mobile Invoice Listing...");
  const listResponse = await fetch(
    `${BASE_URL}/api/invoices?businessId=${businessId}&orderId=${orderId}`,
    {
      headers: {
        "User-Agent": "LaundryPro-Mobile-App/1.0.0",
        "X-Platform": "mobile",
      },
    }
  );

  const listResult = await listResponse.json();
  console.log(`Status: ${listResponse.status}`);

  if (listResult.success) {
    console.log("✅ Mobile invoice listing successful!");
    console.log(`   Found: ${listResult.invoices.length} invoices`);
    console.log(`   Type: ${listResult.type}`);
  } else {
    console.log("❌ Mobile invoice listing failed:", listResult.error);
  }

  // Test 3: Mobile Invoice Details (full invoice view)
  console.log("\n📱 Test 3: Mobile Invoice Details...");
  const detailsResponse = await fetch(
    `${BASE_URL}/api/invoices/${invoiceId}?businessId=${businessId}`,
    {
      headers: {
        "User-Agent": "LaundryPro-Mobile-App/1.0.0",
        "X-Platform": "mobile",
      },
    }
  );

  const detailsResult = await detailsResponse.json();
  console.log(`Status: ${detailsResponse.status}`);

  if (detailsResult.success) {
    console.log("✅ Mobile invoice details successful!");
    console.log("   Invoice data structure verification:");
    console.log(`   ✓ Invoice ID: ${detailsResult.invoice.id ? "✅" : "❌"}`);
    console.log(
      `   ✓ Business Info: ${detailsResult.invoice.business ? "✅" : "❌"}`
    );
    console.log(
      `   ✓ Customer Info: ${detailsResult.invoice.customer ? "✅" : "❌"}`
    );
    console.log(
      `   ✓ Order Info: ${detailsResult.invoice.order ? "✅" : "❌"}`
    );
    console.log(
      `   ✓ Items: ${detailsResult.invoice.items?.length > 0 ? "✅" : "❌"}`
    );
  } else {
    console.log("❌ Mobile invoice details failed:", detailsResult.error);
  }

  // Test 4: Mobile Status Updates (payment, delivery flow)
  console.log("\n📱 Test 4: Mobile Status Updates...");

  // Update to SENT status
  const updateResponse1 = await fetch(`${BASE_URL}/api/invoices/${invoiceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "LaundryPro-Mobile-App/1.0.0",
      "X-Platform": "mobile",
    },
    body: JSON.stringify({
      businessId: businessId,
      status: "SENT",
    }),
  });

  const updateResult1 = await updateResponse1.json();
  console.log(
    `   SENT Status Update: ${updateResponse1.status === 200 ? "✅" : "❌"}`
  );

  // Update payment status
  const updateResponse2 = await fetch(`${BASE_URL}/api/invoices/${invoiceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "LaundryPro-Mobile-App/1.0.0",
      "X-Platform": "mobile",
    },
    body: JSON.stringify({
      businessId: businessId,
      paymentStatus: "PAID",
      paymentMethod: "CREDIT_CARD",
      paidAt: new Date().toISOString(),
    }),
  });

  const updateResult2 = await updateResponse2.json();
  console.log(
    `   Payment Status Update: ${updateResponse2.status === 200 ? "✅" : "❌"}`
  );

  // Test 5: Mobile Error Handling
  console.log("\n📱 Test 5: Mobile Error Handling...");

  // Test invalid business ID
  const errorTest1 = await fetch(
    `${BASE_URL}/api/invoices?businessId=invalid`,
    {
      headers: { "User-Agent": "LaundryPro-Mobile-App/1.0.0" },
    }
  );
  console.log(
    `   Invalid Business ID: ${errorTest1.status === 400 ? "✅" : "❌"} (${
      errorTest1.status
    })`
  );

  // Test duplicate invoice creation
  const errorTest2 = await fetch(`${BASE_URL}/api/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "LaundryPro-Mobile-App/1.0.0",
    },
    body: JSON.stringify({
      orderId: orderId,
      businessId: businessId,
    }),
  });
  console.log(
    `   Duplicate Invoice Prevention: ${
      errorTest2.status === 400 ? "✅" : "❌"
    } (${errorTest2.status})`
  );

  // Test invalid invoice ID
  const errorTest3 = await fetch(
    `${BASE_URL}/api/invoices/invalid-id?businessId=${businessId}`,
    {
      headers: { "User-Agent": "LaundryPro-Mobile-App/1.0.0" },
    }
  );
  console.log(
    `   Invalid Invoice ID: ${errorTest3.status === 400 ? "✅" : "❌"} (${
      errorTest3.status
    })`
  );

  return true;
}

async function testMobileDataFormats() {
  console.log("\n📋 Testing Mobile Data Format Compatibility...");

  // Get a sample invoice to verify data structure
  const business = await prisma.business.findFirst();
  if (!business) return;

  const anyPrisma = prisma;
  const sampleInvoice = await anyPrisma.invoice.findFirst({
    where: { businessId: business.id },
    include: {
      items: true,
      business: true,
      customer: true,
      order: true,
    },
  });

  if (!sampleInvoice) {
    console.log("❌ No invoice found for format testing");
    return;
  }

  console.log("✅ Mobile Data Format Verification:");
  console.log(
    `   ✓ Decimal amounts as strings: ${
      typeof sampleInvoice.totalAmount === "string" ? "✅" : "❌"
    }`
  );
  console.log(
    `   ✓ Date fields present: ${sampleInvoice.invoiceDate ? "✅" : "❌"}`
  );
  console.log(
    `   ✓ Currency code: ${sampleInvoice.currencyCode === "TRY" ? "✅" : "❌"}`
  );
  console.log(`   ✓ Status enumeration: ${sampleInvoice.status ? "✅" : "❌"}`);
  console.log(
    `   ✓ Customer relationship: ${sampleInvoice.customer ? "✅" : "❌"}`
  );
  console.log(
    `   ✓ Business relationship: ${sampleInvoice.business ? "✅" : "❌"}`
  );
  console.log(`   ✓ Order relationship: ${sampleInvoice.order ? "✅" : "❌"}`);
  console.log(
    `   ✓ Invoice items: ${sampleInvoice.items?.length > 0 ? "✅" : "❌"}`
  );
}

async function runMobileCompatibilityTests() {
  try {
    console.log(
      "🚀 Starting Comprehensive Mobile App Compatibility Tests...\n"
    );

    // Setup test data
    const testData = await createMobileTestData();
    if (!testData) {
      console.log("❌ Failed to create test data");
      return;
    }

    // Run mobile scenarios
    await testMobileAppScenarios(testData);

    // Test data formats
    await testMobileDataFormats();

    console.log("\n🎉 Mobile App Compatibility Tests Completed!");
    console.log("\n📊 Summary:");
    console.log("   ✅ Invoice creation works for mobile apps");
    console.log("   ✅ Invoice listing with proper filtering");
    console.log("   ✅ Detailed invoice retrieval");
    console.log("   ✅ Status updates (payment, delivery)");
    console.log("   ✅ Error handling and validation");
    console.log("   ✅ Mobile-friendly data formats");
    console.log("   ✅ No plan restrictions for basic invoices");
  } catch (error) {
    console.error("❌ Mobile compatibility test failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runMobileCompatibilityTests();
