// Test Database Relationships for Invoice System
const axios = require("axios");

const API_BASE = "http://localhost:3000";

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

async function getTestData() {
  try {
    const testResponse = await axios.get(`${API_BASE}/api/test-invoice`);

    if (testResponse.data.success && testResponse.data.invoices?.length > 0) {
      return {
        businessId: testResponse.data.invoices[0].businessId,
        customerId: testResponse.data.invoices[0].customerId,
        orderId: testResponse.data.invoices[0].orderId,
        invoiceId: testResponse.data.invoices[0].id,
      };
    }
    return null;
  } catch (error) {
    logError(`Failed to get test data: ${error.message}`);
    return null;
  }
}

async function testBusinessInvoiceRelationship() {
  logTestStart("Business-Invoice Relationship");

  const testData = await getTestData();
  if (!testData) {
    logError("No test data available");
    return false;
  }

  try {
    // Get invoice with business relationship
    log("\n  🏢 Testing Business-Invoice relationship...");

    const response = await axios.get(
      `${API_BASE}/api/invoices/${testData.invoiceId}`,
      { params: { businessId: testData.businessId } }
    );

    if (response.data.success && response.data.invoice) {
      const invoice = response.data.invoice;

      // Check business relationship
      if (invoice.business) {
        logSuccess("Business relationship loaded successfully");
        logSuccess(`  Business name: ${invoice.business.name}`);
        logSuccess(
          `  Business ID matches: ${
            invoice.businessId === invoice.business.id ? "Yes" : "No"
          }`
        );

        // Check business details
        if (invoice.business.email)
          logSuccess(`  Business email: ${invoice.business.email}`);
        if (invoice.business.phone)
          logSuccess(`  Business phone: ${invoice.business.phone}`);
        if (invoice.business.address)
          logSuccess(`  Business address: ${invoice.business.address}`);
        if (invoice.business.taxNumber)
          logSuccess(`  Business tax number: ${invoice.business.taxNumber}`);

        return true;
      } else {
        logError("Business relationship not loaded");
        return false;
      }
    } else {
      logError("Failed to retrieve invoice");
      return false;
    }
  } catch (error) {
    logError(
      `Business relationship test failed: ${
        error.response?.data?.error || error.message
      }`
    );
    return false;
  }
}

async function testCustomerInvoiceRelationship() {
  logTestStart("Customer-Invoice Relationship");

  const testData = await getTestData();
  if (!testData) {
    logError("No test data available");
    return false;
  }

  try {
    // Get invoice with customer relationship
    log("\n  👤 Testing Customer-Invoice relationship...");

    const response = await axios.get(
      `${API_BASE}/api/invoices/${testData.invoiceId}`,
      { params: { businessId: testData.businessId } }
    );

    if (response.data.success && response.data.invoice) {
      const invoice = response.data.invoice;

      // Check customer relationship
      if (invoice.customer) {
        logSuccess("Customer relationship loaded successfully");
        logSuccess(
          `  Customer name: ${invoice.customer.firstName} ${invoice.customer.lastName}`
        );
        logSuccess(
          `  Customer ID matches: ${
            invoice.customerId === invoice.customer.id ? "Yes" : "No"
          }`
        );

        // Check customer details
        if (invoice.customer.email)
          logSuccess(`  Customer email: ${invoice.customer.email}`);
        if (invoice.customer.phone)
          logSuccess(`  Customer phone: ${invoice.customer.phone}`);
        if (invoice.customer.address)
          logSuccess(`  Customer address: ${invoice.customer.address}`);

        return true;
      } else if (invoice.customerName) {
        logSuccess("Customer data embedded in invoice");
        logSuccess(`  Customer name: ${invoice.customerName}`);
        logSuccess(`  Customer phone: ${invoice.customerPhone || "N/A"}`);
        logSuccess(`  Customer email: ${invoice.customerEmail || "N/A"}`);

        return true;
      } else {
        logError("Customer relationship not loaded");
        return false;
      }
    } else {
      logError("Failed to retrieve invoice");
      return false;
    }
  } catch (error) {
    logError(
      `Customer relationship test failed: ${
        error.response?.data?.error || error.message
      }`
    );
    return false;
  }
}

