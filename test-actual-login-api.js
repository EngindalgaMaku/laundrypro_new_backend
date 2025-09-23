const { PrismaClient } = require("@prisma/client");

async function testLogin() {
  console.log("🔥 TESTING ACTUAL LOGIN API FOR mackaengin@gmail.com");

  try {
    // Test the login endpoint directly
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "mackaengin@gmail.com",
        password: "test123", // You might need to provide the actual password
      }),
    });

    const responseData = await response.json();

    console.log("📡 LOGIN API Response Status:", response.status);
    console.log(
      "📡 LOGIN API Response Body:",
      JSON.stringify(responseData, null, 2)
    );

    if (!response.ok) {
      console.log("❌ LOGIN FAILED");
      console.log("Error message:", responseData.error);
      console.log("Error code:", responseData.code);
    } else {
      console.log("✅ LOGIN SUCCESSFUL");
      console.log("User ID in response:", responseData.user?.id);
      console.log("Business ID in response:", responseData.user?.business?.id);
      console.log("Token received:", !!responseData.token);
    }
  } catch (error) {
    console.error("❌ Error testing login API:", error);

    // If fetch fails (server not running), test the auth service directly
    console.log(
      "\n🔧 Testing UserDatabaseService.authenticateUser directly..."
    );

    const { UserDatabaseService } = require("./lib/database/users");

    try {
      const user = await UserDatabaseService.authenticateUser(
        "mackaengin@gmail.com",
        "test123"
      );
      console.log("✅ Direct auth service result:");
      console.log("User ID:", user.id);
      console.log("Email:", user.email);
      console.log("Business ID:", user.business?.id);
      console.log("Business Name:", user.business?.name);
      console.log("Full user object:", JSON.stringify(user, null, 2));
    } catch (authError) {
      console.error("❌ Direct auth service error:", authError.message);
    }
  }
}

testLogin();
