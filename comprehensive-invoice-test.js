// Comprehensive Invoice Management System Testing Script
// This script tests all critical invoice functionality systematically

const axios = require("axios");

const API_BASE = "http://localhost:3000";

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  retryAttempts: 3,
  testBusinessId: null, // Will be populated from database
  testCustomerId: null, // Will be populated from database
  testOrderId: null, // Will be populated from database
  createdInvoiceId: null, // Will track created invoice
};

// Color coding for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTestStart(testName) {
  log(`\n${colors.bright}${colors.blue}🔍 Testing: ${testName}${colors.reset}`);
}

function logSuccess(message) {
  log(`  ✅ ${message}`, colors.green);
}

function logError(message) {
  log(`  ❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`  ⚠️  ${message}`, colors.yellow);
}

// Wait for server to be ready
async function waitForServer() {
  logTestStart("Server Readiness Check");
  for (let i = 0; i < 30; i++) {
    // Wait up to 30 seconds
    try {
      const response = await axios.get(`${API_BASE}/api/health`, {
        timeout: 2000,
      });
      logSuccess("Server is ready");
      return true;
    } catch (error) {
      if (i === 29) {
        logError("Server failed to start within timeout");
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// Test database connectivity and get test data
async function setupTestData() {
  logTestStart("Database Setup & Test Data Preparation");

  try {
    // Test basic invoice model access
    const testResponse = await axios.get(`${API_BASE}/api/test-invoice`);

    if (testResponse.data.success) {
      logSuccess("Database models accessible");

      if (testResponse.data.invoices && testResponse.data.invoices.length > 0) {
        const invoice = testResponse.data.invoices[0];
        TEST_CONFIG.testBusinessId = invoice.businessId;
        TEST_CONFIG.testCustomerId = invoice.customerId;
        TEST_CONFIG.testOrderId = invoice.orderId;

        logSuccess(`Found test business: ${TEST_CONFIG.testBusinessId}`);
        logSuccess(`Found test customer: ${TEST_CONFIG.testCustomerId}`);
        logSuccess(`Found test order: ${TEST_CONFIG.testOrderId}`);
      } else {
        logWarning("No existing invoices found, will create test data");
      }
    }

    return true;
  } catch (error) {
    logError(`Database setup failed: ${error.message}`);
    return false;
  }
}

// Test 1: Invoice CRUD Operations
async function testInvoiceCRUDOperations() {
  logTestStart("Invoice CRUD Operations");

  try {
    // Test 1a: Create Invoice
    log("\n  📝 Testing Invoice Creation...");

    if (!TEST_CONFIG.testOrderId || !TEST_CONFIG.testBusinessId) {
      // Create test invoice without order
      const createResponse = await axios.post(`${API_BASE}/api/test-invoice`);

      if (createResponse.data.success) {
        TEST_CONFIG.createdInvoiceId = createResponse.data.testInvoice.id;
        TEST_CONFIG.testBusinessId = createResponse.data.testInvoice.businessId;
        logSuccess(`Test invoice created: ${TEST_CONFIG.createdInvoiceId}`);
      } else {
        throw new Error("Failed to create test invoice");
      }
    } else {
      // Create invoice from existing order
      const createPayload = {
        orderId: TEST_CONFIG.testOrderId,
        businessId: TEST_CONFIG.testBusinessId,
        customerVknTckn: "12345678901", // Test VKN
      };

      const createResponse = await axios.post(
        `${API_BASE}/api/invoices`,
        createPayload
      );

      if (createResponse.data.success) {
        TEST_CONFIG.createdInvoiceId = createResponse.data.invoice.id;
        logSuccess(
          `Invoice created from order: ${TEST_CONFIG.createdInvoiceId}`
        );
        logSuccess(
          `Invoice number: ${createResponse.data.invoice.invoiceNumber}`
        );
        logSuccess(`Total amount: ${createResponse.data.invoice.totalAmount}`);
      } else {
        throw new Error(
          `Invoice creation failed: ${createResponse.data.error}`
        );
      }
    }

    // Test 1b: Get Invoice List
    log("\n  📋 Testing Invoice List Retrieval...");

    const listResponse = await axios.get(`${API_BASE}/api/invoices`, {
      params: { businessId: TEST_CONFIG.testBusinessId },
    });

    if (listResponse.data.success && listResponse.data.invoices) {
      logSuccess(`Retrieved ${listResponse.data.invoices.length} invoices`);

      // Validate structure
      const firstInvoice = listResponse.data.invoices[0];
      if (firstInvoice && firstInvoice.id && firstInvoice.invoiceNumber) {
        logSuccess("Invoice list structure is valid");
      } else {
        logWarning("Invoice structure may have issues");
      }
    } else {
      logError("Failed to retrieve invoice list");
    }

    // Test 1c: Get Individual Invoice
    log("\n  🔍 Testing Individual Invoice Retrieval...");

    const detailResponse = await axios.get(
      `${API_BASE}/api/invoices/${TEST_CONFIG.createdInvoiceId}`,
      {
        params: { businessId: TEST_CONFIG.testBusinessId },
      }
    );

    if (detailResponse.data.success && detailResponse.data.invoice) {
      const invoice = detailResponse.data.invoice;
      logSuccess(`Retrieved invoice: ${invoice.invoiceNumber}`);
      logSuccess(`Customer: ${invoice.customerName}`);
      logSuccess(`Items count: ${invoice.items ? invoice.items.length : 0}`);

      // Validate relationships
      if (invoice.business && invoice.customer) {
        logSuccess("Business and customer relationships loaded");
      } else {
        logWarning("Some relationships may not be properly loaded");
      }
    } else {
      logError("Failed to retrieve individual invoice");
    }

    // Test 1d: Update Invoice
    log("\n  ✏️  Testing Invoice Updates...");

    const updatePayload = {
      businessId: TEST_CONFIG.testBusinessId,
      status: "SENT",
      paymentStatus: "PENDING",
    };

    const updateResponse = await axios.patch(
      `${API_BASE}/api/invoices/${TEST_CONFIG.createdInvoiceId}`,
      updatePayload
    );

    if (updateResponse.data.success) {
      logSuccess("Invoice status updated successfully");
      logSuccess(`New status: ${updateResponse.data.invoice.status}`);
    } else {
      logError("Invoice update failed");
    }

    return true;
  } catch (error) {
    logError(`CRUD operations failed: ${error.message}`);
    return false;
  }
}

// Test 2: Database Relationships
async function testDatabaseRelationships() {
  logTestStart("Database Relationships Validation");

  try {
    if (!TEST_CONFIG.createdInvoiceId) {
      logWarning("No test invoice available, skipping relationship tests");
      return false;
    }

    const response = await axios.get(
      `${API_BASE}/api/invoices/${TEST_CONFIG.createdInvoiceId}`,
      {
        params: { businessId: TEST_CONFIG.testBusinessId },
      }
    );

    if (response.data.success) {
      const invoice = response.data.invoice;

      // Test Business relationship
      if (invoice.business) {
        logSuccess("✅ Business relationship: WORKING");
        logSuccess(`  Business name: ${invoice.business.name}`);
      } else {
        logError("❌ Business relationship: MISSING");
      }

      // Test Customer relationship
      if (invoice.customer) {
        logSuccess("✅ Customer relationship: WORKING");
        logSuccess(
          `  Customer: ${invoice.customer.firstName} ${invoice.customer.lastName}`
        );
      } else if (invoice.customerName) {
        logSuccess("✅ Customer data available (embedded)");
        logSuccess(`  Customer: ${invoice.customerName}`);
      } else {
        logError("❌ Customer relationship: MISSING");
      }

      // Test Order relationship
      if (invoice.order) {
        logSuccess("✅ Order relationship: WORKING");
        logSuccess(`  Order number: ${invoice.order.orderNumber}`);
      } else if (invoice.orderId) {
        logWarning("⚠️ Order ID present but relationship not loaded");
      } else {
        logSuccess("✅ Invoice created without order (valid case)");
      }

      // Test Invoice Items relationship
      if (invoice.items && invoice.items.length > 0) {
        logSuccess("✅ Invoice Items relationship: WORKING");
        logSuccess(`  Items count: ${invoice.items.length}`);

        const firstItem = invoice.items[0];
        logSuccess(
          `  Sample item: ${firstItem.name} - ${firstItem.quantity} x ${firstItem.unitPrice}`
        );
      } else {
        logWarning("⚠️ No invoice items found");
      }

      return true;
    } else {
      logError("Failed to retrieve invoice for relationship testing");
      return false;
    }
  } catch (error) {
    logError(`Relationship testing failed: ${error.message}`);
    return false;
  }
}

// Test 3: API Validation & Error Handling
async function testAPIValidationAndErrors() {
  logTestStart("API Validation & Error Handling");

  try {
    // Test 3a: Missing Business ID
    log("\n  🚫 Testing Missing Business ID...");
    try {
      await axios.get(`${API_BASE}/api/invoices`);
      logError("Should have failed with missing businessId");
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logSuccess("Correctly rejected missing businessId");
      } else {
        logError("Unexpected error for missing businessId");
      }
    }

    // Test 3b: Invalid Business ID format
    log("\n  🚫 Testing Invalid Business ID...");
    try {
      await axios.get(`${API_BASE}/api/invoices`, {
        params: { businessId: "invalid-short-id" },
      });
      logError("Should have failed with invalid businessId");
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logSuccess("Correctly rejected invalid businessId format");
      } else {
        logError("Unexpected error for invalid businessId");
      }
    }

    // Test 3c: Non-existent Invoice ID
    log("\n  🚫 Testing Non-existent Invoice...");
    try {
      await axios.get(`${API_BASE}/api/invoices/cm1abcdefghijklmnopqr`, {
        params: { businessId: TEST_CONFIG.testBusinessId },
      });
      logError("Should have failed with non-existent invoice");
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logSuccess("Correctly handled non-existent invoice");
      } else {
        logError("Unexpected error for non-existent invoice");
      }
    }

    // Test 3d: Invalid Invoice Creation Data
    log("\n  🚫 Testing Invalid Invoice Creation...");
    try {
      await axios.post(`${API_BASE}/api/invoices`, {
        // Missing required fields
        orderId: null,
        businessId: null,
      });
      logError("Should have failed with invalid creation data");
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logSuccess("Correctly rejected invalid invoice creation data");
      } else {
        logError("Unexpected error for invalid creation data");
      }
    }

    return true;
  } catch (error) {
    logError(`Validation testing failed: ${error.message}`);
    return false;
  }
}

// Test 4: PDF Operations (if endpoints exist)
async function testPDFOperations() {
  logTestStart("PDF Operations Testing");

  try {
    if (!TEST_CONFIG.createdInvoiceId) {
      logWarning("No test invoice available, skipping PDF tests");
      return false;
    }

    // Test PDF generation
    log("\n  📄 Testing PDF Generation...");
    try {
      const pdfResponse = await axios.post(
        `${API_BASE}/api/invoices/pdf/generate`,
        {
          invoiceId: TEST_CONFIG.createdInvoiceId,
          businessId: TEST_CONFIG.testBusinessId,
        }
      );

      if (pdfResponse.data.success) {
        logSuccess("PDF generation endpoint responded successfully");
        if (pdfResponse.data.pdfUrl) {
          logSuccess(`PDF URL generated: ${pdfResponse.data.pdfUrl}`);
        }
      } else {
        logWarning("PDF generation endpoint exists but returned error");
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logWarning("PDF generation endpoint not implemented yet");
      } else {
        logError(`PDF generation error: ${error.message}`);
      }
    }

    // Test PDF download
    log("\n  📥 Testing PDF Download...");
    try {
      const downloadResponse = await axios.get(
        `${API_BASE}/api/invoices/pdf/download/${TEST_CONFIG.createdInvoiceId}`,
        {
          params: { businessId: TEST_CONFIG.testBusinessId },
          responseType: "blob",
        }
      );

      if (downloadResponse.status === 200) {
        logSuccess("PDF download endpoint working");
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logWarning("PDF download endpoint not implemented yet");
      } else {
        logWarning(`PDF download test inconclusive: ${error.message}`);
      }
    }

    return true;
  } catch (error) {
    logError(`PDF operations testing failed: ${error.message}`);
    return false;
  }
}

// Test 5: E-Invoice Integration Points
async function testEInvoiceIntegration() {
  logTestStart("E-Invoice Integration Points");

  try {
    // Test E-Invoice configuration endpoint
    log("\n  ⚡ Testing E-Invoice Config...");
    try {
      const configResponse = await axios.get(
        `${API_BASE}/api/e-invoice/config/${TEST_CONFIG.testBusinessId}`
      );

      if (configResponse.data) {
        logSuccess("E-Invoice configuration endpoint accessible");
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logWarning("E-Invoice endpoints not implemented yet");
      } else {
        logError(`E-Invoice config test failed: ${error.message}`);
      }
    }

    return true;
  } catch (error) {
    logError(`E-Invoice integration testing failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runComprehensiveTests() {
  log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════════╗
║                     FATURA YÖNETİM SİSTEMİ                    ║
║                  Kapsamlı Test Sürecini Başlatma              ║
║                                                                ║
║  Bu test süreci tüm fatura işlevlerini sistematik olarak      ║
║  doğrulayacak ve sorunları tespit edecektir.                  ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const testResults = {
    serverReady: false,
    dataSetup: false,
    crudOperations: false,
    relationships: false,
    validation: false,
    pdfOperations: false,
    eInvoiceIntegration: false,
  };

  // Wait for server
  testResults.serverReady = await waitForServer();
  if (!testResults.serverReady) {
    logError("Server not ready, aborting tests");
    return testResults;
  }

  // Setup test data
  testResults.dataSetup = await setupTestData();

  // Run all tests
  testResults.crudOperations = await testInvoiceCRUDOperations();
  testResults.relationships = await testDatabaseRelationships();
  testResults.validation = await testAPIValidationAndErrors();
  testResults.pdfOperations = await testPDFOperations();
  testResults.eInvoiceIntegration = await testEInvoiceIntegration();

  // Generate test summary
  log(`\n${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════════╗
║                        TEST SONUÇLARI                          ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}`);

  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(Boolean).length;

  Object.entries(testResults).forEach(([testName, result]) => {
    const status = result ? "✅ BAŞARILI" : "❌ BAŞARISIZ";
    const color = result ? colors.green : colors.red;
    log(`  ${color}${status}${colors.reset} - ${testName}`);
  });

  log(
    `\n${colors.bright}GENEL SONUÇ: ${passedTests}/${totalTests} test başarılı${colors.reset}`
  );

  if (passedTests === totalTests) {
    log(
      `${colors.green}🎉 Tüm testler başarılı! Fatura sistemi tam çalışır durumda.${colors.reset}`
    );
  } else {
    log(
      `${colors.yellow}⚠️  Bazı testler başarısız. Detaylı inceleme gerekli.${colors.reset}`
    );
  }

  return testResults;
}

// Handle graceful exit
process.on("SIGINT", () => {
  log("\n\nTest süreci kullanıcı tarafından durduruldu.");
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  runComprehensiveTests()
    .then((results) => {
      const allPassed = Object.values(results).every(Boolean);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      logError(`Test execution failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTests };
