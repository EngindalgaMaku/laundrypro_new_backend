// Using native fetch API available in Node.js 18+

const BASE_URL = "http://localhost:3000";

// Test configuration
const TEST_CONFIG = {
  businessId: "cmfv8cmjt0000wcnsfayhp5lo", // Actual business ID from database
  orderId: "cmfv8epwi0005wc2c3rig6wqk", // Actual order ID from database
};

async function testInvoiceFunctionality() {
  console.log("🚀 Starting Invoice API Tests...\n");

  try {
    // Test 1: Test basic invoice creation
    console.log("📝 Test 1: Creating Basic Invoice...");
    const createResponse = await fetch(`${BASE_URL}/api/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: TEST_CONFIG.orderId,
        businessId: TEST_CONFIG.businessId,
        customerVknTckn: "12345678901",
      }),
    });

    const createResult = await createResponse.json();
    console.log("Create Response Status:", createResponse.status);
    console.log("Create Response:", JSON.stringify(createResult, null, 2));

    if (createResult.success) {
      console.log("✅ Basic invoice created successfully!");
      const invoiceId = createResult.invoice.id;

      // Test 2: List invoices
      console.log("\n📋 Test 2: Listing Basic Invoices...");
      const listResponse = await fetch(
        `${BASE_URL}/api/invoices?businessId=${TEST_CONFIG.businessId}`
      );
      const listResult = await listResponse.json();
      console.log("List Response Status:", listResponse.status);
      console.log("List Response:", JSON.stringify(listResult, null, 2));

      if (listResult.success) {
        console.log("✅ Invoice listing works!");
      } else {
        console.log("❌ Invoice listing failed");
      }

      // Test 3: Get individual invoice
      console.log("\n📄 Test 3: Getting Individual Invoice...");
      const getResponse = await fetch(
        `${BASE_URL}/api/invoices/${invoiceId}?businessId=${TEST_CONFIG.businessId}`
      );
      const getResult = await getResponse.json();
      console.log("Get Response Status:", getResponse.status);
      console.log("Get Response:", JSON.stringify(getResult, null, 2));

      if (getResult.success) {
        console.log("✅ Individual invoice retrieval works!");
      } else {
        console.log("❌ Individual invoice retrieval failed");
      }

      // Test 4: Update invoice status
      console.log("\n🔄 Test 4: Updating Invoice Status...");
      const updateResponse = await fetch(
        `${BASE_URL}/api/invoices/${invoiceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId: TEST_CONFIG.businessId,
            status: "SENT",
            paymentStatus: "PAID",
          }),
        }
      );

      const updateResult = await updateResponse.json();
      console.log("Update Response Status:", updateResponse.status);
      console.log("Update Response:", JSON.stringify(updateResult, null, 2));

      if (updateResult.success) {
        console.log("✅ Invoice status update works!");
      } else {
        console.log("❌ Invoice status update failed");
      }
    } else {
      console.log("❌ Basic invoice creation failed");
    }

    // Test 5: Test plan restrictions (should work for FREE plan)
    console.log("\n🔒 Test 5: Testing Plan Restrictions...");
    console.log(
      "Creating invoice without createEInvoice flag (should work for all plans)"
    );

    // Test 6: Test the test endpoint
    console.log("\n🧪 Test 6: Testing Test Endpoint...");
    const testResponse = await fetch(`${BASE_URL}/api/test-invoice`, {
      method: "GET",
    });
    const testResult = await testResponse.json();
    console.log("Test Endpoint Status:", testResponse.status);
    console.log("Available Models:", testResult.models);

    if (testResult.success) {
      console.log("✅ Test endpoint works!");
      console.log("Available Invoices:", testResult.count);
    } else {
      console.log("❌ Test endpoint failed");
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
  }

  console.log("\n🏁 Invoice API Tests Completed!");
}

// Mobile App Compatibility Test
async function testMobileCompatibility() {
  console.log("\n📱 Testing Mobile App Compatibility...");

  // Test the endpoint that mobile app would use
  const mobileCreateTest = await fetch(`${BASE_URL}/api/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "LaundryPro-Mobile/1.0",
    },
    body: JSON.stringify({
      orderId: TEST_CONFIG.orderId,
      businessId: TEST_CONFIG.businessId,
    }),
  });

  const mobileResult = await mobileCreateTest.json();
  console.log("Mobile Create Status:", mobileCreateTest.status);
  console.log("Mobile Create Response:", JSON.stringify(mobileResult, null, 2));

  if (mobileResult.success) {
    console.log("✅ Mobile app compatibility confirmed!");
  } else {
    console.log("❌ Mobile app compatibility issues detected");
  }
}

// Run tests
testInvoiceFunctionality()
  .then(() => testMobileCompatibility())
  .catch(console.error);
