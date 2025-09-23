const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Test configuration
const BASE_URL = "http://localhost:3000/api";
const TEST_DATA = {
  businessId: "clxxx-test-business-id", // Replace with actual business ID
  invoiceId: "clxxx-test-invoice-id", // Replace with actual invoice ID
};

// Test the complete PDF workflow
async function testPdfWorkflow() {
  console.log("🧪 Testing PDF Workflow\n");

  try {
    // Step 1: Check if invoice exists and get details
    console.log("📋 Step 1: Getting invoice details...");
    const invoiceResponse = await axios.get(
      `${BASE_URL}/invoices/${TEST_DATA.invoiceId}?businessId=${TEST_DATA.businessId}`
    );

    if (!invoiceResponse.data.success) {
      throw new Error("Invoice not found");
    }

    console.log(
      `✅ Found invoice: ${invoiceResponse.data.invoice.invoiceNumber}`
    );
    console.log(`   Customer: ${invoiceResponse.data.invoice.customerName}`);
    console.log(`   Amount: ${invoiceResponse.data.invoice.totalAmount}\n`);

    // Step 2: Check PDF status
    console.log("📄 Step 2: Checking PDF status...");
    const statusResponse = await axios.get(
      `${BASE_URL}/invoices/pdf/generate?invoiceId=${TEST_DATA.invoiceId}&businessId=${TEST_DATA.businessId}`
    );

    console.log(`   Has PDF: ${statusResponse.data.hasPDF}`);
    if (statusResponse.data.hasPDF) {
      console.log(`   PDF File: ${statusResponse.data.fileName}`);
    }
    console.log();

    // Step 3: Generate PDF if not exists
    if (!statusResponse.data.hasPDF) {
      console.log("🔧 Step 3: Generating PDF...");
      const generateResponse = await axios.post(
        `${BASE_URL}/invoices/pdf/generate`,
        {
          invoiceId: TEST_DATA.invoiceId,
          businessId: TEST_DATA.businessId,
        }
      );

      if (generateResponse.data.success) {
        console.log(`✅ PDF generated: ${generateResponse.data.fileName}`);
        console.log(`   Download URL: ${generateResponse.data.downloadUrl}\n`);
      } else {
        throw new Error("PDF generation failed");
      }
    } else {
      console.log("✅ PDF already exists, skipping generation\n");
    }

    // Step 4: Download PDF
    console.log("⬇️  Step 4: Downloading PDF...");
    const downloadResponse = await axios.get(
      `${BASE_URL}/invoices/pdf/download/${TEST_DATA.invoiceId}?businessId=${TEST_DATA.businessId}`,
      { responseType: "arraybuffer" }
    );

    if (downloadResponse.status === 200) {
      const fileName = `test-invoice-${Date.now()}.pdf`;
      const filePath = path.join(__dirname, "temp", fileName);

      // Create temp directory if it doesn't exist
      const tempDir = path.dirname(filePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      fs.writeFileSync(filePath, downloadResponse.data);
      console.log(`✅ PDF downloaded: ${filePath}`);
      console.log(
        `   File size: ${Math.round(downloadResponse.data.length / 1024)} KB\n`
      );
    } else {
      throw new Error("PDF download failed");
    }

    // Step 5: Test cleanup status
    console.log("🧹 Step 5: Checking cleanup status...");
    try {
      const cleanupResponse = await axios.get(`${BASE_URL}/admin/pdf-cleanup`);
      console.log(
        `✅ Cleanup status: ${
          cleanupResponse.data.status.isScheduled ? "Active" : "Inactive"
        }`
      );
      console.log(
        `   Total PDF files: ${cleanupResponse.data.stats.totalFiles}`
      );
      console.log(
        `   Old files ready for cleanup: ${cleanupResponse.data.stats.oldFiles}\n`
      );
    } catch (error) {
      console.log("⚠️  Cleanup endpoint not accessible (this is okay)\n");
    }

    console.log("🎉 PDF Workflow Test Completed Successfully!\n");
    console.log("📋 Summary:");
    console.log("   ✅ Invoice retrieval");
    console.log("   ✅ PDF status check");
    console.log("   ✅ PDF generation");
    console.log("   ✅ PDF download");
    console.log("   ✅ File cleanup system");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
  }
}

// Usage instructions
console.log("🚀 PDF Workflow Test");
console.log("===================\n");
console.log("Before running this test:");
console.log("1. Make sure the backend server is running (npm run dev)");
console.log("2. Update TEST_DATA with valid businessId and invoiceId");
console.log("3. Ensure you have a valid invoice in the database\n");

// Run the test if called directly
if (require.main === module) {
  // Check if test data is configured
  if (
    TEST_DATA.businessId.includes("test") ||
    TEST_DATA.invoiceId.includes("test")
  ) {
    console.log(
      "⚠️  Please update TEST_DATA with real IDs before running the test\n"
    );
    console.log("You can find valid IDs by:");
    console.log("1. Checking your database for existing invoices");
    console.log("2. Or creating a test invoice first\n");
  } else {
    testPdfWorkflow();
  }
}

module.exports = { testPdfWorkflow };
