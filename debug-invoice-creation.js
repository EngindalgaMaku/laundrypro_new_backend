// Debug Invoice Creation Issues
const axios = require("axios");

const API_BASE = "http://localhost:3000";

async function debugInvoiceCreation() {
  console.log("🔍 Debugging Invoice Creation Issue...\n");

  try {
    // Get test data first
    console.log("1️⃣ Getting test data...");
    const testResponse = await axios.get(`${API_BASE}/api/test-invoice`);

    if (!testResponse.data.success || !testResponse.data.invoices?.length) {
      console.log("❌ No test data available");
      return;
    }

    const invoice = testResponse.data.invoices[0];
    console.log("✅ Test data found:");
    console.log(`   Business ID: ${invoice.businessId}`);
    console.log(`   Customer ID: ${invoice.customerId}`);
    console.log(`   Order ID: ${invoice.orderId}`);

    // Try to create invoice with detailed error logging
    console.log("\n2️⃣ Attempting invoice creation...");

    const createPayload = {
      orderId: invoice.orderId,
      businessId: invoice.businessId,
      customerVknTckn: "12345678901",
    };

    console.log("📤 Payload:", JSON.stringify(createPayload, null, 2));

    try {
      const createResponse = await axios.post(
        `${API_BASE}/api/invoices`,
        createPayload
      );
      console.log("✅ Invoice creation successful!");
      console.log("📄 Response:", JSON.stringify(createResponse.data, null, 2));
    } catch (error) {
      console.log("❌ Invoice creation failed!");

      if (error.response) {
        console.log("📊 Status:", error.response.status);
        console.log(
          "📝 Error data:",
          JSON.stringify(error.response.data, null, 2)
        );
        console.log(
          "🔍 Headers:",
          JSON.stringify(error.response.headers, null, 2)
        );
      } else {
        console.log("🔍 Error details:", error.message);
      }

      // Try to get more details about the order
      console.log("\n3️⃣ Checking order details...");
      try {
        // This endpoint might not exist, but let's try
        const orderResponse = await axios.get(
          `${API_BASE}/api/orders/${invoice.orderId}`
        );
        console.log(
          "📦 Order details:",
          JSON.stringify(orderResponse.data, null, 2)
        );
      } catch (orderError) {
        console.log(
          "⚠️ Could not retrieve order details (endpoint might not exist)"
        );
      }

      // Try alternative creation without orderId
      console.log("\n4️⃣ Trying manual invoice creation...");
      try {
        const manualPayload = {
          businessId: invoice.businessId,
          // Skip orderId to test manual creation
          customerVknTckn: "12345678901",
        };

        const manualResponse = await axios.post(
          `${API_BASE}/api/invoices`,
          manualPayload
        );
        console.log("✅ Manual invoice creation successful!");
        console.log(
          "📄 Response:",
          JSON.stringify(manualResponse.data, null, 2)
        );
      } catch (manualError) {
        console.log("❌ Manual creation also failed");
        if (manualError.response) {
          console.log(
            "📝 Manual error:",
            JSON.stringify(manualError.response.data, null, 2)
          );
        }
      }
    }
  } catch (error) {
    console.log("💥 Debug script failed:", error.message);
  }
}

debugInvoiceCreation();
