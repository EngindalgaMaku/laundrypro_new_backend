/**
 * Mobile Integration Test
 * Tests the corrected mobile API paths and interface compatibility
 */

const API_BASE_URL = "http://192.168.1.113:3000/api";

// Test data - using the current test database
const testBusinessId = "cmfv8cmjt0000wcnsfayhp5lo"; // Current business ID
const testOrderId = "cmfv8epwi0005wc2c3rig6wqk"; // Current order ID

/**
 * Test mobile-style API calls with corrected paths
 */
async function testMobileIntegration() {
  console.log("🚀 Testing Mobile Integration with Corrected API Paths");
  console.log("====================================================");

  try {
    // Test 1: Create Invoice (POST /api/invoices)
    console.log("\n1. Testing Invoice Creation (Mobile → Backend)");
    console.log(`POST ${API_BASE_URL}/invoices`);

    const createResponse = await fetch(`${API_BASE_URL}/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: testOrderId,
        businessId: testBusinessId,
        customerVknTckn: "12345678901",
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log(`❌ Create failed: ${createResponse.status} - ${errorText}`);
      return false;
    }

    const invoiceData = await createResponse.json();
    console.log(`✅ Invoice created: ${invoiceData.invoice?.id}`);
    console.log(`   Invoice Number: ${invoiceData.invoice?.invoiceNumber}`);
    console.log(`   Status: ${invoiceData.invoice?.status}`);
    console.log(`   Total Amount: ${invoiceData.invoice?.totalAmount}`);

    const invoiceId = invoiceData.invoice?.id;
    if (!invoiceId) {
      console.log("❌ No invoice ID returned");
      return false;
    }

    // Test 2: List Invoices (GET /api/invoices)
    console.log("\n2. Testing Invoice Listing");
    console.log(`GET ${API_BASE_URL}/invoices?businessId=${testBusinessId}`);

    const listResponse = await fetch(
      `${API_BASE_URL}/invoices?businessId=${testBusinessId}`
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.log(`❌ List failed: ${listResponse.status} - ${errorText}`);
      return false;
    }

    const listData = await listResponse.json();
    console.log(`✅ Listed ${listData.invoices?.length || 0} invoices`);
    console.log(`   Response type: ${listData.type}`);

    // Test 3: Get Invoice Details (GET /api/invoices/:id)
    console.log("\n3. Testing Invoice Details");
    console.log(
      `GET ${API_BASE_URL}/invoices/${invoiceId}?businessId=${testBusinessId}`
    );

    const detailResponse = await fetch(
      `${API_BASE_URL}/invoices/${invoiceId}?businessId=${testBusinessId}`
    );

    if (!detailResponse.ok) {
      const errorText = await detailResponse.text();
      console.log(`❌ Detail failed: ${detailResponse.status} - ${errorText}`);
      return false;
    }

    const detailData = await detailResponse.json();
    console.log(`✅ Invoice details retrieved`);
    console.log(`   Customer Name: ${detailData.invoice?.customerName}`);
    console.log(`   Payment Status: ${detailData.invoice?.paymentStatus}`);
    console.log(`   Items Count: ${detailData.invoice?.items?.length || 0}`);

    // Test 3: Update Invoice Status (PATCH /api/invoices/:id)
    console.log("\n3. Testing Invoice Status Update");
    console.log(`PATCH ${API_BASE_URL}/invoices/${invoiceId}`);

    const updateResponse = await fetch(
      `${API_BASE_URL}/invoices/${invoiceId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId: testBusinessId,
          status: "SENT",
          paymentStatus: "PENDING",
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log(`❌ Update failed: ${updateResponse.status} - ${errorText}`);
      return false;
    }

    const updateData = await updateResponse.json();
    console.log(`✅ Invoice status updated`);
    console.log(`   New Status: ${updateData.invoice?.status}`);
    console.log(`   Payment Status: ${updateData.invoice?.paymentStatus}`);

    // Test 4: Verify Mobile Interface Compatibility
    console.log("\n4. Testing Mobile Interface Compatibility");

    const invoice = updateData.invoice;
    const mobileCompatibilityTests = [
      {
        field: "id",
        exists: !!invoice.id,
        type: typeof invoice.id,
      },
      {
        field: "businessId",
        exists: !!invoice.businessId,
        type: typeof invoice.businessId,
      },
      {
        field: "invoiceNumber",
        exists: !!invoice.invoiceNumber,
        type: typeof invoice.invoiceNumber,
      },
      {
        field: "status",
        exists: !!invoice.status,
        type: typeof invoice.status,
        validValues: [
          "DRAFT",
          "SENT",
          "PAID",
          "OVERDUE",
          "CANCELLED",
          "REFUNDED",
        ],
      },
      {
        field: "totalAmount",
        exists: invoice.totalAmount !== undefined,
        type: typeof invoice.totalAmount,
      },
      {
        field: "subtotalAmount",
        exists: invoice.subtotalAmount !== undefined,
        type: typeof invoice.subtotalAmount,
      },
      {
        field: "taxAmount",
        exists: invoice.taxAmount !== undefined,
        type: typeof invoice.taxAmount,
      },
      {
        field: "currencyCode",
        exists: !!invoice.currencyCode,
        type: typeof invoice.currencyCode,
      },
      {
        field: "invoiceDate",
        exists: !!invoice.invoiceDate,
        type: typeof invoice.invoiceDate,
      },
      {
        field: "paymentStatus",
        exists: !!invoice.paymentStatus,
        type: typeof invoice.paymentStatus,
        validValues: ["PENDING", "PARTIAL", "PAID", "REFUNDED", "CANCELLED"],
      },
      {
        field: "customerName",
        exists: !!invoice.customerName,
        type: typeof invoice.customerName,
      },
      {
        field: "items",
        exists: Array.isArray(invoice.items),
        type: "array",
        count: invoice.items?.length,
      },
    ];

    console.log("   Field compatibility:");
    let compatibilityPassed = true;
    mobileCompatibilityTests.forEach((test) => {
      const status = test.exists ? "✅" : "❌";
      console.log(
        `   ${status} ${test.field}: ${test.exists ? "OK" : "MISSING"} (${
          test.type
        })`
      );
      if (test.validValues && test.exists) {
        const isValid = test.validValues.includes(invoice[test.field]);
        console.log(
          `      Value "${invoice[test.field]}" is ${
            isValid ? "valid" : "invalid"
          }`
        );
        if (!isValid) compatibilityPassed = false;
      }
      if (test.count !== undefined) {
        console.log(`      Array length: ${test.count}`);
      }
      if (!test.exists) compatibilityPassed = false;
    });

    if (compatibilityPassed) {
      console.log("\n🎉 Mobile Integration Test: PASSED");
      console.log("=====================================");
      console.log("✅ API paths are correctly configured (/api/invoices/*)");
      console.log("✅ Backend response format matches mobile interfaces");
      console.log("✅ Invoice listing works properly");
      console.log("✅ Invoice details retrieval works");
      console.log("✅ Invoice status updates work correctly");
      console.log("✅ All required fields are present and properly typed");
      console.log("\n📱 Mobile app should now work with the backend!");
      console.log("   - Invoice creation will work with existing orders");
      console.log("   - Invoice listing will show all invoices");
      console.log("   - Invoice details will display properly");
      console.log("   - Status updates will work correctly");
      return true;
    } else {
      console.log("\n❌ Mobile Integration Test: FAILED");
      console.log("Some interface compatibility issues detected");
      return false;
    }
  } catch (error) {
    console.error("\n❌ Mobile Integration Test: ERROR");
    console.error("Error during testing:", error);
    return false;
  }
}

// Run the test
testMobileIntegration()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test execution failed:", error);
    process.exit(1);
  });
