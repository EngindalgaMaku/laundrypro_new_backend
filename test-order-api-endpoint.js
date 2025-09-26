const { NextRequest } = require("next/server");

// Simulate the API endpoint test
async function testOrderAPIEndpoint() {
  try {
    console.log("🔍 Testing Order API Endpoint...");
    console.log("=".repeat(50));

    // Test the actual order API endpoint
    const orderId = "cmfyjanhb0003lm0kttjzzcl3"; // The order we found in database

    console.log(`📡 Testing GET /api/orders/${orderId}`);

    // Import the API route handler
    const { GET } = require("./app/api/orders/[id]/route.ts");

    // Create a mock request
    const mockRequest = new NextRequest(
      `http://localhost:3000/api/orders/${orderId}`,
      {
        method: "GET",
      }
    );

    // Mock the params
    const mockParams = { id: orderId };

    // Call the API endpoint
    const response = await GET(mockRequest, { params: mockParams });
    const data = await response.json();

    console.log("\n📱 API Response:");
    console.log(JSON.stringify(data, null, 2));

    // Analyze the response
    console.log("\n🔍 Analysis:");

    if (data.customer) {
      console.log(`✅ Customer data present: ${JSON.stringify(data.customer)}`);

      if (
        data.customer.name === "İsimsiz" ||
        data.customer.phone === "Telefon yok"
      ) {
        console.log("❌ Customer data transformation is incorrect");
      } else {
        console.log("✅ Customer data transformation is correct");
      }
    } else {
      console.log("❌ No customer data in response");
    }

    if (data.orderItems && data.orderItems.length > 0) {
      console.log(`✅ Order items present: ${data.orderItems.length} items`);
    } else {
      console.log(
        "❌ No order items in response - this matches database issue"
      );
    }

    console.log(`💰 Total amount: ${data.totalAmount}`);
  } catch (error) {
    console.error("❌ Error testing API endpoint:", error);
    console.error("Stack:", error.stack);
  }
}

testOrderAPIEndpoint();
