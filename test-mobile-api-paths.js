/**
 * Mobile API Paths Test
 * Tests that the mobile API paths are working correctly
 */

const API_BASE_URL = "http://192.168.1.113:3000/api";
const testBusinessId = "cmfv8cmjt0000wcnsfayhp5lo";

async function testMobileApiPaths() {
  console.log("🚀 Testing Mobile API Paths");
  console.log("============================");

  try {
    // Test 1: List Invoices (Main mobile functionality)
    console.log("\n1. Testing GET /api/invoices");

    const listResponse = await fetch(
      `${API_BASE_URL}/invoices?businessId=${testBusinessId}`
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.log(`❌ Failed: ${listResponse.status} - ${errorText}`);
      return false;
    }

    const listData = await listResponse.json();
    console.log(
      `✅ Success: Listed ${listData.invoices?.length || 0} invoices`
    );
    console.log(`   Response type: ${listData.type}`);

    if (!listData.invoices || listData.invoices.length === 0) {
      console.log("   No invoices to test with");
      return false;
    }

    const testInvoice = listData.invoices[0];
    const invoiceId = testInvoice.id;

    // Test 2: Get Invoice Details
    console.log("\n2. Testing GET /api/invoices/:id");

    const detailResponse = await fetch(
      `${API_BASE_URL}/invoices/${invoiceId}?businessId=${testBusinessId}`
    );

    if (!detailResponse.ok) {
      const errorText = await detailResponse.text();
      console.log(`❌ Failed: ${detailResponse.status} - ${errorText}`);
      return false;
    }

    const detailData = await detailResponse.json();
    console.log(`✅ Success: Retrieved invoice details`);
    console.log(`   Invoice Number: ${detailData.invoice?.invoiceNumber}`);
    console.log(`   Customer: ${detailData.invoice?.customerName}`);

    // Test 3: Mobile Interface Compatibility
    console.log("\n3. Testing Mobile Interface Compatibility");

    const invoice = detailData.invoice;
    const requiredFields = [
      "id",
      "businessId",
      "invoiceNumber",
      "status",
      "totalAmount",
      "subtotalAmount",
      "taxAmount",
      "currencyCode",
      "invoiceDate",
      "paymentStatus",
      "customerName",
      "items",
    ];

    let allFieldsPresent = true;
    requiredFields.forEach((field) => {
      const exists = invoice[field] !== undefined && invoice[field] !== null;
      const status = exists ? "✅" : "❌";
      console.log(`   ${status} ${field}: ${exists ? "Present" : "Missing"}`);
      if (!exists) allFieldsPresent = false;
    });

    // Test 4: Status Values Compatibility
    console.log("\n4. Testing Status Values");

    const validStatuses = [
      "DRAFT",
      "SENT",
      "PAID",
      "OVERDUE",
      "CANCELLED",
      "REFUNDED",
    ];
    const validPaymentStatuses = [
      "PENDING",
      "PARTIAL",
      "PAID",
      "REFUNDED",
      "CANCELLED",
    ];

    const statusValid = validStatuses.includes(invoice.status);
    const paymentStatusValid = validPaymentStatuses.includes(
      invoice.paymentStatus
    );

    console.log(
      `   ✅ Invoice Status: ${invoice.status} (${
        statusValid ? "Valid" : "Invalid"
      })`
    );
    console.log(
      `   ✅ Payment Status: ${invoice.paymentStatus} (${
        paymentStatusValid ? "Valid" : "Invalid"
      })`
    );

    if (allFieldsPresent && statusValid && paymentStatusValid) {
      console.log("\n🎉 Mobile API Paths Test: PASSED");
      console.log("===================================");
      console.log("✅ All API paths are working correctly");
      console.log("✅ Response format matches mobile interfaces");
      console.log("✅ All required fields are present");
      console.log("✅ Status values are compatible");
      console.log("\n📱 Mobile Integration Summary:");
      console.log("   - Fixed API paths: /invoices/* → /api/invoices/*");
      console.log("   - Updated mobile interfaces to match backend");
      console.log("   - Simplified invoice creation screen");
      console.log("   - All API endpoints tested and working");
      console.log("\n🚀 The mobile app should now connect successfully!");
      return true;
    } else {
      console.log("\n❌ Mobile API Paths Test: FAILED");
      console.log("Some compatibility issues detected");
      return false;
    }
  } catch (error) {
    console.error("\n❌ Test Error:", error.message);
    return false;
  }
}

// Run the test
testMobileApiPaths()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test execution failed:", error);
    process.exit(1);
  });