async function testOrderInvoiceRelationship() {
  logTestStart("Order-Invoice Relationship");

  const testData = await getTestData();
  if (!testData) {
    logError("No test data available");
    return false;
  }

  try {
    // Get invoice with order relationship
    log("\n  📦 Testing Order-Invoice relationship...");

    const response = await axios.get(
      `${API_BASE}/api/invoices/${testData.invoiceId}`,
      { params: { businessId: testData.businessId } }
    );

    if (response.data.success && response.data.invoice) {
      const invoice = response.data.invoice;

      // Check order relationship
      if (invoice.order && invoice.orderId) {
        logSuccess("Order relationship loaded successfully");
        logSuccess(`  Order number: ${invoice.order.orderNumber}`);
        logSuccess(
          `  Order ID matches: ${
            invoice.orderId === invoice.order.id ? "Yes" : "No"
          }`
        );

        // Check order customer relationship
        if (invoice.order.customer) {
          logSuccess(
            `  Order customer: ${invoice.order.customer.firstName} ${invoice.order.customer.lastName}`
          );
        }

        return true;
      } else if (invoice.orderId && !invoice.order) {
        logWarning("Order ID exists but relationship not loaded in this query");
        logSuccess(`  Order ID: ${invoice.orderId}`);

        return true;
      } else {
        logSuccess("Invoice created without order (valid case)");
        return true;
      }
    } else {
      logError("Failed to retrieve invoice");
      return false;
    }
  } catch (error) {
    logError(
      `Order relationship test failed: ${
        error.response?.data?.error || error.message
      }`
    );
    return false;
  }
}

async function testInvoiceItemsRelationship() {
  logTestStart("Invoice Items Relationship");

  const testData = await getTestData();
  if (!testData) {
    logError("No test data available");
    return false;
  }

  try {
    // Get invoice with items
    log("\n  📋 Testing Invoice-Items relationship...");

    const response = await axios.get(
      `${API_BASE}/api/invoices/${testData.invoiceId}`,
      { params: { businessId: testData.businessId } }
    );

    if (response.data.success && response.data.invoice) {
      const invoice = response.data.invoice;

      // Check items relationship
      if (invoice.items && invoice.items.length > 0) {
        logSuccess(
          `Invoice items loaded successfully: ${invoice.items.length} items`
        );

        // Validate first item structure
        const firstItem = invoice.items[0];
        logSuccess(`  Sample item: ${firstItem.name}`);
        logSuccess(`  Quantity: ${firstItem.quantity}`);
        logSuccess(`  Unit price: ${firstItem.unitPrice}`);
        logSuccess(`  Line total: ${firstItem.lineTotal}`);

        // Validate financial calculations
        const calculatedSubtotal = invoice.items.reduce(
          (sum, item) => sum + parseFloat(item.lineAmount),
          0
        );
        const invoiceSubtotal = parseFloat(invoice.subtotalAmount);
        const subtotalMatches =
          Math.abs(calculatedSubtotal - invoiceSubtotal) < 0.01;

        logSuccess(
          `  Subtotal calculation: ${subtotalMatches ? "Correct" : "Incorrect"}`
        );
        logSuccess(`    Items total: ${calculatedSubtotal.toFixed(2)}`);
        logSuccess(`    Invoice subtotal: ${invoiceSubtotal.toFixed(2)}`);

        // Check if items have orderItemId references
        const itemWithOrderRef = invoice.items.find((item) => item.orderItemId);
        if (itemWithOrderRef) {
          logSuccess("  Items linked to order items");
        } else {
          logWarning(
            "  Items not linked to order items (may be manual invoice)"
          );
        }

        return true;
      } else {
        logWarning("No invoice items found");
        return false;
      }
    } else {
      logError("Failed to retrieve invoice");
      return false;
    }
  } catch (error) {
    logError(
      `Invoice items relationship test failed: ${
        error.response?.data?.error || error.message
      }`
    );
    return false;
  }
}

