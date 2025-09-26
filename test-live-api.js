/**
 * Simple API test using native Node.js modules only
 */

const http = require("http");

async function testAPI() {
  console.log("🚀 Testing Live API Responses...\n");

  // Test simple GET request to orders endpoint
  const options = {
    hostname: "localhost",
    port: 3000,
    path: "/api/orders?limit=2",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";

      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log("\n📋 Raw API Response:");
        console.log(data);

        try {
          const parsed = JSON.parse(data);
          console.log("\n🔍 Parsed Response Analysis:");

          if (parsed.error) {
            console.log("❌ API returned error:", parsed.error);
            console.log("   Code:", parsed.code);
          } else if (parsed.orders) {
            console.log(`✅ Found ${parsed.orders.length} orders`);

            if (parsed.orders.length > 0) {
              const sampleOrder = parsed.orders[0];
              console.log("\n📊 Sample Order Analysis:");
              console.log("- Order ID:", sampleOrder.id || "MISSING");
              console.log(
                "- Order Number:",
                sampleOrder.orderNumber || "MISSING"
              );
              console.log("- Customer:", sampleOrder.customer || "MISSING");
              console.log("- Status:", sampleOrder.status || "MISSING");
              console.log("- Priority:", sampleOrder.priority || "MISSING ⚠️");
              console.log(
                "- Total Amount:",
                sampleOrder.totalAmount || "MISSING ⚠️"
              );
              console.log(
                "- Delivery Date:",
                sampleOrder.deliveryDate || "MISSING ⚠️"
              );
              console.log(
                "- Order Info:",
                sampleOrder.orderInfo || "MISSING ⚠️"
              );
              console.log(
                "- Items Count:",
                sampleOrder.items?.length || "MISSING ⚠️"
              );

              console.log("\n🛠️  Service Items Analysis:");
              if (
                sampleOrder.items &&
                Array.isArray(sampleOrder.items) &&
                sampleOrder.items.length > 0
              ) {
                sampleOrder.items.forEach((item, index) => {
                  console.log(`  Item ${index + 1}:`);
                  console.log(
                    `  - Service Name: ${item.serviceName || "MISSING ⚠️"}`
                  );
                  console.log(
                    `  - Service Description: ${
                      item.serviceDescription || "MISSING"
                    }`
                  );
                  console.log(`  - Is Manual Entry: ${item.isManualEntry}`);
                  console.log(`  - Has Service Object: ${!!item.service}`);
                  console.log(`  - Quantity: ${item.quantity}`);
                  console.log(`  - Unit Price: ${item.unitPrice}`);
                });
              } else {
                console.log(
                  '  ❌ NO ITEMS FOUND - This is the root cause of "görüntülenemedi" error!'
                );
              }
            }
          } else {
            console.log(
              "❌ Unexpected response structure:",
              Object.keys(parsed)
            );
          }

          resolve(data);
        } catch (e) {
          console.log("❌ Failed to parse JSON response:", e.message);
          console.log("Raw response:", data);
          resolve(data);
        }
      });
    });

    req.on("error", (e) => {
      console.log("❌ Request failed:", e.message);
      reject(e);
    });

    req.end();
  });
}

// Test with proper error handling
testAPI()
  .then(() => {
    console.log("\n🎯 API Test Complete");
    console.log(
      "\nThis will show the exact structure returned by the live API"
    );
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
  });
