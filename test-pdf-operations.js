// Test PDF Operations for Invoice System
const axios = require("axios");
const fs = require("fs").promises;

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

async function getTestInvoice() {
  try {
    // Get test data
    const testResponse = await axios.get(`${API_BASE}/api/test-invoice`);
    const businessId = testResponse.data.invoices[0].businessId;

    // Get existing invoices
    const listResponse = await axios.get(`${API_BASE}/api/invoices`, {
      params: { businessId },
    });

    if (listResponse.data.invoices && listResponse.data.invoices.length > 0) {
      const invoice = listResponse.data.invoices[0];
      return {
        invoiceId: invoice.id,
        businessId: invoice.businessId,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
      };
    }

    return null;
  } catch (error) {
    logError(`Failed to get test invoice: ${error.message}`);
    return null;
  }
}

async function testPdfGeneration() {
  logTestStart("PDF Generation");

  const testInvoice = await getTestInvoice();
  if (!testInvoice) {
    logError("No test invoice available for PDF generation");
    return false;
  }

  logSuccess(`Using invoice: ${testInvoice.invoiceNumber}`);

  try {
    // Test PDF generation
    log("\n  📄 Testing PDF Generation...");

    const generatePayload = {
      invoiceId: testInvoice.invoiceId,
      businessId: testInvoice.businessId,
    };

    log(`  📤 Generating PDF for invoice: ${testInvoice.invoiceId}`);

    const generateResponse = await axios.post(
      `${API_BASE}/api/invoices/pdf/generate`,
      generatePayload
    );

    if (generateResponse.data.success) {
      logSuccess("PDF generation successful");
      logSuccess(`  PDF URL: ${generateResponse.data.pdfUrl}`);
      logSuccess(`  File name: ${generateResponse.data.fileName}`);
      logSuccess(`  Download URL: ${generateResponse.data.downloadUrl}`);

      return testInvoice;
    } else {
      logError("PDF generation failed");
      return false;
    }
  } catch (error) {
    if (error.response) {
      logError(
        `PDF generation failed: ${error.response.status} - ${
          error.response.data?.error || error.response.data
        }`
      );
      if (error.response.data?.details) {
        logError(`  Details: ${error.response.data.details}`);
      }
    } else {
      logError(`PDF generation error: ${error.message}`);
    }
    return false;
  }
}

async function testPdfStatus() {
  logTestStart("PDF Status Check");

  const testInvoice = await getTestInvoice();
  if (!testInvoice) {
    logError("No test invoice available for status check");
    return false;
  }

  try {
    log("\n  📊 Testing PDF Status...");

    const statusResponse = await axios.get(
      `${API_BASE}/api/invoices/pdf/generate`,
      {
        params: {
          invoiceId: testInvoice.invoiceId,
          businessId: testInvoice.businessId,
        },
      }
    );

    if (statusResponse.data.success !== undefined) {
      logSuccess("PDF status endpoint working");
      logSuccess(`  Has PDF: ${statusResponse.data.hasPDF}`);

      if (statusResponse.data.hasPDF) {
        logSuccess(`  PDF URL: ${statusResponse.data.pdfUrl}`);
        logSuccess(`  File name: ${statusResponse.data.fileName}`);
      } else {
        logWarning("  No PDF available yet");
      }

      return true;
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logWarning("PDF status endpoint not fully implemented");
    } else {
      logError(
        `PDF status check failed: ${
          error.response?.data?.error || error.message
        }`
      );
    }
    return false;
  }
}