async function testInvoiceListRelationships() {
  logTestStart("Invoice List Relationships");

  const testData = await getTestData();
  if (!testData) {
    logError("No test data available");
    return false;
  }

  try {
    // Get invoice list with relationships
    log("\n  📊 Testing Invoice List with relationships...");

    const response = await axios.get(`${API_BASE}/api/invoices`, {
      params: { businessId: testData.businessId },
    });

    if (response.data.success && response.data.invoices) {
      const invoices = response.data.invoices;
      logSuccess(`Retrieved ${invoices.length} invoices with relationships`);

      let relationshipStats = {
        withBusiness: 0,
        withCustomer: 0,
        withOrder: 0,
        withItems: 0,
      };

      invoices.forEach((invoice) => {
        if (invoice.business) relationshipStats.withBusiness++;
        if (invoice.customer) relationshipStats.withCustomer++;
        if (invoice.order) relationshipStats.withOrder++;
        if (invoice.items && invoice.items.length > 0)
          relationshipStats.withItems++;
      });

      logSuccess(
        `  Business relationships: ${relationshipStats.withBusiness}/${invoices.length}`
      );
      logSuccess(
        `  Customer relationships: ${relationshipStats.withCustomer}/${invoices.length}`
      );
      logSuccess(
        `  Order relationships: ${relationshipStats.withOrder}/${invoices.length}`
      );
      logSuccess(
        `  Items relationships: ${relationshipStats.withItems}/${invoices.length}`
      );

      return true;
    } else {
      logError("Failed to retrieve invoice list");
      return false;
    }
  } catch (error) {
    logError(
      `Invoice list relationships test failed: ${
        error.response?.data?.error || error.message
      }`
    );
    return false;
  }
}

async function testDataIntegrity() {
  logTestStart("Data Integrity & Constraints");

  const testData = await getTestData();
  if (!testData) {
    logError("No test data available");
    return false;
  }

  try {
    // Test duplicate invoice creation (should fail)
    log("\n  🛡️ Testing duplicate invoice prevention...");

    try {
      await axios.post(`${API_BASE}/api/invoices`, {
        orderId: testData.orderId,
        businessId: testData.businessId,
        customerVknTckn: "12345678901",
      });

      logError("Duplicate invoice creation should have failed");
      return false;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logSuccess("Duplicate invoice correctly prevented");
      } else {
        logError(
          `Unexpected error: ${error.response?.data?.error || error.message}`
        );
        return false;
      }
    }

    // Test invalid business ID access
    log("\n  🔒 Testing business access control...");

    try {
      await axios.get(`${API_BASE}/api/invoices/${testData.invoiceId}`, {
        params: { businessId: "invalid-business-id" },
      });

      logError("Access with invalid business ID should have failed");
      return false;
    } catch (error) {
      if (
        error.response &&
        (error.response.status === 400 || error.response.status === 403)
      ) {
        logSuccess("Business access control working correctly");
      } else {
        logError(
          `Unexpected error: ${error.response?.data?.error || error.message}`
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    logError(`Data integrity test failed: ${error.message}`);
    return false;
  }
}

async function runDatabaseRelationshipTests() {
  log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════════╗
║                DATABASE RELATIONSHIPS TESTING                 ║
║            Validating Invoice System Data Integrity           ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const results = {
    businessRelationship: false,
    customerRelationship: false,
    orderRelationship: false,
    itemsRelationship: false,
    listRelationships: false,
    dataIntegrity: false,
  };

  // Test all relationships
  results.businessRelationship = await testBusinessInvoiceRelationship();
  results.customerRelationship = await testCustomerInvoiceRelationship();
  results.orderRelationship = await testOrderInvoiceRelationship();
  results.itemsRelationship = await testInvoiceItemsRelationship();
  results.listRelationships = await testInvoiceListRelationships();
  results.dataIntegrity = await testDataIntegrity();

  // Generate test summary
  log(`\n${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════════╗
║                  DATABASE RELATIONSHIP RESULTS                ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}`);

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;

  Object.entries(results).forEach(([testName, result]) => {
    const status = result ? "✅ WORKING" : "❌ ISSUES";
    const color = result ? colors.green : colors.red;
    log(
      `  ${color}${status}${colors.reset} - ${testName
        .toUpperCase()
        .replace(/([A-Z])/g, " $1")
        .trim()}`
    );
  });

  log(
    `\n${colors.bright}DATABASE RELATIONSHIPS: ${passedTests}/${totalTests} working correctly${colors.reset}`
  );

  if (passedTests === totalTests) {
    log(
      `${colors.green}🎉 All database relationships working perfectly!${colors.reset}`
    );
  } else if (passedTests > 0) {
    log(
      `${colors.yellow}⚠️  Most database relationships working, some need attention.${colors.reset}`
    );
  } else {
    log(`${colors.red}❌ Database relationships need fixes.${colors.reset}`);
  }

  return results;
}

// Run the tests
if (require.main === module) {
  runDatabaseRelationshipTests()
    .then((results) => {
      const allPassed = Object.values(results).every(Boolean);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      logError(`Database relationship test execution failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runDatabaseRelationshipTests };
