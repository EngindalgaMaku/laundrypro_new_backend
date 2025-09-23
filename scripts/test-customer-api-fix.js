const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
require("dotenv").config();

const API_BASE_URL = "http://localhost:3000/api";

async function testCustomerAPIFix() {
  console.log("🧪 Testing Customer API Fix for mackaengin@gmail.com");
  console.log("=================================================");

  try {
    // Step 1: Create a test JWT token for mackaengin@gmail.com
    const tokenPayload = {
      userId: "cmfsky1n90002wc9cwu6ysw58",
      email: "mackaengin@gmail.com",
      businessId: "cmfsky1mu0000wc9cgrumxsko",
      role: "OWNER",
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(tokenPayload, process.env.NEXTAUTH_SECRET, {
      expiresIn: "1h",
    });

    console.log("✅ Test JWT token created");

    // Step 2: Test GET /api/customers
    console.log("\n📋 Testing GET /api/customers...");

    const getResponse = await fetch(`${API_BASE_URL}/customers`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const getResult = await getResponse.json();

    if (getResponse.ok) {
      console.log("✅ GET /api/customers SUCCESS");
      console.log(`   - Found ${getResult.length || 0} customers`);
    } else {
      console.error("❌ GET /api/customers FAILED");
      console.error("   - Status:", getResponse.status);
      console.error("   - Error:", getResult.error);
      return;
    }

    // Step 3: Test POST /api/customers
    console.log("\n📝 Testing POST /api/customers...");

    const testCustomer = {
      firstName: "Test",
      lastName: "Customer",
      phone: "05551234567",
      email: "test@example.com",
      address: "Test Address",
      city: "Istanbul",
      district: "Kadıköy",
      whatsapp: "05551234567",
    };

    const postResponse = await fetch(`${API_BASE_URL}/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testCustomer),
    });

    const postResult = await postResponse.json();

    if (postResponse.ok) {
      console.log("✅ POST /api/customers SUCCESS");
      console.log(
        "   - Customer created:",
        postResult.customer?.firstName || "Unknown"
      );

      const customerId = postResult.customer?.id;
      if (customerId) {
        // Step 4: Test GET /api/customers/[id]
        console.log("\n👤 Testing GET /api/customers/[id]...");

        const getCustomerResponse = await fetch(
          `${API_BASE_URL}/customers/${customerId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const getCustomerResult = await getCustomerResponse.json();

        if (getCustomerResponse.ok) {
          console.log("✅ GET /api/customers/[id] SUCCESS");
          console.log(
            "   - Customer found:",
            getCustomerResult.firstName || "Unknown"
          );
        } else {
          console.error("❌ GET /api/customers/[id] FAILED");
          console.error("   - Status:", getCustomerResponse.status);
          console.error("   - Error:", getCustomerResult.error);
        }

        // Step 5: Clean up - delete test customer
        console.log("\n🧹 Cleaning up test customer...");

        const deleteResponse = await fetch(
          `${API_BASE_URL}/customers/${customerId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const deleteResult = await deleteResponse.json();

        if (deleteResponse.ok) {
          console.log("✅ DELETE /api/customers/[id] SUCCESS");
          console.log("   - Test customer cleaned up");
        } else {
          console.error("❌ DELETE /api/customers/[id] FAILED");
          console.error("   - Status:", deleteResponse.status);
          console.error("   - Error:", deleteResult.error);
        }
      }
    } else {
      console.error("❌ POST /api/customers FAILED");
      console.error("   - Status:", postResponse.status);
      console.error("   - Error:", postResult.error);
    }

    console.log("\n🎉 Customer API Fix Test Completed!");
    console.log("\nℹ️ Key improvements made:");
    console.log(
      "   - Removed unnecessary database calls for businessId lookup"
    );
    console.log(
      "   - Use businessId directly from JWT token (already verified)"
    );
    console.log("   - Added proper logging for debugging");
    console.log("   - Consistent Turkish error messages");
  } catch (error) {
    console.error("💥 Test failed with error:", error);
  }
}

// Run the test
testCustomerAPIFix();