async function testPdfDownload() {
  logTestStart("PDF Download");

  const testInvoice = await getTestInvoice();
  if (!testInvoice) {
    logError("No test invoice available for download test");
    return false;
  }

  try {
    log("\n  📥 Testing PDF Download...");

    // Try HEAD request first to check availability
    log("    🔍 Checking PDF availability...");
    try {
      const headResponse = await axios.head(
        `${API_BASE}/api/invoices/pdf/download/${testInvoice.invoiceId}`,
        {
          params: { businessId: testInvoice.businessId },
        }
      );

      if (headResponse.status === 200) {
        logSuccess("PDF is available for download");
        logSuccess(`  Content-Type: ${headResponse.headers["content-type"]}`);

        if (headResponse.headers["content-length"]) {
          const size = parseInt(headResponse.headers["content-length"]);
          logSuccess(`  File size: ${(size / 1024).toFixed(2)} KB`);
        }
      }
    } catch (headError) {
      if (headError.response && headError.response.status === 404) {
        logWarning("PDF not available yet, trying to generate first...");

        // Try to generate PDF first
        await testPdfGeneration();
      } else {
        logError(
          `HEAD request failed: ${
            headError.response?.status || headError.message
          }`
        );
      }
    }

    // Try actual download
    log("    📁 Testing actual download...");
    const downloadResponse = await axios.get(
      `${API_BASE}/api/invoices/pdf/download/${testInvoice.invoiceId}`,
      {
        params: { businessId: testInvoice.businessId },
        responseType: "arraybuffer",
      }
    );

    if (downloadResponse.status === 200) {
      logSuccess("PDF download successful");
      logSuccess(`  Content-Type: ${downloadResponse.headers["content-type"]}`);
      logSuccess(`  File size: ${downloadResponse.data.byteLength} bytes`);

      // Verify it's actually a PDF
      const pdfHeader = Buffer.from(
        downloadResponse.data.slice(0, 4)
      ).toString();
      if (pdfHeader === "%PDF") {
        logSuccess("  ✓ Valid PDF format confirmed");
      } else {
        logWarning("  ⚠️ Downloaded file may not be a valid PDF");
      }

      return true;
    }
  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      if (typeof errorData === "object" && errorData.error) {
        logError(`PDF download failed: ${errorData.error}`);
        if (errorData.message) {
          logWarning(`  Message: ${errorData.message}`);
        }
      } else {
        logError(`PDF download failed: ${error.response.status}`);
      }
    } else {
      logError(`PDF download error: ${error.message}`);
    }
    return false;
  }
}

async function testPdfCleanup() {
  logTestStart("PDF Cleanup System");

  try {
    log("\n  🧹 Testing PDF Cleanup Status...");

    const cleanupResponse = await axios.get(
      `${API_BASE}/api/admin/pdf-cleanup`
    );

    if (cleanupResponse.data) {
      logSuccess("PDF cleanup endpoint accessible");

      if (cleanupResponse.data.status) {
        logSuccess(
          `  Cleanup status: ${
            cleanupResponse.data.status.isRunning ? "Running" : "Stopped"
          }`
        );
        if (cleanupResponse.data.status.schedule) {
          logSuccess(`  Schedule: ${cleanupResponse.data.status.schedule}`);
        }
      }

      if (cleanupResponse.data.stats) {
        logSuccess(
          `  Total files: ${cleanupResponse.data.stats.totalFiles || 0}`
        );
        logSuccess(
          `  Total size: ${cleanupResponse.data.stats.totalSizeMB || 0} MB`
        );
      }

      return true;
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logWarning("PDF cleanup endpoints not implemented yet");
    } else {
      logError(
        `PDF cleanup test failed: ${
          error.response?.data?.error || error.message
        }`
      );
    }
    return false;
  }
}

async function runPdfTests() {
  log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════════╗
║                     PDF OPERATIONS TESTING                    ║
║               Invoice PDF Generation & Management             ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const results = {
    generation: false,
    status: false,
    download: false,
    cleanup: false,
  };

  // Test PDF generation
  results.generation = await testPdfGeneration();

  // Test PDF status
  results.status = await testPdfStatus();

  // Test PDF download
  results.download = await testPdfDownload();

  // Test cleanup system
  results.cleanup = await testPdfCleanup();

  // Generate test summary
  log(`\n${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════════╗
║                      PDF TEST RESULTS                         ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}`);

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;

  Object.entries(results).forEach(([testName, result]) => {
    const status = result ? "✅ WORKING" : "❌ ISSUES";
    const color = result ? colors.green : colors.red;
    log(`  ${color}${status}${colors.reset} - ${testName.toUpperCase()}`);
  });

  log(
    `\n${colors.bright}PDF OPERATIONS: ${passedTests}/${totalTests} working correctly${colors.reset}`
  );

  if (passedTests === totalTests) {
    log(
      `${colors.green}🎉 All PDF operations working perfectly!${colors.reset}`
    );
  } else if (passedTests > 0) {
    log(
      `${colors.yellow}⚠️  Some PDF operations working, others need attention.${colors.reset}`
    );
  } else {
    log(
      `${colors.red}❌ PDF system needs implementation or fixes.${colors.reset}`
    );
  }

  return results;
}

// Run the tests
if (require.main === module) {
  runPdfTests()
    .then((results) => {
      const allPassed = Object.values(results).every(Boolean);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      logError(`PDF test execution failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runPdfTests };
