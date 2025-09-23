// Test script to verify search functionality works
const API_BASE_URL = "http://localhost:3000/api";

// Mock JWT token - you'll need to replace this with a real one for testing
const TEST_TOKEN = "your-jwt-token-here";

async function testCustomersSearch() {
  console.log("🔍 Testing customers search...");

  try {
    // Test basic customer listing
    const listResponse = await fetch(`${API_BASE_URL}/customers`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (listResponse.ok) {
      const customers = await listResponse.json();
      console.log(`✅ Customer list: Found ${customers.length} customers`);
    } else {
      console.log(`❌ Customer list failed: ${listResponse.status}`);
    }

    // Test customer search with query
    const searchResponse = await fetch(
      `${API_BASE_URL}/customers?search=test&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (searchResponse.ok) {
      const searchResults = await searchResponse.json();
      console.log(
        `✅ Customer search: Found ${searchResults.length} results for "test"`
      );
    } else {
      console.log(`❌ Customer search failed: ${searchResponse.status}`);
    }

    // Test customer stats
    const statsResponse = await fetch(`${API_BASE_URL}/customers/stats`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log(`✅ Customer stats: ${stats.totalCustomers} total customers`);
    } else {
      console.log(`❌ Customer stats failed: ${statsResponse.status}`);
    }
  } catch (error) {
    console.error("❌ Customer search test error:", error.message);
  }
}

async function testOrdersSearch() {
  console.log("🔍 Testing orders search...");

  try {
    // Test basic orders listing
    const listResponse = await fetch(`${API_BASE_URL}/orders?limit=10`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (listResponse.ok) {
      const result = await listResponse.json();
      console.log(`✅ Orders list: Found ${result.orders?.length || 0} orders`);
    } else {
      console.log(`❌ Orders list failed: ${listResponse.status}`);
    }

    // Test orders search with customer name
    const searchResponse = await fetch(
      `${API_BASE_URL}/orders/search?q=test&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (searchResponse.ok) {
      const searchResults = await searchResponse.json();
      console.log(
        `✅ Orders search: Found ${searchResults.length} results for "test"`
      );
    } else {
      console.log(`❌ Orders search failed: ${searchResponse.status}`);
    }

    // Test orders search with customerName parameter (mobile app style)
    const mobileSearchResponse = await fetch(
      `${API_BASE_URL}/orders?customerName=test&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (mobileSearchResponse.ok) {
      const mobileResults = await mobileSearchResponse.json();
      console.log(
        `✅ Orders mobile search: Found ${
          mobileResults.orders?.length || 0
        } results for "test"`
      );
    } else {
      console.log(
        `❌ Orders mobile search failed: ${mobileSearchResponse.status}`
      );
    }
  } catch (error) {
    console.error("❌ Orders search test error:", error.message);
  }
}

async function runTests() {
  console.log("🚀 Starting search functionality tests...\n");

  if (TEST_TOKEN === "your-jwt-token-here") {
    console.log(
      "⚠️  Please update TEST_TOKEN with a real JWT token to run tests"
    );
    console.log(
      "   You can get a token by logging into the app and checking browser dev tools"
    );
    return;
  }

  await testCustomersSearch();
  console.log("");
  await testOrdersSearch();

  console.log("\n✨ Search functionality tests completed!");
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testCustomersSearch, testOrdersSearch, runTests };
